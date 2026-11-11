package main

import (
	"fmt"
	"strings"
)

func emitMemory(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	b.WriteString("// In-memory adapter used by tests and local development.\npackage memory\n\n")
	fmt.Fprintf(&b, "import (\n\t\"context\"\n\t\"sort\"\n\t\"sync\"\n\n\tdomain%s \"%s/internal/domain/%s\"\n\t\"%s/internal/ports/repositories\"\n)\n\n",
		m.Name, m.Service.Module, m.Name, m.Service.Module)

	fmt.Fprintf(&b, "// %sRepository keeps aggregates in memory. Safe for concurrent use.\ntype %sRepository struct {\n\tmu    sync.RWMutex\n\titems map[string]domain%s.%s\n}\n\n",
		m.Type, m.Type, m.Name, m.Type)
	fmt.Fprintf(&b, "var _ repositories.%sRepository = (*%sRepository)(nil)\n\n", m.Type, m.Type)
	fmt.Fprintf(&b, "// New%sRepository builds an empty repository.\nfunc New%sRepository() *%sRepository {\n\treturn &%sRepository{items: make(map[string]domain%s.%s)}\n}\n\n",
		m.Type, m.Type, m.Type, m.Type, m.Name, m.Type)

	if m.HasSave {
		fmt.Fprintf(&b, "// Save stores the aggregate by identity.\nfunc (r *%sRepository) Save(_ context.Context, v domain%s.%s) error {\n\tr.mu.Lock()\n\tdefer r.mu.Unlock()\n\n\tr.items[v.%s()] = v\n\treturn nil\n}\n\n",
			m.Type, m.Name, m.Type, m.PK.GoName)
	}
	if m.HasGet {
		fmt.Fprintf(&b, "// GetByID returns the aggregate or repositories.ErrNotFound.\nfunc (r *%sRepository) GetByID(_ context.Context, id string) (domain%s.%s, error) {\n\tr.mu.RLock()\n\tdefer r.mu.RUnlock()\n\n\tv, ok := r.items[id]\n\tif !ok {\n\t\treturn domain%s.%s{}, repositories.ErrNotFound\n\t}\n\treturn v, nil\n}\n\n",
			m.Type, m.Name, m.Type, m.Name, m.Type)
	}
	if m.HasList {
		fmt.Fprintf(&b, "// List returns a page ordered by identity and the next cursor.\nfunc (r *%sRepository) List(_ context.Context, limit int, cursor string) ([]domain%s.%s, string, error) {\n\tr.mu.RLock()\n\tdefer r.mu.RUnlock()\n\n\tids := make([]string, 0, len(r.items))\n\tfor id := range r.items {\n\t\tids = append(ids, id)\n\t}\n\tsort.Strings(ids)\n\n\tstart := sort.SearchStrings(ids, cursor)\n\tif start < len(ids) && ids[start] == cursor {\n\t\tstart++\n\t}\n\tend := start + limit\n\tif end > len(ids) {\n\t\tend = len(ids)\n\t}\n\n\titems := make([]domain%s.%s, 0, end-start)\n\tfor _, id := range ids[start:end] {\n\t\titems = append(items, r.items[id])\n\t}\n\n\tnext := \"\"\n\tif end < len(ids) {\n\t\tnext = ids[end-1]\n\t}\n\treturn items, next, nil\n}\n",
			m.Type, m.Name, m.Type, m.Name, m.Type)
	}
	return b.String()
}

