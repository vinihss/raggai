package main

import (
	"fmt"
	"strings"
)

func emitHTTPDTO(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	b.WriteString("// Wire contracts for the generated feature.\npackage dto\n\n")

	var imports []string
	if m.UsesJSON {
		imports = append(imports, `"encoding/json"`)
	}
	if m.UsesTime {
		imports = append(imports, `"time"`)
	}
	if len(imports) > 0 {
		fmt.Fprintf(&b, "import (\n\t%s\n)\n\n", strings.Join(imports, "\n\t"))
	}

	if m.HasCreate {
		uc := m.UseCases[indexOf(m, "Create")]
		fmt.Fprintf(&b, "// Create%sRequest is the body of %s %s.\ntype Create%sRequest struct {\n",
			m.Type, uc.HTTP.Method, uc.HTTP.Path, m.Type)
		for _, f := range m.Writable {
			fmt.Fprintf(&b, "\t%s %s `json:%q`\n", f.GoName, f.GoType, f.JSONName)
		}
		b.WriteString("}\n\n")
	}

	fmt.Fprintf(&b, "// %sResponse is the representation returned to clients.\ntype %sResponse struct {\n", m.Type, m.Type)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t%s %s `json:%q`\n", f.GoName, f.GoType, f.JSONName)
	}
	b.WriteString("}\n\n")

	if m.HasList {
		fmt.Fprintf(&b, "// List%ssResponse is the paginated collection.\ntype List%ssResponse struct {\n\tItems []%sResponse `json:\"%s\"`\n\tNextCursor string `json:\"next_cursor,omitempty\"`\n}\n",
			m.Type, m.Type, m.Type, m.Plural)
	}
	return b.String()
}

