package main

import (
	"fmt"
	"strings"
)

func emitPorts(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	b.WriteString("// Outbound port owned by the application layer.\n")
	fmt.Fprintf(&b, "package repositories\n\nimport (\n\t\"context\"\n\n\tdomain%s \"%s/internal/domain/%s\"\n)\n\n",
		m.Name, m.Service.Module, m.Name)
	fmt.Fprintf(&b, "// %sRepository persists %s aggregates.\n//\n// Regra do guia (P1/P2): interface pequena, orientada ao uso.\ntype %sRepository interface {\n",
		m.Type, m.Type, m.Type)
	if m.HasSave {
		fmt.Fprintf(&b, "\tSave(ctx context.Context, v domain%s.%s) error\n", m.Name, m.Type)
	}
	if m.HasGet {
		fmt.Fprintf(&b, "\tGetByID(ctx context.Context, id string) (domain%s.%s, error)\n", m.Name, m.Type)
	}
	if m.HasList {
		fmt.Fprintf(&b, "\tList(ctx context.Context, limit int, cursor string) ([]domain%s.%s, string, error)\n", m.Name, m.Type)
	}
	b.WriteString("}\n")
	return b.String()
}

func emitAppService(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "// Package %s implements the %s use cases.\n", m.Name, m.Type)
	if m.Description != "" {
		fmt.Fprintf(&b, "//\n// %s\n", m.Description)
	}
	fmt.Fprintf(&b, "package %s\n\n", m.Name)

	var imports []string
	if m.UsesJSON {
		imports = append(imports, `"encoding/json"`)
	}
	if m.UsesTime {
		imports = append(imports, `"time"`)
	}
	imports = append(imports,
		fmt.Sprintf("domain%s \"%s/internal/domain/%s\"", m.Name, m.Service.Module, m.Name),
		fmt.Sprintf("\"%s/internal/ports/clock\"", m.Service.Module),
		fmt.Sprintf("\"%s/internal/ports/id\"", m.Service.Module),
		fmt.Sprintf("\"%s/internal/ports/repositories\"", m.Service.Module),
	)
	b.WriteString("import (\n")
	for _, imp := range imports {
		fmt.Fprintf(&b, "\t%s\n", imp)
	}
	b.WriteString(")\n\n")

	b.WriteString("// Item is the read model returned by the use cases.\ntype Item struct {\n")
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t%s %s\n", f.GoName, f.GoType)
	}
	b.WriteString("}\n\n")

	fmt.Fprintf(&b, "// Service orchestrates the %s use cases.\ntype Service struct {\n\trepo  repositories.%sRepository\n\tclock clock.Clock\n\tids   id.Generator\n}\n\n",
		m.Type, m.Type)
	fmt.Fprintf(&b, "// NewService wires the use case dependencies.\nfunc NewService(repo repositories.%sRepository, clk clock.Clock, ids id.Generator) *Service {\n\treturn &Service{repo: repo, clock: clk, ids: ids}\n}\n\n",
		m.Type)

	fmt.Fprintf(&b, "func itemFrom(v domain%s.%s) Item {\n\treturn Item{\n", m.Name, m.Type)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t\t%s: v.%s(),\n", f.GoName, f.GoName)
	}
	b.WriteString("\t}\n}\n")
	return b.String()
}