func emitPostgres(m *Model) string {
	var b strings.Builder
	headerComment(&b, m)
	b.WriteString("// Postgres adapter for the generated feature.\npackage postgres\n\n")

	var imports []string
	imports = append(imports, `"context"`, `"fmt"`)
	if m.HasGet {
		imports = append(imports, `"errors"`)
	}
	if m.UsesTime {
		imports = append(imports, `"time"`)
	}
	if m.UsesJSON {
		imports = append(imports, `"encoding/json"`)
	}
	b.WriteString("import (\n")
	for _, imp := range imports {
		fmt.Fprintf(&b, "\t%s\n", imp)
	}
	b.WriteString("\n\t\"github.com/jackc/pgx/v5/pgxpool\"\n")
	if m.HasGet {
		b.WriteString("\t\"github.com/jackc/pgx/v5\"\n")
	}
	fmt.Fprintf(&b, "\n\tdomain%s \"%s/internal/domain/%s\"\n\t\"%s/internal/ports/repositories\"\n)\n\n",
		m.Name, m.Service.Module, m.Name, m.Service.Module)

	columns := make([]string, len(m.Fields))
	for i, f := range m.Fields {
		columns[i] = f.Name
	}
	columnList := strings.Join(columns, ", ")

	if m.HasSave {
		placeholders := make([]string, len(m.Fields))
		for i := range m.Fields {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
		}
		fmt.Fprintf(&b, "const insert%sQuery = `INSERT INTO %s (%s) VALUES (%s)`\n\n",
			m.Type, m.Table, columnList, strings.Join(placeholders, ", "))
	}
	if m.HasGet {
		fmt.Fprintf(&b, "const get%sQuery = `SELECT %s FROM %s WHERE %s = $1`\n\n",
			m.Type, columnList, m.Table, m.PK.Name)
	}
	if m.HasList {
		fmt.Fprintf(&b, "const list%sQuery = `SELECT %s FROM %s WHERE ($1 = '' OR %s > $1) ORDER BY %s LIMIT $2`\n\n",
			m.Type, columnList, m.Table, m.PK.Name, m.PK.Name)
	}

	fmt.Fprintf(&b, "// %sRepository persists aggregates in Postgres.\ntype %sRepository struct {\n\tpool *pgxpool.Pool\n}\n\n",
		m.Type, m.Type)
	fmt.Fprintf(&b, "var _ repositories.%sRepository = (*%sRepository)(nil)\n\n", m.Type, m.Type)
	fmt.Fprintf(&b, "// New%sRepository builds a repository over the shared pool.\nfunc New%sRepository(pool *pgxpool.Pool) *%sRepository {\n\treturn &%sRepository{pool: pool}\n}\n\n",
		m.Type, m.Type, m.Type, m.Type)

	if m.HasSave {
		args := make([]string, len(m.Fields))
		for i, f := range m.Fields {
			args[i] = "v." + f.GoName + "()"
		}
		fmt.Fprintf(&b, "// Save inserts the aggregate.\nfunc (r *%sRepository) Save(ctx context.Context, v domain%s.%s) error {\n", m.Type, m.Name, m.Type)
		fmt.Fprintf(&b, "\tif _, err := querier(ctx, r.pool).Exec(ctx, insert%sQuery, %s); err != nil {\n", m.Type, strings.Join(args, ", "))
		b.WriteString("\t\treturn fmt.Errorf(\"insert " + m.Name + ": %w\", err)\n\t}\n\treturn nil\n}\n\n")
	}
	if m.HasGet {
		b.WriteString(scanBlock(m, "get"+m.Type+"Query", "v.pool", true))
	}
	if m.HasList {
		b.WriteString(scanListBlock(m))
	}
	return b.String()
}

func scanDecls(m *Model) (decls []string, assignments []string) {
	for _, f := range m.Fields {
		var goType string
		switch f.GoType {
		case "json.RawMessage":
			goType = "[]byte"
		default:
			goType = f.GoType
		}
		decls = append(decls, fmt.Sprintf("\t\tc%s %s", f.GoName, goType))
		if f.GoType == "json.RawMessage" {
			assignments = append(assignments, fmt.Sprintf("\t\t\t%s: json.RawMessage(c%s),", f.GoName, f.GoName))
			continue
		}
		assignments = append(assignments, fmt.Sprintf("\t\t\t%s: c%s,", f.GoName, f.GoName))
	}
	return decls, assignments
}

func scanTargets(m *Model) string {
	targets := make([]string, len(m.Fields))
	for i, f := range m.Fields {
		targets[i] = "&c" + f.GoName
	}
	return strings.Join(targets, ", ")
}

