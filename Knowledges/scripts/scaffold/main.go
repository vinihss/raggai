package main

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "erro: %v\n", err)
		os.Exit(1)
	}
}

func usage(fs *flag.FlagSet) {
	fmt.Fprintf(fs.Output(), `new-feature — gera uma feature completa a partir de um descritor JSON.

Uso:
  new-feature --service DIR --spec FILE [--dry-run] [--force] [--no-verify]

Opções:
  --service DIR   raiz do serviço criado por new-go-service.sh
  --spec FILE     descritor JSON da feature (ver feature.schema.json)
  --dry-run       mostra o plano sem escrever nada
  --force         sobrescreve arquivos existentes que não foram gerados
  --no-verify     pula go build/vet/test e o arch-check

Arquivos gerados levam o cabeçalho "DO NOT EDIT" e podem ser regerados.
Migrations aplicadas nunca são reescritas.
`)
}

func run() error {
	fs := flag.NewFlagSet("new-feature", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	serviceDir := fs.String("service", "", "raiz do serviço")
	specFile := fs.String("spec", "", "descritor JSON da feature")
	dryRun := fs.Bool("dry-run", false, "mostra o plano sem escrever")
	force := fs.Bool("force", false, "sobrescreve arquivos que não foram gerados")
	noVerify := fs.Bool("no-verify", false, "pula build/vet/test/arch-check")
	fs.Usage = func() { usage(fs) }

	if err := fs.Parse(os.Args[1:]); err != nil {
		return err
	}
	if fs.NArg() > 0 {
		return fmt.Errorf("argumento inesperado: %s", fs.Arg(0))
	}
	if *serviceDir == "" || *specFile == "" {
		usage(fs)
		return errors.New("--service e --spec são obrigatórios")
	}

	root, err := filepath.Abs(*serviceDir)
	if err != nil {
		return err
	}
	if _, err := os.Stat(filepath.Join(root, ".scaffold", "service.json")); err != nil {
		return fmt.Errorf("%s não parece um serviço gerado (falta .scaffold/service.json)", root)
	}

	service, err := loadService(root)
	if err != nil {
		return err
	}

	rawSpec, err := os.ReadFile(*specFile)
	if err != nil {
		return err
	}
	spec, err := loadSpec(*specFile)
	if err != nil {
		return err
	}
	model, err := buildModel(spec, service)
	if err != nil {
		return err
	}
	if err := checkConflicts(root, model); err != nil {
		return err
	}

	state, err := loadFeatureState(root, model.Name)
	if err != nil {
		return err
	}

	migration := state.Migration
	if model.HasPostgres {
		if migration == "" {
			version, err := nextMigrationVersion(filepath.Join(root, "migrations"))
			if err != nil {
				return err
			}
			migration = migrationName(version, model.Table)
		}
	}

	outputs, err := buildOutputs(model, migration)
	if err != nil {
		return err
	}

	// O registry precisa enxergar todas as features, inclusive a nova.
	models, err := loadAllModels(root, service)
	if err != nil {
		return err
	}
	models = replaceModel(models, model)
	outputs = append(outputs, output{
		path: "internal/infrastructure/app/features_gen.go",
		body: mustFormat("internal/infrastructure/app/features_gen.go", emitFeatureRegistry(models, model.Ping)),
	})

	fmt.Fprintf(os.Stdout, "feature: %s (%s)\nserviço: %s\nmodo: %s\n\n", model.Name, model.Type, service.Name, service.Mode)

	written, err := writeOutputs(root, outputs, *force, *dryRun, os.Stdout)
	if err != nil {
		return err
	}

	if *dryRun {
		fmt.Fprintln(os.Stdout, "\n(dry-run: nada foi escrito)")
		return nil
	}

	if err := saveSpecCopy(root, model.Name, rawSpec); err != nil {
		return err
	}
	state.SpecSHA = sha256Hex(rawSpec)
	state.Files = written
	if model.HasPostgres {
		state.Migration = migration
	}
	if err := saveFeatureState(root, model.Name, state); err != nil {
		return err
	}

	if *noVerify {
		return nil
	}
	return verify(root, service.Mode)
}

// checkConflicts rejects names and routes that would silently clash.
func checkConflicts(root string, model *Model) error {
	if model.Name == "ping" {
		return errors.New("o nome 'ping' é reservado para a feature de exemplo do scaffold")
	}

	service, err := loadService(root)
	if err != nil {
		return err
	}
	others, err := loadAllModels(root, service)
	if err != nil {
		return err
	}

	for _, other := range others {
		if other.Name == model.Name {
			continue
		}
		if other.Route == model.Route {
			return fmt.Errorf("rota %q já é usada pela feature %s", model.Route, other.Name)
		}
		for _, uc := range model.UseCases {
			for _, otherUC := range other.UseCases {
				if uc.HTTP != nil && otherUC.HTTP != nil &&
					uc.HTTP.Method == otherUC.HTTP.Method && uc.HTTP.Path == otherUC.HTTP.Path {
					return fmt.Errorf("rota %s %s já é usada pela feature %s", uc.HTTP.Method, uc.HTTP.Path, other.Name)
				}
			}
		}
	}
	return nil
}

// loadAllModels reads every saved descriptor. Broken descriptors are skipped
// with a warning so one bad file cannot block regeneration of the others.
func loadAllModels(root string, service ServiceInfo) ([]*Model, error) {
	pattern := filepath.Join(root, ".scaffold", "features", "*.json")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, err
	}

	var models []*Model
	for _, file := range files {
		if strings.HasSuffix(file, ".state.json") {
			continue
		}
		spec, err := loadSpec(file)
		if err != nil {
			fmt.Fprintf(os.Stderr, "aviso: ignorando %s: %v\n", filepath.Base(file), err)
			continue
		}
		model, err := buildModel(spec, service)
		if err != nil {
			fmt.Fprintf(os.Stderr, "aviso: ignorando %s: %v\n", filepath.Base(file), err)
			continue
		}
		models = append(models, model)
	}
	sort.Slice(models, func(i, j int) bool { return models[i].Name < models[j].Name })
	return models, nil
}