func emitAppCreate(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "package %s\n\n", m.Name)

	// CreateInput carrega os tipos dos campos graváveis; só importa "time" /
	// "encoding/json" quando algum deles aparece.
	needsTime, needsJSON := false, false
	for _, f := range m.Writable {
		switch f.GoType {
		case "time.Time", "*time.Time":
			needsTime = true
		case "json.RawMessage":
			needsJSON = true
		}
	}
	var std []string
	if needsJSON {
		std = append(std, `"encoding/json"`)
	}
	if needsTime {
		std = append(std, `"time"`)
	}
	b.WriteString("import (\n")
	for _, imp := range append([]string{`"context"`, `"fmt"`}, std...) {
		fmt.Fprintf(&b, "\t%s\n", imp)
	}
	fmt.Fprintf(&b, "\n\tdomain%s \"%s/internal/domain/%s\"\n)\n\n",
		m.Name, m.Service.Module, m.Name)

	fmt.Fprintf(&b, "// CreateInput is the input of the Create use case.\ntype CreateInput struct {\n")
	for _, f := range m.Writable {
		fmt.Fprintf(&b, "\t%s %s\n", f.GoName, f.GoType)
	}
	b.WriteString("}\n\n")

	fmt.Fprintf(&b, "// Create builds a new %s and persists it.\nfunc (s *Service) Create(ctx context.Context, in CreateInput) (Item, error) {\n", m.Type)
	fmt.Fprintf(&b, "\tv, err := domain%s.New(domain%s.Params{\n", m.Name, m.Name)
	fmt.Fprintf(&b, "\t\t%s: s.ids.New(),\n", m.PK.GoName)
	for _, f := range m.Writable {
		fmt.Fprintf(&b, "\t\t%s: in.%s,\n", f.GoName, f.GoName)
	}
	for _, f := range m.Fields {
		if !f.ServerManaged {
			continue
		}
		fmt.Fprintf(&b, "\t\t%s: s.clock.Now().UTC(),\n", f.GoName)
	}
	b.WriteString("\t})\n\tif err != nil {\n\t\treturn Item{}, err\n\t}\n\n")
	fmt.Fprintf(&b, "\tif err := s.repo.Save(ctx, v); err != nil {\n\t\treturn Item{}, fmt.Errorf(\"save %s: %%w\", err)\n\t}\n\n", m.Name)
	b.WriteString("\treturn itemFrom(v), nil\n}\n")
	return b.String()
}

func emitAppGet(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "package %s\n\nimport \"context\"\n\n", m.Name)
	b.WriteString("// GetInput is the input of the Get use case.\ntype GetInput struct {\n\tID string\n}\n\n")
	fmt.Fprintf(&b, "// Get returns a single %s by identity.\nfunc (s *Service) Get(ctx context.Context, in GetInput) (Item, error) {\n", m.Type)
	b.WriteString("\tv, err := s.repo.GetByID(ctx, in.ID)\n\tif err != nil {\n\t\treturn Item{}, err\n\t}\n\treturn itemFrom(v), nil\n}\n")
	return b.String()
}

func emitAppList(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "package %s\n\nimport \"context\"\n\n", m.Name)
	b.WriteString(`// Pagination defaults. Regra do guia (A2): o caso de uso normaliza a entrada.
const (
	maxPageSize     = 100
	defaultPageSize = 50
)

// ListInput is the input of the List use case.
type ListInput struct {
	Limit  int
	Cursor string
}

// ListOutput is the paginated result.
type ListOutput struct {
	Items      []Item
	NextCursor string
}

`)
	fmt.Fprintf(&b, "// List returns a page of %s aggregates.\nfunc (s *Service) List(ctx context.Context, in ListInput) (ListOutput, error) {\n", m.Type)
	b.WriteString(`	if in.Limit <= 0 || in.Limit > maxPageSize {
		in.Limit = defaultPageSize
	}

	values, next, err := s.repo.List(ctx, in.Limit, in.Cursor)
	if err != nil {
		return ListOutput{}, err
	}

	items := make([]Item, 0, len(values))
	for _, v := range values {
		items = append(items, itemFrom(v))
	}
	return ListOutput{Items: items, NextCursor: next}, nil
}
`)
	return b.String()
}