func scanBlock(m *Model, query, poolExpr string, single bool) string {
	var b strings.Builder
	decls, assignments := scanDecls(m)
	fmt.Fprintf(&b, "// GetByID returns the aggregate or repositories.ErrNotFound.\nfunc (r *%sRepository) GetByID(ctx context.Context, id string) (domain%s.%s, error) {\n", m.Type, m.Name, m.Type)
	b.WriteString("\tvar (\n")
	for _, d := range decls {
		b.WriteString(d + "\n")
	}
	b.WriteString("\t)\n\n")
	fmt.Fprintf(&b, "\terr := querier(ctx, r.pool).QueryRow(ctx, %s, id).Scan(%s)\n", query, scanTargets(m))
	b.WriteString("\tswitch {\n\tcase errors.Is(err, pgx.ErrNoRows):\n")
	fmt.Fprintf(&b, "\t\treturn domain%s.%s{}, repositories.ErrNotFound\n", m.Name, m.Type)
	b.WriteString("\tcase err != nil:\n")
	fmt.Fprintf(&b, "\t\treturn domain%s.%s{}, fmt.Errorf(\"select %s: %%w\", err)\n\t}\n\n", m.Name, m.Type, m.Name)
	fmt.Fprintf(&b, "\treturn domain%s.Rehydrate(domain%s.Params{\n", m.Name, m.Name)
	for _, a := range assignments {
		b.WriteString(a + "\n")
	}
	b.WriteString("\t}), nil\n}\n\n")
	_ = poolExpr
	return b.String()
}

func scanListBlock(m *Model) string {
	var b strings.Builder
	decls, assignments := scanDecls(m)
	fmt.Fprintf(&b, "// List returns a page ordered by identity and the next cursor.\nfunc (r *%sRepository) List(ctx context.Context, limit int, cursor string) ([]domain%s.%s, string, error) {\n",
		m.Type, m.Name, m.Type)
	fmt.Fprintf(&b, "\trows, err := querier(ctx, r.pool).Query(ctx, list%sQuery, cursor, limit)\n", m.Type)
	b.WriteString("\tif err != nil {\n")
	fmt.Fprintf(&b, "\t\treturn nil, \"\", fmt.Errorf(\"list %s: %%w\", err)\n\t}\n\tdefer rows.Close()\n\n", m.Name)
	fmt.Fprintf(&b, "\titems := make([]domain%s.%s, 0, limit)\n\tfor rows.Next() {\n", m.Name, m.Type)
	b.WriteString("\t\tvar (\n")
	for _, d := range decls {
		b.WriteString("\t" + d + "\n")
	}
	b.WriteString("\t\t)\n")
	fmt.Fprintf(&b, "\t\tif err := rows.Scan(%s); err != nil {\n", scanTargets(m))
	b.WriteString("\t\t\treturn nil, \"\", fmt.Errorf(\"scan " + m.Name + ": %w\", err)\n\t\t}\n")
	fmt.Fprintf(&b, "\t\titems = append(items, domain%s.Rehydrate(domain%s.Params{\n", m.Name, m.Name)
	for _, a := range assignments {
		b.WriteString("\t" + a + "\n")
	}
	b.WriteString("\t\t}))\n\t}\n")
	b.WriteString("\tif err := rows.Err(); err != nil {\n")
	fmt.Fprintf(&b, "\t\treturn nil, \"\", fmt.Errorf(\"iterate %s: %%w\", err)\n\t}\n\n", m.Name)
	b.WriteString("\tnext := \"\"\n")
	fmt.Fprintf(&b, "\tif len(items) == limit && len(items) > 0 {\n\t\tnext = items[len(items)-1].%s()\n\t}\n", m.PK.GoName)
	b.WriteString("\treturn items, next, nil\n}\n")
	return b.String()
}

func emitMigration(m *Model, name string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "-- %s from .scaffold/features/%s.json; DO NOT EDIT.\n", generatedMarker, m.Name)
	b.WriteString("-- Forward-only migration. Nunca edite uma migration aplicada; crie a proxima.\n")
	fmt.Fprintf(&b, "CREATE TABLE IF NOT EXISTS %s (\n", m.Table)
	for i, f := range m.Fields {
		comma := ","
		if i == len(m.Fields)-1 {
			comma = ""
		}
		fmt.Fprintf(&b, "    %s%s\n", sqlColumn(f), comma)
	}
	b.WriteString(");\n")
	_ = name
	return b.String()
}

