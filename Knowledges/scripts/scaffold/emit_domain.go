package main

import (
	"fmt"
	"strings"
)

type errVar struct {
	Name      string
	Message   string
	FieldName string
}

func fieldErrors(f Field) []errVar {
	var out []errVar
	if f.ServerManaged {
		return nil
	}

	if emitsRequiredError(f) {
		out = append(out, errVar{"Err" + f.GoName, f.Name + " is required", f.Name})
	}
	if f.MaxLen != nil {
		out = append(out, errVar{
			Name:      "Err" + f.GoName + "TooLong",
			Message:   fmt.Sprintf("%s exceeds %d characters", f.Name, *f.MaxLen),
			FieldName: f.Name,
		})
	}
	if len(f.Enum) > 0 {
		out = append(out, errVar{"Err" + f.GoName + "Invalid", f.Name + " has an invalid value", f.Name})
	}
	if f.Min != nil {
		out = append(out, errVar{
			Name:      "Err" + f.GoName + "Min",
			Message:   fmt.Sprintf("%s must be >= %s", f.Name, trimFloat(*f.Min)),
			FieldName: f.Name,
		})
	}
	if f.Max != nil {
		out = append(out, errVar{
			Name:      "Err" + f.GoName + "Max",
			Message:   fmt.Sprintf("%s must be <= %s", f.Name, trimFloat(*f.Max)),
			FieldName: f.Name,
		})
	}
	return out
}

func emitDomain(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "// Package %s contains the %s aggregate and its invariants.\n", m.Name, m.Type)
	if m.Description != "" {
		fmt.Fprintf(&b, "//\n// %s\n", m.Description)
	}
	fmt.Fprintf(&b, "package %s\n\n", m.Name)

	var imports []string
	if m.UsesJSON {
		imports = append(imports, `"encoding/json"`)
	}
	if m.UsesStrings {
		imports = append(imports, `"strings"`)
	}
	if m.UsesTime {
		imports = append(imports, `"time"`)
	}
	if len(imports) > 0 {
		fmt.Fprintf(&b, "import (\n\t%s\n)\n\n", strings.Join(imports, "\n\t"))
	}

	b.WriteString(`// ValidationError describes a violated invariant without leaking transport
// details. A borda HTTP reconhece o formato por FieldName/FieldMessage.
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string { return e.Message }

// FieldName returns the offending field.
func (e ValidationError) FieldName() string { return e.Field }

// FieldMessage returns the public message for the client.
func (e ValidationError) FieldMessage() string { return e.Message }

`)

	var allErrors []errVar
	for _, f := range m.Fields {
		allErrors = append(allErrors, fieldErrors(f)...)
	}
	if len(allErrors) > 0 {
		b.WriteString("var (\n")
		for _, e := range allErrors {
			fmt.Fprintf(&b, "\t// %s is returned when %s is invalid.\n", e.Name, e.FieldName)
			fmt.Fprintf(&b, "\t%s = ValidationError{Field: %q, Message: %q}\n", e.Name, e.FieldName, e.Message)
		}
		b.WriteString(")\n\n")
	}

	var limits []Field
	for _, f := range m.Fields {
		if f.MaxLen != nil {
			limits = append(limits, f)
		}
	}
	if len(limits) > 0 {
		b.WriteString("const (\n")
		for _, f := range limits {
			fmt.Fprintf(&b, "\tmax%s = %d\n", f.GoName, *f.MaxLen)
		}
		b.WriteString(")\n\n")
	}

	fmt.Fprintf(&b, "// %s is the aggregate root.\n//\n// Campos são privados: só New/Rehydrate produzem um valor válido.\ntype %s struct {\n", m.Type, m.Type)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t%s %s\n", lowerFirst(f.GoName), f.GoType)
	}
	b.WriteString("}\n\n")

	b.WriteString("// Params carries every field needed to build or rebuild the aggregate.\ntype Params struct {\n")
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t%s %s\n", f.GoName, f.GoType)
	}
	b.WriteString("}\n\n")

	fmt.Fprintf(&b, "// New validates the invariants and builds a valid %s.\nfunc New(p Params) (%s, error) {\n", m.Type, m.Type)
	var normalize []string
	for _, f := range m.Fields {
		normalize = append(normalize, f.Normalize...)
	}
	for _, line := range normalize {
		fmt.Fprintf(&b, "\t%s\n", line)
	}
	if len(normalize) > 0 {
		b.WriteString("\n")
	}
	for _, f := range m.Fields {
		for _, line := range f.Checks {
			fmt.Fprintf(&b, "\t%s\n", line)
		}
	}
	fmt.Fprintf(&b, "\n\treturn %s{\n", m.Type)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t\t%s: p.%s,\n", lowerFirst(f.GoName), f.GoName)
	}
	b.WriteString("\t}, nil\n}\n\n")

	fmt.Fprintf(&b, "// Rehydrate rebuilds an aggregate from trusted storage without revalidating.\n// Use only in outbound adapters that already persisted the invariants.\nfunc Rehydrate(p Params) %s {\n\treturn %s{\n", m.Type, m.Type)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t\t%s: p.%s,\n", lowerFirst(f.GoName), f.GoName)
	}
	b.WriteString("\t}\n}\n\n")

	for _, f := range m.Fields {
		fmt.Fprintf(&b, "// %s returns the %s.\nfunc (v %s) %s() %s { return v.%s }\n\n",
			f.GoName, f.Name, m.Type, f.GoName, f.GoType, lowerFirst(f.GoName))
	}

	return strings.TrimRight(b.String(), "\n") + "\n"
}

