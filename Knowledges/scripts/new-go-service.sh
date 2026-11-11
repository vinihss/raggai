#!/usr/bin/env bash
#
# new-go-service.sh — cria a estrutura inicial de um serviço Go seguindo
# Clean Architecture + Arquitetura Hexagonal (ver guia-go-clean-hexagonal.md).
#
# Uso:
#   new-go-service.sh <service-name> <module-path> [opções]
#
# Exemplos:
#   ./new-go-service.sh task-service github.com/acme/platform/services/task-service
#   ./new-go-service.sh billing github.com/acme/billing --dir services/billing
#   ./new-go-service.sh api github.com/acme/api --mode minimal
#
# Opções:
#   --dir DIR       destino (default ./<service-name>)
#   --mode MODE     minimal | example (default) | full
#   --force         sobrescreve diretório não vazio
#   --no-verify     pula go mod tidy/build/vet/test/arch-check
#   --dry-run       mostra o plano sem escrever nada
#   --list-templates lista os templates do modo
#   -h, --help      mostra esta ajuda
#
# O destino padrão é ./<service-name>. O script recusa sobrescrever diretório
# não vazio sem --force.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly TEMPLATE_DIR="${SCRIPT_DIR}/templates/go-service"
readonly MANIFEST="${TEMPLATE_DIR}/template.manifest.tsv"

service=""
module=""
destination=""
mode="example"
force=0
verify=1
dry_run=0
list_templates=0

usage() {
	sed -n '2,28p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

fail() {
	printf 'erro: %s\n' "$*" >&2
	exit 1
}

mode_matches() {
	local row_mode="$1" selected="$2"

	case "$row_mode" in
	all) [[ "$selected" == "minimal" || "$selected" == "example" || "$selected" == "full" ]] ;;
	minimal) [[ "$selected" == "minimal" ]] ;;
	not-minimal) [[ "$selected" == "example" || "$selected" == "full" ]] ;;
	example) [[ "$selected" == "example" ]] ;;
	not-full) [[ "$selected" == "minimal" || "$selected" == "example" ]] ;;
	full) [[ "$selected" == "full" ]] ;;
	*) fail "mode inválido no manifesto: $row_mode" ;;
	esac
}

print_templates() {
	local selected="$1" found=0
	printf '%-62s %-12s %s\n' "OUTPUT" "LAYER" "SOURCE"
	while IFS=$'\t' read -r source output layer row_mode; do
		[[ -z "${source:-}" || "$source" == \#* ]] && continue
		if mode_matches "$row_mode" "$selected"; then
			printf '%-62s %-12s %s\n' "${output//__SERVICE__/<service>}" "$layer" "$source"
			found=1
		fi
	done <"$MANIFEST"
	((found == 1)) || fail "nenhum template para o modo $selected"
}

while (($# > 0)); do
	case "$1" in
	-h | --help)
		usage
		exit 0
		;;
	--dir)
		(($# >= 2)) || fail "--dir exige um valor"
		destination="$2"
		shift 2
		;;
	--mode)
		(($# >= 2)) || fail "--mode exige um valor"
		mode="$2"
		shift 2
		;;
	--force)
		force=1
		shift
		;;
	--no-verify)
		verify=0
		shift
		;;
	--dry-run)
		dry_run=1
		shift
		;;
	--list-templates)
		list_templates=1
		shift
		;;
	-*)
		fail "opção desconhecida: $1"
		;;
	*)
		if [[ -z "$service" ]]; then
			service="$1"
		elif [[ -z "$module" ]]; then
			module="$1"
		else
			fail "argumento inesperado: $1"
		fi
		shift
		;;
	esac
done

case "$mode" in
minimal | example | full) ;;
*) fail "modo inválido '$mode': use minimal, example ou full" ;;
esac

if [[ "$list_templates" -eq 1 ]]; then
	print_templates "$mode"
	exit 0
fi

[[ -n "$service" ]] || fail "informe o nome do serviço (ex.: task-service)"
[[ -n "$module" ]] || fail "informe o module path (ex.: github.com/acme/task-service)"
[[ -f "$MANIFEST" ]] || fail "manifesto não encontrado em $MANIFEST"

[[ "$service" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]] ||
	fail "nome inválido '$service': use minúsculas, dígitos e hífen (ex.: task-service)"

[[ "$module" =~ ^[A-Za-z0-9._~/-]+$ ]] ||
	fail "module path inválido '$module': use apenas letras, dígitos, '.', '_', '~', '/' e '-'"
[[ "$module" != /* && "$module" != */ ]] || fail "module path não pode começar ou terminar com '/'"

destination="${destination:-./${service}}"

if [[ -e "$destination" && ! -d "$destination" ]]; then
	fail "destino existe e não é diretório: $destination"
fi

if [[ -d "$destination" && -n "$(ls -A "$destination")" && "$force" -eq 0 ]]; then
	fail "destino não vazio: $destination (use --force para sobrescrever)"
fi

detect_go_version() {
	if [[ -n "${GO_VERSION:-}" ]]; then
		printf '%s' "$GO_VERSION"
		return
	fi

	local raw
	if raw="$(go env GOVERSION 2>/dev/null)" && [[ -n "$raw" ]]; then
		raw="${raw#go}"
		printf '%s' "$raw" | awk -F. '{ printf "%s.%s", $1, $2 }'
		return
	fi

	printf '1.24'
}

go_version="$(detect_go_version)"

# Monta o plano antes de escrever qualquer byte (permite --dry-run e evita
# deixar diretório parcial quando o manifesto está inconsistente).
plan_sources=()
plan_outputs=()