// emitIntegrationTest exercises the Postgres adapter against a real database.
func emitIntegrationTest(m *Model) string {
	if !m.HasSave || !m.HasGet {
		return ""
	}

	var b strings.Builder
	headerComment(&b, m)
	b.WriteString("//go:build integration\n\npackage integration_test\n\n")
	b.WriteString("import (\n\t\"context\"\n")
	if m.UsesJSON {
		b.WriteString("\t\"encoding/json\"\n")
	}
	b.WriteString("\t\"os\"\n\t\"testing\"\n\t\"time\"\n\n")
	b.WriteString("\t\"github.com/jackc/pgx/v5/pgxpool\"\n\n")
	fmt.Fprintf(&b, "\t\"%s/internal/adapters/outbound/postgres\"\n", m.Service.Module)
	fmt.Fprintf(&b, "\tdomain%s \"%s/internal/domain/%s\"\n)\n\n", m.Name, m.Service.Module, m.Name)

	needsPtr := false
	for _, f := range m.Fields {
		if strings.Contains(sampleValue(f), "ptr(") {
			needsPtr = true
			break
		}
	}
	if needsPtr {
		b.WriteString("func ptr[T any](v T) *T { return &v }\n\n")
	}

	b.WriteString("// Regra do guia (T4): Postgres real, sem mock de banco.\n")
	b.WriteString("// Rode com: DATABASE_URL=... go test -tags=integration ./tests/...\n")
	fmt.Fprintf(&b, "func Test%sRepositoryRoundTrip(t *testing.T) {\n", m.Type)
	b.WriteString("\tdsn := os.Getenv(\"DATABASE_URL\")\n\tif dsn == \"\" {\n\t\tt.Skip(\"DATABASE_URL is required for integration tests\")\n\t}\n\n")
	b.WriteString("\tctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)\n\tdefer cancel()\n\n")
	b.WriteString("\tpool, err := pgxpool.New(ctx, dsn)\n\tif err != nil {\n\t\tt.Fatalf(\"connect: %v\", err)\n\t}\n\tdefer pool.Close()\n\n")
	// Rodar o teste duas vezes no mesmo banco não pode falhar por PK duplicada.
	fmt.Fprintf(&b, "\tif _, err := pool.Exec(ctx, `DELETE FROM %s WHERE %s = $1`, \"id-integration-%s\"); err != nil {\n\t\tt.Fatalf(\"cleanup: %%v\", err)\n\t}\n\n",
		m.Table, m.PK.Name, m.Name)
	fmt.Fprintf(&b, "\trepo := postgres.New%sRepository(pool)\n", m.Type)
	fmt.Fprintf(&b, "\taggregate, err := domain%s.New(domain%s.Params{\n", m.Name, m.Name)
	for _, f := range m.Fields {
		if f.PK {
			fmt.Fprintf(&b, "\t\t%s: \"id-integration-%s\",\n", f.GoName, m.Name)
			continue
		}
		fmt.Fprintf(&b, "\t\t%s: %s,\n", f.GoName, sampleValue(f))
	}
	b.WriteString("\t})\n\tif err != nil {\n\t\tt.Fatalf(\"build aggregate: %v\", err)\n\t}\n\n")
	b.WriteString("\tif err := repo.Save(ctx, aggregate); err != nil {\n\t\tt.Fatalf(\"save: %v\", err)\n\t}\n\n")
	fmt.Fprintf(&b, "\tgot, err := repo.GetByID(ctx, aggregate.%s())\n", m.PK.GoName)
	b.WriteString("\tif err != nil {\n\t\tt.Fatalf(\"get: %v\", err)\n\t}\n")
	fmt.Fprintf(&b, "\tif got.%s() != aggregate.%s() {\n\t\tt.Fatalf(\"%s = %%v, want %%v\", got.%s(), aggregate.%s())\n\t}\n}\n",
		m.PK.GoName, m.PK.GoName, m.PK.GoName, m.PK.GoName, m.PK.GoName)
	return b.String()
}
