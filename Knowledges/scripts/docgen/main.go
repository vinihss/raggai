package main

import (
	"bytes"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "erro: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	fs := flag.NewFlagSet("docgen", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	serviceDir := fs.String("service", "", "raiz do serviço")
	templates := fs.String("templates", "", "diretório de docs curados (.md.tmpl)")
	dryRun := fs.Bool("dry-run", false, "mostra o plano sem escrever")

	fs.Usage = func() {
		fmt.Fprintf(fs.Output(), `docgen — gera e valida a documentação de um serviço.

Uso:
  docgen --service DIR [--templates DIR] [--dry-run]

Docs gerados (sobrescritos): README, estrutura, dominio, api, dados,
configuracao e features/*.md.
Docs curados (copiados só se ausentes): visao-geral, arquitetura, operacao,
testes, decisoes.

Sempre valida links relativos depois de escrever (regra DOC4).
`)
	}

	if err := fs.Parse(os.Args[1:]); err != nil {
		return err
	}
	if *serviceDir == "" {
		fs.Usage()
		return fmt.Errorf("--service é obrigatório")
	}

	root, err := filepath.Abs(*serviceDir)
	if err != nil {
		return err
	}

	service, err := loadService(root)
	if err != nil {
		return err
	}
	features, err := loadFeatures(root)
	if err != nil {
		return err
	}
	migrations, err := loadMigrations(root)
	if err != nil {
		return err
	}

	curated := curatedSet(root, *templates)
	r := renderer{service: service, features: features, migrations: migrations, curated: curated}

	generated := map[string]string{
		"README.md":       r.hub(),
		"estrutura.md":    r.estrutura(),
		"dominio.md":      r.dominio(),
		"api.md":          r.api(),
		"dados.md":        r.dados(),
		"configuracao.md": r.configuracao(),
	}
	for _, feature := range features {
		generated[filepath.Join("features", feature.Feature.Name+".md")] = r.feature(feature)
	}

	docsDir := filepath.Join(root, "docs")
	for _, name := range sortedNames(generated) {
		target := filepath.Join(docsDir, name)
		if err := writeGenerated(root, target, generated[name], *dryRun); err != nil {
			return err
		}
	}

	if *templates != "" {
		if err := copyCurated(root, *templates, service, *dryRun); err != nil {
			return err
		}
	}

	if *dryRun {
		fmt.Fprintln(os.Stdout, "\n(dry-run: nada foi escrito)")
		return nil
	}

	if err := checkLinks(docsDir); err != nil {
		return err
	}
	fmt.Fprintln(os.Stdout, "documentação OK")
	return nil
}

func sortedNames(m map[string]string) []string {
	names := make([]string, 0, len(m))
	for name := range m {
		names = append(names, name)
	}
	for i := 1; i < len(names); i++ {
		for j := i; j > 0 && names[j] < names[j-1]; j-- {
			names[j], names[j-1] = names[j-1], names[j]
		}
	}
	return names
}

// writeGenerated overwrites only files this tool owns.
func writeGenerated(root, target, body string, dryRun bool) error {
	rel, err := filepath.Rel(root, target)
	if err != nil {
		return err
	}
	rel = filepath.ToSlash(rel)

	existing, readErr := os.ReadFile(target)
	if readErr == nil && string(existing) == body {
		fmt.Fprintf(os.Stdout, "  same    %s\n", rel)
		return nil
	}
	if readErr == nil && !bytes.Contains(existing, []byte(generatedMarker)) && !bytes.Contains(existing, []byte(legacyMarker)) {
		return fmt.Errorf("%s existe sem o cabeçalho gerado; mova o conteúdo para um doc curado", rel)
	}

	if dryRun {
		fmt.Fprintf(os.Stdout, "  generate %s\n", rel)
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(target, []byte(body), 0o644); err != nil {
		return err
	}
	fmt.Fprintf(os.Stdout, "  write   %s\n", rel)
	return nil
}

// copyCurated seeds curated docs once. They are never overwritten (DOC3).
func copyCurated(root, templates string, service ServiceInfo, dryRun bool) error {
	entries, err := filepath.Glob(filepath.Join(templates, "*.md.tmpl"))
	if err != nil {
		return err
	}
	if len(entries) == 0 {
		return nil
	}

	replacements := strings.NewReplacer(
		"__SERVICE__", service.Name,
		"__MODULE__", service.Module,
		"__MODE__", service.Mode,
		"__GO_VERSION__", service.GoVersion,
	)

	for _, source := range entries {
		name := strings.TrimSuffix(filepath.Base(source), ".tmpl")
		target := filepath.Join(root, "docs", name)
		rel := filepath.Join("docs", name)

		if _, err := os.Stat(target); err == nil {
			fmt.Fprintf(os.Stdout, "  keep    %s (curado)\n", rel)
			continue
		}

		raw, err := os.ReadFile(source)
		if err != nil {
			return err
		}
		body := replacements.Replace(string(raw))

		if dryRun {
			fmt.Fprintf(os.Stdout, "  seed    %s\n", rel)
			continue
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(target, []byte(body), 0o644); err != nil {
			return err
		}
		fmt.Fprintf(os.Stdout, "  seed    %s\n", rel)
	}
	return nil
}

var linkPattern = regexp.MustCompile(`\[[^\]]*\]\(([^)\s]+)\)`)

// checkLinks fails on broken relative links, which is how DOC4 stays honest.
func checkLinks(docsDir string) error {
	var failures []string

	err := filepath.Walk(docsDir, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() || !strings.HasSuffix(path, ".md") {
			return nil
		}
		raw, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, match := range linkPattern.FindAllStringSubmatch(string(raw), -1) {
			target := match[1]
			switch {
			case strings.HasPrefix(target, "http://"),
				strings.HasPrefix(target, "https://"),
				strings.HasPrefix(target, "mailto:"),
				strings.HasPrefix(target, "#"):
				continue
			}
			if index := strings.IndexByte(target, '#'); index >= 0 {
				target = target[:index]
			}
			if target == "" {
				continue
			}
			resolved := filepath.Join(filepath.Dir(path), filepath.FromSlash(target))
			if _, err := os.Stat(resolved); err != nil {
				rel, _ := filepath.Rel(docsDir, path)
				failures = append(failures, fmt.Sprintf("%s -> %s", filepath.ToSlash(rel), target))
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	if len(failures) > 0 {
		return fmt.Errorf("links quebrados:\n  %s", strings.Join(failures, "\n  "))
	}
	return nil
}

// curatedSet reports which curated docs are already present or will be seeded
// from the templates directory.
func curatedSet(root, templates string) map[string]bool {
	set := map[string]bool{}
	for _, name := range []string{
		"visao-geral.md",
		"arquitetura.md",
		"operacao.md",
		"testes.md",
		"decisoes.md",
	} {
		if _, err := os.Stat(filepath.Join(root, "docs", name)); err == nil {
			set[name] = true
			continue
		}
		if templates != "" {
			if _, err := os.Stat(filepath.Join(templates, name+".tmpl")); err == nil {
				set[name] = true
			}
		}
	}
	return set
}