while IFS=$'\t' read -r source output layer row_mode; do
	[[ -z "${source:-}" || "$source" == \#* ]] && continue
	mode_matches "$row_mode" "$mode" || continue

	[[ -f "${TEMPLATE_DIR}/${source}" ]] || fail "template ausente: $source"
	plan_sources+=("$source")
	plan_outputs+=("$output")
done <"$MANIFEST"

((${#plan_sources[@]} > 0)) || fail "manifesto não produziu arquivos para o modo $mode"

if [[ "$dry_run" -eq 1 ]]; then
	printf 'modo: %s\ndestino: %s\n\n' "$mode" "$destination"
	for i in "${!plan_outputs[@]}"; do
		printf '  create  %s\n' "${plan_outputs[$i]//__SERVICE__/$service}"
	done
	printf '\n  create  .scaffold/service.json\n'
	printf '  create  docs/ (hub, catálogos, 5 docs curados e features/*)\n'
	exit 0
fi

mkdir -p "$destination"
destination="$(cd "$destination" && pwd)"

render() {
	local source="$1" target="$2"

	mkdir -p "$(dirname "$target")"
	if [[ "$source" == *.tmpl ]]; then
		sed \
			-e "s|__SERVICE__|${service}|g" \
			-e "s|__MODULE__|${module}|g" \
			-e "s|__GO_VERSION__|${go_version}|g" \
			"${TEMPLATE_DIR}/${source}" >"$target"
	else
		cp "${TEMPLATE_DIR}/${source}" "$target"
	fi
}

for i in "${!plan_sources[@]}"; do
	output="${plan_outputs[$i]//__SERVICE__/$service}"
	render "${plan_sources[$i]}" "${destination}/${output}"
done

# Metadados consumidos por new-feature.sh e pela geração de documentação.
mkdir -p "${destination}/.scaffold/features"
printf '%s\n' \
	'{' \
	'  "name": "'"$service"'",' \
	'  "module": "'"$module"'",' \
	'  "go_version": "'"$go_version"'",' \
	'  "mode": "'"$mode"'"' \
	'}' >"${destination}/.scaffold/service.json"

if command -v gofmt >/dev/null 2>&1; then
	find "$destination" -name '*.go' -exec gofmt -w {} +
fi

# Placeholder residual é bug de template, não decisão do usuário.
if grep -rInE '__[A-Z][A-Z0-9_]*__' "$destination" >/dev/null 2>&1; then
	printf 'erro: placeholder não substituído:\n' >&2
	grep -rInE '__[A-Z][A-Z0-9_]*__' "$destination" >&2
	exit 1
fi

# A documentação nasce junto com o código: hub + docs gerados + docs curados.
if command -v go >/dev/null 2>&1; then
	printf 'gerando documentação em docs/...\n'
	(
		cd "${SCRIPT_DIR}/docgen"
		go run . --service "$destination" --templates "${TEMPLATE_DIR}/docs"
	)
else
	printf 'aviso: go não encontrado; docs/ não foi gerado.\n' >&2
	printf '       rode depois: (cd %s/docgen && go run . --service %s --templates %s/docs)\n' \
		"$SCRIPT_DIR" "$destination" "${TEMPLATE_DIR}" >&2
fi

arch_check() {
	local failed=0

	if (cd "$destination" && go list -deps ./internal/domain/... 2>/dev/null |
		grep "${module}/internal/" | grep -qv "${module}/internal/domain/"); then
		printf 'erro: domain importa outro pacote interno\n' >&2
		failed=1
	fi

	if (cd "$destination" && go list -deps ./internal/application/... 2>/dev/null | grep -q "${module}/internal/adapters"); then
		printf 'erro: application importa adapters\n' >&2
		failed=1
	fi

	if (cd "$destination" && go list -deps ./internal/application/... 2>/dev/null | grep -q "${module}/internal/infrastructure"); then
		printf 'erro: application importa infrastructure\n' >&2
		failed=1
	fi

	if (cd "$destination" && go list -deps ./internal/ports/... 2>/dev/null | grep -qE "${module}/internal/(application|adapters|infrastructure)"); then
		printf 'erro: ports importam camadas externas\n' >&2
		failed=1
	fi

	return "$failed"
}

if [[ "$verify" -eq 1 ]]; then
	command -v go >/dev/null 2>&1 || fail "go não encontrado no PATH (use --no-verify para pular a validação)"

	if [[ "$mode" == "full" ]]; then
		printf 'resolvendo dependências (pgx)...\n'
		(cd "$destination" && go mod tidy)
	fi

	printf 'validando build, vet e testes...\n'
	(
		cd "$destination"
		go build ./...
		go vet ./...
		go test ./...
	)
	arch_check || fail "violação das regras de dependência"
fi

printf '\nserviço "%s" criado em %s\n' "$service" "$destination"
printf 'module: %s | go %s | modo: %s\n\n' "$module" "$go_version" "$mode"

printf 'árvore:\n'
(
	cd "$destination"
	find . -type f -not -path './.scaffold/*' | sed 's|^\./||' | sort | sed 's|^|  |'
)

printf '\npróximos passos:\n'
printf '  cd %s\n' "$destination"
printf '  make run            # sobe em :8080\n'
printf '  make test           # testes unitários\n'
printf '  make arch-check     # regras de dependência\n'
printf '  %s/new-feature.sh --service %s --spec <spec.json>\n' "$SCRIPT_DIR" "$destination"
