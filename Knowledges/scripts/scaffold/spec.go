package main

import (
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strings"
)

// Spec is the feature descriptor read by new-feature.sh.
type Spec struct {
	Version  int         `json:"version"`
	Feature  FeatureSpec `json:"feature"`
	Fields   []FieldSpec `json:"fields"`
	UseCases []UseCase   `json:"use_cases"`
	Adapters Adapters    `json:"adapters"`
	Tests    *Tests      `json:"tests"`
}

type FeatureSpec struct {
	Name        string `json:"name"`
	Aggregate   string `json:"aggregate"`
	Plural      string `json:"plural"`
	Table       string `json:"table"`
	Route       string `json:"route"`
	Description string `json:"description"`
}

type FieldSpec struct {
	Name      string   `json:"name"`
	Type      string   `json:"type"`
	Required  bool     `json:"required"`
	Nullable  bool     `json:"nullable"`
	PK        bool     `json:"pk"`
	Immutable bool     `json:"immutable"`
	Unique    bool     `json:"unique"`
	Sensitive bool     `json:"sensitive"`
	Min       *float64 `json:"min"`
	Max       *float64 `json:"max"`
	MaxLen    *int     `json:"max_len"`
	Enum      []string `json:"enum"`
	Default   any      `json:"default"`
}

type UseCase struct {
	Name        string    `json:"name"`
	HTTP        *HTTPInfo `json:"http"`
	Pagination  string    `json:"pagination"`
	Idempotency string    `json:"idempotency"`
}

type HTTPInfo struct {
	Method string `json:"method"`
	Path   string `json:"path"`
	Status int    `json:"status"`
}

type Adapters struct {
	Memory   bool `json:"memory"`
	Postgres bool `json:"postgres"`
}

type Tests struct {
	Domain      *bool `json:"domain"`
	Application *bool `json:"application"`
	HTTP        *bool `json:"http"`
	Integration *bool `json:"integration"`
}

type ServiceInfo struct {
	Name      string `json:"name"`
	Module    string `json:"module"`
	GoVersion string `json:"go_version"`
	Mode      string `json:"mode"`
}

// Field is the derived, code-generation view of a FieldSpec.
type Field struct {
	FieldSpec
	GoName     string
	GoType     string
	JSONName   string
	DDLType    string
	SQLDefault string
	GoDefault  string
	ZeroValue  string
	Normalize  []string
	Checks     []string
	ErrPrefix  string
	// ServerManaged marks created_at/updated_at: preenchidos pelo caso de uso
	// com o Clock, nunca aceitos do cliente.
	ServerManaged bool
}

// Model is the single source consumed by every emitter.
type Model struct {
	Service     ServiceInfo
	Name        string
	Type        string
	Plural      string
	Table       string
	Route       string
	Description string

	Fields   []Field
	NonPK    []Field
	Writable []Field
	PK       Field

	UseCases  []UseCase
	HasCreate bool
	GetUC     *UseCase
	ListUC    *UseCase
	HasGet    bool
	HasList   bool
	HasSave   bool

	HasMemory   bool
	HasPostgres bool

	UsesTime    bool
	UsesJSON    bool
	UsesStrings bool
	UsesContext bool

	Tests Tests
	Ping  bool
}

var (
	namePattern      = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)
	aggregatePattern = regexp.MustCompile(`^[A-Z][A-Za-z0-9]*$`)
	modulePattern    = regexp.MustCompile(`^[A-Za-z0-9._~/-]+$`)
)

func loadService(dir string) (ServiceInfo, error) {
	var info ServiceInfo
	raw, err := os.ReadFile(dir + "/.scaffold/service.json")
	if err != nil {
		return info, fmt.Errorf("leia .scaffold/service.json (rode new-go-service.sh antes): %w", err)
	}
	if err := json.Unmarshal(raw, &info); err != nil {
		return info, fmt.Errorf("service.json inválido: %w", err)
	}
	if !modulePattern.MatchString(info.Module) {
		return info, fmt.Errorf("module inválido em service.json: %q", info.Module)
	}
	return info, nil
}

func loadSpec(path string) (Spec, error) {
	var spec Spec
	raw, err := os.ReadFile(path)
	if err != nil {
		return spec, err
	}
	decoder := json.NewDecoder(strings.NewReader(string(raw)))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&spec); err != nil {
		return spec, fmt.Errorf("spec inválida: %w", err)
	}
	return spec, nil
}