func emitHTTPHandler(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "// HTTP adapter for the %s feature.\npackage http\n\n", m.Type)

	imports := []string{`"context"`, `"net/http"`}
	if m.HasList {
		imports = append(imports, `"strconv"`)
	}
	fmt.Fprintf(&b, "import (\n\t%s\n\n\t\"%s/internal/adapters/inbound/http/dto\"\n\tapp%s \"%s/internal/application/%s\"\n)\n\n",
		strings.Join(imports, "\n\t"), m.Service.Module, m.Name, m.Service.Module, m.Name)

	fmt.Fprintf(&b, "// %sService is the inbound port consumed by this adapter.\ntype %sService interface {\n", m.Type, m.Type)
	if m.HasCreate {
		fmt.Fprintf(&b, "\tCreate(ctx context.Context, in app%s.CreateInput) (app%s.Item, error)\n", m.Name, m.Name)
	}
	if m.HasGet {
		fmt.Fprintf(&b, "\tGet(ctx context.Context, in app%s.GetInput) (app%s.Item, error)\n", m.Name, m.Name)
	}
	if m.HasList {
		fmt.Fprintf(&b, "\tList(ctx context.Context, in app%s.ListInput) (app%s.ListOutput, error)\n", m.Name, m.Name)
	}
	b.WriteString("}\n\n")

	fmt.Fprintf(&b, "const max%sBodyBytes = 64 << 10\n\n", m.Type)

	fmt.Fprintf(&b, "// Register%s mounts the feature on the versioned API mux.\nfunc Register%s(api *http.ServeMux, svc %sService) {\n\thandler := &%sHandler{svc: svc}\n",
		m.Type, m.Type, m.Type, lowerFirst(m.Type))
	if m.HasCreate {
		fmt.Fprintf(&b, "\tapi.HandleFunc(%q, handler.create)\n", m.UseCases[indexOf(m, "Create")].HTTP.Method+" "+m.UseCases[indexOf(m, "Create")].HTTP.Path)
	}
	if m.HasGet {
		fmt.Fprintf(&b, "\tapi.HandleFunc(%q, handler.get)\n", m.GetUC.HTTP.Method+" "+m.GetUC.HTTP.Path)
	}
	if m.HasList {
		fmt.Fprintf(&b, "\tapi.HandleFunc(%q, handler.list)\n", m.ListUC.HTTP.Method+" "+m.ListUC.HTTP.Path)
	}
	b.WriteString("}\n\n")

	fmt.Fprintf(&b, "type %sHandler struct {\n\tsvc %sService\n}\n\n", lowerFirst(m.Type), m.Type)

	if m.HasCreate {
		uc := m.UseCases[indexOf(m, "Create")]
		fmt.Fprintf(&b, "// create handles %s %s.\nfunc (h *%sHandler) create(w http.ResponseWriter, r *http.Request) {\n",
			uc.HTTP.Method, uc.HTTP.Path, lowerFirst(m.Type))
		fmt.Fprintf(&b, "\tvar req dto.Create%sRequest\n", m.Type)
		fmt.Fprintf(&b, "\tif err := decodeJSON(w, r, &req, max%sBodyBytes); err != nil {\n\t\twriteError(w, r, err)\n\t\treturn\n\t}\n\n", m.Type)
		fmt.Fprintf(&b, "\titem, err := h.svc.Create(r.Context(), app%s.CreateInput{\n", m.Name)
		for _, f := range m.Writable {
			fmt.Fprintf(&b, "\t\t%s: req.%s,\n", f.GoName, f.GoName)
		}
		b.WriteString("\t})\n\tif err != nil {\n\t\twriteError(w, r, err)\n\t\treturn\n\t}\n\n")
		fmt.Fprintf(&b, "\twriteJSON(w, %d, to%sResponse(item))\n}\n\n", uc.HTTP.Status, m.Type)
	}

	if m.HasGet {
		fmt.Fprintf(&b, "// get handles %s %s.\nfunc (h *%sHandler) get(w http.ResponseWriter, r *http.Request) {\n",
			m.GetUC.HTTP.Method, m.GetUC.HTTP.Path, lowerFirst(m.Type))
		b.WriteString("\tid := r.PathValue(\"id\")\n")
		fmt.Fprintf(&b, "\titem, err := h.svc.Get(r.Context(), app%s.GetInput{ID: id})\n", m.Name)
		b.WriteString("\tif err != nil {\n\t\twriteError(w, r, err)\n\t\treturn\n\t}\n\n")
		fmt.Fprintf(&b, "\twriteJSON(w, %d, to%sResponse(item))\n}\n\n", m.GetUC.HTTP.Status, m.Type)
	}

	if m.HasList {
		fmt.Fprintf(&b, "// list handles %s %s.\nfunc (h *%sHandler) list(w http.ResponseWriter, r *http.Request) {\n",
			m.ListUC.HTTP.Method, m.ListUC.HTTP.Path, lowerFirst(m.Type))
		b.WriteString(`	limit := 0
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			writeError(w, r, errInvalidBody)
			return
		}
		limit = parsed
	}

`)
		fmt.Fprintf(&b, "\tout, err := h.svc.List(r.Context(), app%s.ListInput{\n\t\tLimit:  limit,\n\t\tCursor: r.URL.Query().Get(\"cursor\"),\n\t})\n", m.Name)
		b.WriteString("\tif err != nil {\n\t\twriteError(w, r, err)\n\t\treturn\n\t}\n\n")
		fmt.Fprintf(&b, "\tresponse := dto.List%ssResponse{Items: make([]dto.%sResponse, 0, len(out.Items)), NextCursor: out.NextCursor}\n", m.Type, m.Type)
		b.WriteString("\tfor _, item := range out.Items {\n\t\tresponse.Items = append(response.Items, to" + m.Type + "Response(item))\n\t}\n\n")
		fmt.Fprintf(&b, "\twriteJSON(w, %d, response)\n}\n\n", m.ListUC.HTTP.Status)
	}

	fmt.Fprintf(&b, "func to%sResponse(item app%s.Item) dto.%sResponse {\n\treturn dto.%sResponse{\n", m.Type, m.Name, m.Type, m.Type)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t\t%s: item.%s,\n", f.GoName, f.GoName)
	}
	b.WriteString("\t}\n}\n")
	return b.String()
}

func indexOf(m *Model, name string) int {
	for i, uc := range m.UseCases {
		if uc.Name == name {
			return i
		}
	}
	return -1
}