func emitDomainTest(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	fmt.Fprintf(&b, "package %s_test\n\n", m.Name)

	imports := []string{`"errors"`, `"testing"`}
	if needsStringsInTest(m) {
		imports = append(imports, `"strings"`)
	}
	if m.UsesJSON {
		imports = append(imports, `"encoding/json"`)
	}
	if m.UsesTime {
		imports = append(imports, `"time"`)
	}
	fmt.Fprintf(&b, "import (\n\t%s\n\n\t\"%s/internal/domain/%s\"\n)\n\n",
		strings.Join(imports, "\n\t"), m.Service.Module, m.Name)

	if m.needsPtrHelper() {
		b.WriteString("func ptr[T any](v T) *T { return &v }\n\n")
	}

	b.WriteString("// Regra do guia (T1): table-driven, sem I/O, sem relógio real.\n")
	fmt.Fprintf(&b, "func TestNew%s(t *testing.T) {\n\tt.Parallel()\n\n", m.Type)
	b.WriteString("\tvalid := validParams()\n\n")
	fmt.Fprintf(&b, "\tgot, err := %s.New(valid)\n\tif err != nil {\n\t\tt.Fatalf(\"New() error = %%v\", err)\n\t}\n", m.Name)
	fmt.Fprintf(&b, "\tif got.%s() != valid.%s {\n\t\tt.Errorf(\"%s() = %%v, want %%v\", got.%s(), valid.%s)\n\t}\n\n",
		m.PK.GoName, m.PK.GoName, m.PK.GoName, m.PK.GoName, m.PK.GoName)

	fmt.Fprintf(&b, "\ttests := []struct {\n\t\tname    string\n\t\tmutate  func(*%s.Params)\n\t\twantErr error\n\t}{\n", m.Name)
	for _, f := range m.Fields {
		for _, e := range fieldErrors(f) {
			switch {
			case e.Name == "Err"+f.GoName:
				fmt.Fprintf(&b, "\t\t{name: %q, mutate: func(p *%s.Params) { p.%s = %s }, wantErr: %s.%s},\n",
					"rejects "+f.Name, m.Name, f.GoName, f.ZeroValue, m.Name, e.Name)
			case strings.HasSuffix(e.Name, "TooLong"):
				fmt.Fprintf(&b, "\t\t{name: %q, mutate: func(p *%s.Params) { p.%s = %s },\n\t\t\twantErr: %s.%s},\n",
					"rejects long "+f.Name, m.Name, f.GoName, longValue(f), m.Name, e.Name)
			case strings.HasSuffix(e.Name, "Invalid"):
				fmt.Fprintf(&b, "\t\t{name: %q, mutate: func(p *%s.Params) { p.%s = %s }, wantErr: %s.%s},\n",
					"rejects invalid "+f.Name, m.Name, f.GoName, invalidValue(f), m.Name, e.Name)
			case strings.HasSuffix(e.Name, "Min"):
				fmt.Fprintf(&b, "\t\t{name: %q, mutate: func(p *%s.Params) { p.%s = %s }, wantErr: %s.%s},\n",
					"rejects below min "+f.Name, m.Name, f.GoName, minValue(f), m.Name, e.Name)
			case strings.HasSuffix(e.Name, "Max"):
				fmt.Fprintf(&b, "\t\t{name: %q, mutate: func(p *%s.Params) { p.%s = %s }, wantErr: %s.%s},\n",
					"rejects above max "+f.Name, m.Name, f.GoName, maxValue(f), m.Name, e.Name)
			}
		}
	}
	b.WriteString("\t}\n\n\tfor _, tt := range tests {\n\t\tt.Run(tt.name, func(t *testing.T) {\n\t\t\tt.Parallel()\n\n")
	b.WriteString("\t\t\tparams := validParams()\n\t\t\ttt.mutate(&params)\n")
	fmt.Fprintf(&b, "\t\t\tif _, err := %s.New(params); !errors.Is(err, tt.wantErr) {\n", m.Name)
	b.WriteString("\t\t\t\tt.Fatalf(\"New() error = %v, want %v\", err, tt.wantErr)\n\t\t\t}\n\t\t})\n\t}\n}\n\n")

	fmt.Fprintf(&b, "func validParams() %s.Params {\n\treturn %s.Params{\n", m.Name, m.Name)
	for _, f := range m.Fields {
		fmt.Fprintf(&b, "\t\t%s: %s,\n", f.GoName, sampleValue(f))
	}
	b.WriteString("\t}\n}\n")

	return b.String()
}