func buildModel(spec Spec, service ServiceInfo) (*Model, error) {
	if spec.Version != 1 {
		return nil, fmt.Errorf("version deve ser 1, veio %d", spec.Version)
	}
	if !namePattern.MatchString(spec.Feature.Name) {
		return nil, fmt.Errorf("feature.name %q inválido: use snake_case minúsculo", spec.Feature.Name)
	}
	if !aggregatePattern.MatchString(spec.Feature.Aggregate) {
		return nil, fmt.Errorf("feature.aggregate %q inválido: use PascalCase", spec.Feature.Aggregate)
	}
	if spec.Feature.Plural == "" {
		spec.Feature.Plural = spec.Feature.Name + "s"
	}
	if !namePattern.MatchString(spec.Feature.Plural) {
		return nil, fmt.Errorf("feature.plural %q inválido", spec.Feature.Plural)
	}
	if spec.Feature.Table == "" {
		spec.Feature.Table = spec.Feature.Plural
	}
	if !namePattern.MatchString(spec.Feature.Table) {
		return nil, fmt.Errorf("feature.table %q inválido: use snake_case", spec.Feature.Table)
	}
	if !strings.HasPrefix(spec.Feature.Route, "/") {
		return nil, fmt.Errorf("feature.route deve começar com '/'")
	}
	if spec.Feature.Route != "/" && strings.HasSuffix(spec.Feature.Route, "/") {
		return nil, fmt.Errorf("feature.route não pode terminar com '/'")
	}
	if len(spec.Fields) == 0 {
		return nil, fmt.Errorf("fields: informe ao menos um campo")
	}

	m := &Model{
		Service:     service,
		Name:        spec.Feature.Name,
		Type:        spec.Feature.Aggregate,
		Plural:      spec.Feature.Plural,
		Table:       spec.Feature.Table,
		Route:       spec.Feature.Route,
		Description: spec.Feature.Description,
		UseCases:    spec.UseCases,
		HasMemory:   spec.Adapters.Memory,
		HasPostgres: spec.Adapters.Postgres,
		Ping:        service.Mode != "minimal",
		Tests:       defaultTests(spec.Tests),
	}

	if !m.HasMemory && !m.HasPostgres {
		return nil, fmt.Errorf("adapters: habilite memory e/ou postgres")
	}
	if m.HasPostgres && service.Mode != "full" {
		return nil, fmt.Errorf("postgres exige serviço no modo full (atual: %s)", service.Mode)
	}

	pkCount := 0
	seen := map[string]bool{}
	for _, fs := range spec.Fields {
		if !namePattern.MatchString(fs.Name) {
			return nil, fmt.Errorf("campo %q inválido: use snake_case", fs.Name)
		}
		if seen[fs.Name] {
			return nil, fmt.Errorf("campo duplicado: %s", fs.Name)
		}
		seen[fs.Name] = true
		switch fs.Type {
		case "string", "int64", "bool", "time", "json":
		default:
			return nil, fmt.Errorf("campo %s: tipo %q não suportado (string, int64, bool, time, json)", fs.Name, fs.Type)
		}
		if len(fs.Enum) > 0 && fs.Type != "string" {
			return nil, fmt.Errorf("campo %s: enum só é suportado em string", fs.Name)
		}
		if fs.PK {
			pkCount++
			if fs.Type != "string" {
				return nil, fmt.Errorf("campo %s: pk deve ser string", fs.Name)
			}
		}
		if fs.Min != nil && fs.Type != "int64" {
			return nil, fmt.Errorf("campo %s: min só é suportado em int64", fs.Name)
		}
		if fs.Max != nil && fs.Type != "int64" {
			return nil, fmt.Errorf("campo %s: max só é suportado em int64", fs.Name)
		}
	}
	if pkCount != 1 {
		return nil, fmt.Errorf("fields: exatamente um campo deve ter pk=true (encontrados %d)", pkCount)
	}

	if len(spec.UseCases) == 0 {
		return nil, fmt.Errorf("use_cases: informe ao menos um caso de uso")
	}
	ucNames := map[string]bool{}
	for i := range spec.UseCases {
		uc := &spec.UseCases[i]
		if ucNames[uc.Name] {
			return nil, fmt.Errorf("caso de uso duplicado: %s", uc.Name)
		}
		ucNames[uc.Name] = true

		switch uc.Name {
		case "Create":
			m.HasCreate = true
			m.HasSave = true
			if uc.HTTP == nil {
				uc.HTTP = &HTTPInfo{Method: "POST", Path: m.Route, Status: 201}
			}
			if uc.HTTP.Status == 0 {
				uc.HTTP.Status = 201
			}
		case "Get":
			m.HasGet = true
			m.GetUC = uc
			if uc.HTTP == nil {
				uc.HTTP = &HTTPInfo{Method: "GET", Path: m.Route + "/{id}", Status: 200}
			}
			if !strings.Contains(uc.HTTP.Path, "{id}") {
				return nil, fmt.Errorf("use case Get: http.path deve conter {id}")
			}
			if uc.HTTP.Status == 0 {
				uc.HTTP.Status = 200
			}
		case "List":
			m.HasList = true
			m.ListUC = uc
			if uc.HTTP == nil {
				uc.HTTP = &HTTPInfo{Method: "GET", Path: m.Route, Status: 200}
			}
			if uc.HTTP.Status == 0 {
				uc.HTTP.Status = 200
			}
		default:
			return nil, fmt.Errorf("caso de uso %q não suportado: use Create, Get ou List", uc.Name)
		}
		if uc.HTTP.Method == "" {
			return nil, fmt.Errorf("use case %s: http.method é obrigatório", uc.Name)
		}
		if uc.HTTP.Path == "" || !strings.HasPrefix(uc.HTTP.Path, "/") {
			return nil, fmt.Errorf("use case %s: http.path deve começar com '/'", uc.Name)
		}
		if strings.HasPrefix(uc.HTTP.Path, "/api/") {
			return nil, fmt.Errorf("use case %s: http.path não deve incluir o prefixo versionado (o Mount já aplica /api/v1)", uc.Name)
		}

		switch uc.Idempotency {
		case "", "none", "recommended":
		case "required":
			return nil, fmt.Errorf("use case %s: idempotency \"required\" exige persistir a chave de idempotência (tabela própria); o gerador não cobre esse caso", uc.Name)
		default:
			return nil, fmt.Errorf("use case %s: idempotency %q inválido (use none ou recommended)", uc.Name, uc.Idempotency)
		}

		switch uc.Pagination {
		case "", "cursor":
		default:
			return nil, fmt.Errorf("use case %s: pagination %q não suportado (use cursor)", uc.Name, uc.Pagination)
		}
	}

	if m.HasPostgres && m.Table == "" {
		return nil, fmt.Errorf("postgres exige feature.table")
	}

	for i := range spec.Fields {
		field := deriveField(spec.Fields[i], m)
		field.ServerManaged = field.Name == "created_at" || field.Name == "updated_at"
		m.Fields = append(m.Fields, field)
		if field.PK {
			m.PK = field
		} else {
			m.NonPK = append(m.NonPK, field)
			if !field.ServerManaged {
				m.Writable = append(m.Writable, field)
			}
		}
		if strings.Contains(field.GoType, "time.") {
			m.UsesTime = true
		}
		if strings.Contains(field.GoType, "json.") {
			m.UsesJSON = true
		}
		if field.GoType == "string" || field.GoType == "*string" {
			if field.Required {
				m.UsesStrings = true
			}
		}
	}
	m.UsesContext = true

	for i := range m.Fields {
		normalize, checks := validationFor(m.Fields[i], m.Type)
		m.Fields[i].Normalize = normalize
		m.Fields[i].Checks = checks
	}
	// Espelha os snippets nos slices derivados (mesmos índices não garantidos).
	for i := range m.NonPK {
		normalize, checks := validationFor(m.NonPK[i], m.Type)
		m.NonPK[i].Normalize = normalize
		m.NonPK[i].Checks = checks
	}
	for i := range m.Writable {
		normalize, checks := validationFor(m.Writable[i], m.Type)
		m.Writable[i].Normalize = normalize
		m.Writable[i].Checks = checks
	}
	for i := range m.Fields {
		if m.Fields[i].PK {
			m.PK = m.Fields[i]
		}
	}

	return m, nil
}