func emitHTTPTest(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	b.WriteString("package http_test\n\n")

	imports := []string{`"bytes"`, `"context"`, `"testing"`, `nethttp "net/http"`, `"net/http/httptest"`}
	if m.HasCreate {
		imports = append(imports, `"encoding/json"`)
	}
	if writableUsesTime(m) {
		imports = append(imports, `"time"`)
	}
	adapterImports := fmt.Sprintf("httpadapter \"%s/internal/adapters/inbound/http\"", m.Service.Module)
	if m.HasCreate {
		adapterImports += fmt.Sprintf("\n\t\"%s/internal/adapters/inbound/http/dto\"", m.Service.Module)
	}
	fmt.Fprintf(&b, "import (\n\t%s\n\n\t%s\n\tapp%s \"%s/internal/application/%s\"\n)\n\n",
		strings.Join(imports, "\n\t"), adapterImports, m.Name, m.Service.Module, m.Name)

	// Nomes únicos por feature: todos os testes HTTP vivem no mesmo pacote.
	stub := lowerFirst(m.Type) + "Stub"
	router := "new" + m.Type + "Router"

	if m.needsPtrHelper() {
		fmt.Fprintf(&b, "func ptr%s[T any](v T) *T { return &v }\n\n", m.Type)
	}

	b.WriteString("// Regra do guia (T3): httptest + fake do caso de uso, sem servidor e sem banco.\n")
	fmt.Fprintf(&b, "type %s struct {\n\titem app%s.Item\n\terr  error\n}\n\n", stub, m.Name)
	if m.HasCreate {
		fmt.Fprintf(&b, "func (f %s) Create(_ context.Context, _ app%s.CreateInput) (app%s.Item, error) {\n\treturn f.item, f.err\n}\n\n", stub, m.Name, m.Name)
	}
	if m.HasGet {
		fmt.Fprintf(&b, "func (f %s) Get(_ context.Context, _ app%s.GetInput) (app%s.Item, error) {\n\treturn f.item, f.err\n}\n\n", stub, m.Name, m.Name)
	}
	if m.HasList {
		fmt.Fprintf(&b, "func (f %s) List(_ context.Context, _ app%s.ListInput) (app%s.ListOutput, error) {\n\tif f.err != nil {\n\t\treturn app%s.ListOutput{}, f.err\n\t}\n\treturn app%s.ListOutput{Items: []app%s.Item{f.item}}, nil\n}\n\n",
			stub, m.Name, m.Name, m.Name, m.Name, m.Name)
	}

	fmt.Fprintf(&b, "func %s(svc httpadapter.%sService) nethttp.Handler {\n\tapi := nethttp.NewServeMux()\n\thttpadapter.Register%s(api, svc)\n\treturn httpadapter.Mount(api, func(context.Context) error { return nil })\n}\n\n",
		router, m.Type, m.Type)

	if m.HasCreate {
		uc := m.UseCases[indexOf(m, "Create")]
		fmt.Fprintf(&b, "func Test%sCreate(t *testing.T) {\n\tt.Parallel()\n\n", m.Type)
		fmt.Fprintf(&b, "\tbody, err := json.Marshal(dto.Create%sRequest{\n", m.Type)
		for _, f := range m.Writable {
			fmt.Fprintf(&b, "\t\t%s: %s,\n", f.GoName, sampleValueFor(f, "ptr"+m.Type))
		}
		b.WriteString("\t})\n\tif err != nil {\n\t\tt.Fatalf(\"marshal body: %v\", err)\n\t}\n\n")
		fmt.Fprintf(&b, "\trouter := %s(%s{})\n", router, stub)
		fmt.Fprintf(&b, "\treq := httptest.NewRequest(%q, \"/api/v1%s\", bytes.NewReader(body))\n", uc.HTTP.Method, uc.HTTP.Path)
		b.WriteString("\trec := httptest.NewRecorder()\n\n\trouter.ServeHTTP(rec, req)\n\n")
		fmt.Fprintf(&b, "\tif rec.Code != %d {\n\t\tt.Fatalf(\"status = %%d, want %d (body=%%s)\", rec.Code, rec.Body.String())\n\t}\n}\n\n", uc.HTTP.Status, uc.HTTP.Status)

		uc = m.UseCases[indexOf(m, "Create")]
		fmt.Fprintf(&b, "func Test%sRejectsMalformedBody(t *testing.T) {\n\tt.Parallel()\n\n", m.Type)
		fmt.Fprintf(&b, "\trouter := %s(%s{})\n", router, stub)
		fmt.Fprintf(&b, "\treq := httptest.NewRequest(nethttp.MethodPost, \"/api/v1%s\", bytes.NewBufferString(\"{\"))\n", uc.HTTP.Path)
		b.WriteString("\trec := httptest.NewRecorder()\n\n\trouter.ServeHTTP(rec, req)\n\n")
		b.WriteString("\tif rec.Code != nethttp.StatusBadRequest {\n\t\tt.Fatalf(\"status = %d, want 400\", rec.Code)\n\t}\n}\n")
	}

	return b.String()
}

// sampleValueFor is sampleValue with a caller-chosen pointer helper name.
func sampleValueFor(f Field, ptrName string) string {
	return strings.ReplaceAll(sampleValue(f), "ptr(", ptrName+"(")
}

// writableUsesTime reports whether a Create body can contain a time literal.
func writableUsesTime(m *Model) bool {
	for _, f := range m.Writable {
		if strings.Contains(f.GoType, "time.") {
			return true
		}
	}
	return false
}