func emitAppTest(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "package %s_test\n\n", m.Name)

	imports := []string{`"context"`, `"errors"`, `"testing"`, `"time"`}
	if m.UsesJSON {
		imports = append(imports, `"encoding/json"`)
	}
	fmt.Fprintf(&b, "import (\n\t%s\n\n\tapp%s \"%s/internal/application/%s\"\n\tdomain%s \"%s/internal/domain/%s\"\n\t\"%s/internal/ports/repositories\"\n)\n\n",
		strings.Join(imports, "\n\t"), m.Name, m.Service.Module, m.Name, m.Name, m.Service.Module, m.Name, m.Service.Module)

	if m.needsPtrHelper() {
		b.WriteString("func ptr[T any](v T) *T { return &v }\n\n")
	}

	b.WriteString(`// Regra do guia (T2): fakes pequenos, sem mock framework.
`)
	fmt.Fprintf(&b, "type fakeRepository struct {\n\tsaved []domain%s.%s\n\terr   error\n}\n\n", m.Name, m.Type)
	if m.HasSave {
		fmt.Fprintf(&b, "func (f *fakeRepository) Save(_ context.Context, v domain%s.%s) error {\n\tif f.err != nil {\n\t\treturn f.err\n\t}\n\tf.saved = append(f.saved, v)\n\treturn nil\n}\n\n", m.Name, m.Type)
	}
	if m.HasGet {
		fmt.Fprintf(&b, "func (f *fakeRepository) GetByID(_ context.Context, _ string) (domain%s.%s, error) {\n\tif f.err != nil {\n\t\treturn domain%s.%s{}, f.err\n\t}\n\tif len(f.saved) == 0 {\n\t\treturn domain%s.%s{}, repositories.ErrNotFound\n\t}\n\treturn f.saved[len(f.saved)-1], nil\n}\n\n",
			m.Name, m.Type, m.Name, m.Type, m.Name, m.Type)
	}
	if m.HasList {
		fmt.Fprintf(&b, "func (f *fakeRepository) List(_ context.Context, limit int, _ string) ([]domain%s.%s, string, error) {\n\tif f.err != nil {\n\t\treturn nil, \"\", f.err\n\t}\n\tif limit > len(f.saved) {\n\t\tlimit = len(f.saved)\n\t}\n\treturn f.saved[:limit], \"\", nil\n}\n\n", m.Name, m.Type)
	}
	fmt.Fprintf(&b, "var _ repositories.%sRepository = (*fakeRepository)(nil)\n\n", m.Type)

	b.WriteString(`type fixedClock struct{}

func (fixedClock) Now() time.Time { return time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC) }

type fixedIDs struct{}

func (fixedIDs) New() string { return "id-1" }
`)

	if m.HasCreate {
		fmt.Fprintf(&b, "\nfunc TestServiceCreate(t *testing.T) {\n\tt.Parallel()\n\n\trepo := &fakeRepository{}\n\tsvc := app%s.NewService(repo, fixedClock{}, fixedIDs{})\n\n", m.Name)
		fmt.Fprintf(&b, "\titem, err := svc.Create(context.Background(), app%s.CreateInput{\n", m.Name)
		for _, f := range m.Writable {
			fmt.Fprintf(&b, "\t\t%s: %s,\n", f.GoName, sampleValue(f))
		}
		b.WriteString("\t})\n\tif err != nil {\n\t\tt.Fatalf(\"Create() error = %v\", err)\n\t}\n")
		fmt.Fprintf(&b, "\tif item.%s != \"id-1\" {\n\t\tt.Errorf(\"%s = %%q, want id-1\", item.%s)\n\t}\n", m.PK.GoName, m.PK.GoName, m.PK.GoName)
		b.WriteString("\tif len(repo.saved) != 1 {\n\t\tt.Fatalf(\"saved = %d, want 1\", len(repo.saved))\n\t}\n}\n\n")

		b.WriteString("func TestServiceCreateRepositoryFailure(t *testing.T) {\n\tt.Parallel()\n\n")
		b.WriteString("\twantErr := errors.New(\"database unavailable\")\n")
		fmt.Fprintf(&b, "\tsvc := app%s.NewService(&fakeRepository{err: wantErr}, fixedClock{}, fixedIDs{})\n\n", m.Name)
		fmt.Fprintf(&b, "\t_, err := svc.Create(context.Background(), app%s.CreateInput{\n", m.Name)
		for _, f := range m.Writable {
			fmt.Fprintf(&b, "\t\t%s: %s,\n", f.GoName, sampleValue(f))
		}
		b.WriteString("\t})\n")
		b.WriteString("\tif !errors.Is(err, wantErr) {\n\t\tt.Fatalf(\"Create() error = %v, want %v\", err, wantErr)\n\t}\n}\n")
	}

	if !m.HasCreate && m.HasGet {
		fmt.Fprintf(&b, "\nfunc TestServiceGetNotFound(t *testing.T) {\n\tt.Parallel()\n\n\tsvc := app%s.NewService(&fakeRepository{}, fixedClock{}, fixedIDs{})\n\t_, err := svc.Get(context.Background(), app%s.GetInput{ID: \"missing\"})\n\tif !errors.Is(err, repositories.ErrNotFound) {\n\t\tt.Fatalf(\"Get() error = %%v, want %%v\", err, repositories.ErrNotFound)\n\t}\n}\n", m.Name, m.Name)
	}

	return b.String()
}