func defaultTests(t *Tests) Tests {
	out := Tests{ptr(true), ptr(true), ptr(true), ptr(false)}
	if t == nil {
		return out
	}
	if t.Domain != nil {
		out.Domain = t.Domain
	}
	if t.Application != nil {
		out.Application = t.Application
	}
	if t.HTTP != nil {
		out.HTTP = t.HTTP
	}
	if t.Integration != nil {
		out.Integration = t.Integration
	}
	return out
}

func ptr[T any](v T) *T { return &v }

func enabled(b *bool) bool { return b != nil && *b }

var acronyms = map[string]string{
	"id": "ID", "url": "URL", "http": "HTTP", "json": "JSON",
	"api": "API", "sql": "SQL", "uuid": "UUID", "ip": "IP", "html": "HTML",
}

func goName(snake string) string {
	parts := strings.FieldsFunc(snake, func(r rune) bool { return r == '_' || r == '-' })
	for i, part := range parts {
		if upper, ok := acronyms[strings.ToLower(part)]; ok {
			parts[i] = upper
			continue
		}
		parts[i] = strings.ToUpper(part[:1]) + part[1:]
	}
	return strings.Join(parts, "")
}

func lowerFirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToLower(s[:1]) + s[1:]
}

func deriveField(fs FieldSpec, m *Model) Field {
	f := Field{FieldSpec: fs}
	f.GoName = goName(fs.Name)
	f.JSONName = fs.Name
	f.ErrPrefix = "Err" + f.GoName

	base := fs.Type
	nullable := fs.Nullable
	switch fs.Type {
	case "string":
		base = "string"
		if nullable {
			base = "*string"
		}
		f.DDLType = "text"
	case "int64":
		base = "int64"
		if nullable {
			base = "*int64"
		}
		f.DDLType = "bigint"
	case "bool":
		base = "bool"
		if nullable {
			base = "*bool"
		}
		f.DDLType = "boolean"
	case "time":
		base = "time.Time"
		if nullable {
			base = "*time.Time"
		}
		f.DDLType = "timestamptz"
	case "json":
		base = "json.RawMessage"
		f.DDLType = "jsonb"
	}
	f.GoType = base

	switch {
	case fs.Type == "string":
		f.ZeroValue = `""`
	case fs.Type == "int64":
		f.ZeroValue = "0"
	case fs.Type == "bool":
		f.ZeroValue = "false"
	case fs.Type == "time":
		f.ZeroValue = "time.Time{}"
	default:
		f.ZeroValue = "nil"
	}

	if fs.Default != nil {
		switch v := fs.Default.(type) {
		case string:
			f.GoDefault = fmt.Sprintf("%q", v)
			f.SQLDefault = "'" + strings.ReplaceAll(v, "'", "''") + "'"
		case float64:
			f.GoDefault = trimFloat(v)
			f.SQLDefault = trimFloat(v)
		case bool:
			f.GoDefault = fmt.Sprintf("%t", v)
			f.SQLDefault = fmt.Sprintf("%t", v)
		}
	}
	return f
}