func (m *Model) needsPtrHelper() bool {
	for _, f := range m.Fields {
		if strings.HasPrefix(f.GoType, "*") {
			return true
		}
	}
	return false
}

func needsStringsInTest(m *Model) bool {
	for _, f := range m.Fields {
		if f.MaxLen != nil {
			return true
		}
	}
	return false
}

func sampleValue(f Field) string {
	if f.GoDefault != "" {
		return f.GoDefault
	}
	switch f.GoType {
	case "string":
		return `"` + f.Name + `-sample"`
	case "*string":
		return `ptr("` + f.Name + `-sample")`
	case "int64":
		if f.Min != nil {
			return trimFloat(*f.Min)
		}
		return "1"
	case "*int64":
		return "ptr(int64(1))"
	case "bool":
		return "true"
	case "*bool":
		return "ptr(true)"
	case "time.Time":
		return "time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC)"
	case "*time.Time":
		return "ptr(time.Date(2026, 10, 30, 12, 0, 0, 0, time.UTC))"
	case "json.RawMessage":
		return `json.RawMessage(` + "`{}`" + `)`
	default:
		return f.ZeroValue
	}
}

func longValue(f Field) string {
	expr := `strings.Repeat("a", ` + fmt.Sprintf("%d", *f.MaxLen+1) + `)`
	if f.GoType == "*string" {
		return "ptr(" + expr + ")"
	}
	return expr
}

func invalidValue(f Field) string {
	if f.GoType == "*string" {
		return `ptr("not-allowed")`
	}
	return `"not-allowed"`
}

func minValue(f Field) string {
	if f.GoType == "*int64" {
		return "ptr(" + trimFloat(*f.Min-1) + ")"
	}
	return trimFloat(*f.Min - 1)
}

func maxValue(f Field) string {
	if f.GoType == "*int64" {
		return "ptr(" + trimFloat(*f.Max+1) + ")"
	}
	return trimFloat(*f.Max + 1)
}

// hasRequiredCheck reports whether zero/empty values can be rejected at all.
// int64 e bool aceitam zero por definição; "obrigatório" neles é só NOT NULL.
func hasRequiredCheck(f Field) bool {
	if f.ServerManaged {
		return false
	}
	switch f.GoType {
	case "string", "*string", "time.Time", "*time.Time", "json.RawMessage":
		return f.Required
	}
	return false
}

// emitsRequiredError avoids referencing an error var that is not generated:
// um campo com default nunca falha por ausência, porque o default o preenche.
func emitsRequiredError(f Field) bool {
	return hasRequiredCheck(f) && f.GoDefault == ""
}