func replaceModel(models []*Model, model *Model) []*Model {
	out := make([]*Model, 0, len(models)+1)
	replaced := false
	for _, candidate := range models {
		if candidate.Name == model.Name {
			out = append(out, model)
			replaced = true
			continue
		}
		out = append(out, candidate)
	}
	if !replaced {
		out = append(out, model)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}

func mustFormat(path, body string) string {
	formatted, err := formatGo(path, body)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	return formatted
}

// buildOutputs is the single place that maps a model to files on disk.
func buildOutputs(m *Model, migration string) ([]output, error) {
	var outs []output

	add := func(path, body string, skipIfExists bool) error {
		if strings.HasSuffix(path, ".go") {
			formatted, err := formatGo(path, body)
			if err != nil {
				return err
			}
			body = formatted
		}
		outs = append(outs, output{path: path, body: body, skipIfExists: skipIfExists})
		return nil
	}

	domainDir := "internal/domain/" + m.Name
	appDir := "internal/application/" + m.Name
	httpDir := "internal/adapters/inbound/http"

	if err := add(domainDir+"/"+m.Name+".go", emitDomain(m), false); err != nil {
		return nil, err
	}
	if enabled(m.Tests.Domain) {
		if err := add(domainDir+"/"+m.Name+"_test.go", emitDomainTest(m), false); err != nil {
			return nil, err
		}
	}
	if err := add("internal/ports/repositories/"+m.Name+".go", emitPorts(m), false); err != nil {
		return nil, err
	}
	if err := add(appDir+"/service.go", emitAppService(m), false); err != nil {
		return nil, err
	}
	if m.HasCreate {
		if err := add(appDir+"/create.go", emitAppCreate(m), false); err != nil {
			return nil, err
		}
	}
	if m.HasGet {
		if err := add(appDir+"/get.go", emitAppGet(m), false); err != nil {
			return nil, err
		}
	}
	if m.HasList {
		if err := add(appDir+"/list.go", emitAppList(m), false); err != nil {
			return nil, err
		}
	}
	if enabled(m.Tests.Application) {
		if err := add(appDir+"/service_test.go", emitAppTest(m), false); err != nil {
			return nil, err
		}
	}

	if err := add(httpDir+"/dto/"+m.Name+".go", emitHTTPDTO(m), false); err != nil {
		return nil, err
	}
	if err := add(httpDir+"/"+m.Name+".go", emitHTTPHandler(m), false); err != nil {
		return nil, err
	}
	if enabled(m.Tests.HTTP) {
		if err := add(httpDir+"/"+m.Name+"_test.go", emitHTTPTest(m), false); err != nil {
			return nil, err
		}
	}

	if m.HasMemory {
		if err := add("internal/adapters/outbound/memory/"+m.Name+".go", emitMemory(m), false); err != nil {
			return nil, err
		}
	}
	if m.HasPostgres {
		if err := add("internal/adapters/outbound/postgres/"+m.Name+".go", emitPostgres(m), false); err != nil {
			return nil, err
		}
		if err := add("migrations/"+migration, emitMigration(m, migration), true); err != nil {
			return nil, err
		}
		if enabled(m.Tests.Integration) {
			if body := emitIntegrationTest(m); body != "" {
				if err := add("tests/integration/"+m.Name+"_test.go", body, false); err != nil {
					return nil, err
				}
			}
		}
	}

	if err := add("internal/infrastructure/app/"+m.Name+"_gen.go", emitFeatureWiring(m), false); err != nil {
		return nil, err
	}

	return outs, nil
}

// verify runs the same gates as new-go-service.sh, scoped to this service.
func verify(root, mode string) error {
	steps := [][]string{
		{"build", "./..."},
		{"vet", "./..."},
		{"test", "./..."},
	}

	for _, step := range steps {
		fmt.Fprintf(os.Stdout, "\n$ go %s\n", strings.Join(step, " "))
		if err := runGo(root, step...); err != nil {
			return err
		}
	}

	if mode == "full" {
		fmt.Fprintln(os.Stdout, "\n$ go vet -tags=integration ./tests/...")
		if err := runGo(root, "vet", "-tags=integration", "./tests/..."); err != nil {
			return err
		}
	}

	return archCheck(root)
}

func runGo(dir string, args ...string) error {
	cmd := exec.Command("go", args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("go %s falhou: %w", strings.Join(args, " "), err)
	}
	return nil
}

// archCheck enforces the dependency rules that are cheap to test mechanically.
func archCheck(root string) error {
	service, err := loadService(root)
	if err != nil {
		return err
	}
	module := service.Module

	type rule struct {
		pkg     string
		forbid  func(dep string) bool
		message string
	}

	rules := []rule{
		{
			pkg: "internal/domain",
			forbid: func(dep string) bool {
				return strings.HasPrefix(dep, module+"/internal/") && !strings.HasPrefix(dep, module+"/internal/domain/")
			},
			message: "domain importa outro pacote interno",
		},
		{
			pkg: "internal/application",
			forbid: func(dep string) bool {
				return strings.HasPrefix(dep, module+"/internal/adapters") ||
					strings.HasPrefix(dep, module+"/internal/infrastructure")
			},
			message: "application importa adapters/infrastructure",
		},
		{
			pkg: "internal/ports",
			forbid: func(dep string) bool {
				for _, layer := range []string{"application", "adapters", "infrastructure"} {
					if strings.HasPrefix(dep, module+"/internal/"+layer) {
						return true
					}
				}
				return false
			},
			message: "ports importam camadas externas",
		},
	}

	for _, r := range rules {
		if _, err := os.Stat(filepath.Join(root, filepath.FromSlash(r.pkg))); err != nil {
			continue
		}

		cmd := exec.Command("go", "list", "-deps", "./"+r.pkg+"/...")
		cmd.Dir = root
		out, err := cmd.Output()
		if err != nil {
			return fmt.Errorf("go list %s: %w", r.pkg, err)
		}
		for _, dep := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			if r.forbid(dep) {
				return fmt.Errorf("%s: %s (%s)", r.message, dep, r.pkg)
			}
		}
	}

	fmt.Fprintln(os.Stdout, "architecture OK")
	return nil
}