func trimFloat(v float64) string {
	if v == float64(int64(v)) {
		return fmt.Sprintf("%d", int64(v))
	}
	return fmt.Sprintf("%v", v)
}

func validationFor(f Field, typeName string) (normalize, checks []string) {
	v := "p." + f.GoName

	switch f.GoType {
	case "string":
		if emitsRequiredError(f) {
			normalize = append(normalize, v+" = strings.TrimSpace("+v+")")
			checks = append(checks, fmt.Sprintf("if %s == \"\" {", v))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %s", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
		if f.MaxLen != nil {
			checks = append(checks, fmt.Sprintf("if len([]rune(%s)) > max%s {", v, f.GoName))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %sTooLong", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
		if len(f.Enum) > 0 {
			checks = append(checks, fmt.Sprintf("switch %s {", v))
			checks = append(checks, "\tcase "+quoteList(f.Enum)+":")
			checks = append(checks, "\tdefault:")
			checks = append(checks, fmt.Sprintf("\t\treturn %s{}, %sInvalid", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
	case "*string":
		if emitsRequiredError(f) {
			checks = append(checks, fmt.Sprintf("if %s == nil || strings.TrimSpace(*%s) == \"\" {", v, v))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %s", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
		if f.MaxLen != nil {
			checks = append(checks, fmt.Sprintf("if %s != nil && len([]rune(*%s)) > max%s {", v, v, f.GoName))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %sTooLong", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
		if len(f.Enum) > 0 {
			checks = append(checks, fmt.Sprintf("if %s != nil {", v))
			checks = append(checks, fmt.Sprintf("\tswitch *%s {", v))
			checks = append(checks, "\tcase "+quoteList(f.Enum)+":")
			checks = append(checks, "\tdefault:")
			checks = append(checks, fmt.Sprintf("\t\treturn %s{}, %sInvalid", typeName, f.ErrPrefix))
			checks = append(checks, "\t}")
			checks = append(checks, "}")
		}
	case "int64":
		if f.Min != nil {
			checks = append(checks, fmt.Sprintf("if %s < %s {", v, trimFloat(*f.Min)))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %sMin", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
		if f.Max != nil {
			checks = append(checks, fmt.Sprintf("if %s > %s {", v, trimFloat(*f.Max)))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %sMax", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
	case "*int64":
		if f.Min != nil {
			checks = append(checks, fmt.Sprintf("if %s != nil && *%s < %s {", v, v, trimFloat(*f.Min)))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %sMin", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
		if f.Max != nil {
			checks = append(checks, fmt.Sprintf("if %s != nil && *%s > %s {", v, v, trimFloat(*f.Max)))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %sMax", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
	case "time.Time":
		// Só rejeita zero quando o campo é obrigatório; um time opcional usa
		// o zero value. E o erro só existe se fieldErrors o declarar.
		if emitsRequiredError(f) {
			checks = append(checks, fmt.Sprintf("if %s.IsZero() {", v))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %s", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
	case "*time.Time":
		if emitsRequiredError(f) {
			checks = append(checks, fmt.Sprintf("if %s == nil {", v))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %s", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
	case "json.RawMessage":
		if emitsRequiredError(f) {
			checks = append(checks, fmt.Sprintf("if len(%s) == 0 {", v))
			checks = append(checks, fmt.Sprintf("\treturn %s{}, %s", typeName, f.ErrPrefix))
			checks = append(checks, "}")
		}
	}

	if f.GoDefault != "" {
		checks = append([]string{
			fmt.Sprintf("if %s == %s {", v, f.ZeroValue),
			fmt.Sprintf("\t%s = %s", v, f.GoDefault),
			"}",
		}, checks...)
	}
	return normalize, checks
}

func quoteList(values []string) string {
	quoted := make([]string, len(values))
	for i, v := range values {
		quoted[i] = fmt.Sprintf("%q", v)
	}
	return strings.Join(quoted, ", ")
}

// sqlColumn renders one DDL column definition.
func sqlColumn(f Field) string {
	var b strings.Builder
	b.WriteString(f.Name)
	b.WriteString(" ")
	b.WriteString(f.DDLType)
	if f.PK {
		b.WriteString(" PRIMARY KEY")
		return b.String()
	}
	if !f.Nullable {
		b.WriteString(" NOT NULL")
	}
	if f.Unique {
		b.WriteString(" UNIQUE")
	}
	if f.SQLDefault != "" {
		b.WriteString(" DEFAULT ")
		b.WriteString(f.SQLDefault)
	}
	for _, check := range sqlChecks(f) {
		b.WriteString(" CHECK (")
		b.WriteString(check)
		b.WriteString(")")
	}
	return b.String()
}

func sqlChecks(f Field) []string {
	var out []string
	if f.MaxLen != nil {
		out = append(out, fmt.Sprintf("char_length(%s) <= %d", f.Name, *f.MaxLen))
	}
	if f.Min != nil {
		out = append(out, fmt.Sprintf("%s >= %s", f.Name, trimFloat(*f.Min)))
	}
	if f.Max != nil {
		out = append(out, fmt.Sprintf("%s <= %s", f.Name, trimFloat(*f.Max)))
	}
	if len(f.Enum) > 0 {
		out = append(out, fmt.Sprintf("%s IN (%s)", f.Name, f.SQLDefaultList()))
	}
	return out
}

// SQLDefaultList is a helper on Field for enum CHECK clauses.
func (f Field) SQLDefaultList() string {
	quoted := make([]string, len(f.Enum))
	for i, v := range f.Enum {
		quoted[i] = "'" + strings.ReplaceAll(v, "'", "''") + "'"
	}
	return strings.Join(quoted, ", ")
}
