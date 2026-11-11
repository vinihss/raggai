#!/usr/bin/env bash
#
# new-feature.sh — gera uma feature completa (domain, ports, application,
# adapters, HTTP, wiring, migration, testes) a partir de um descritor JSON.
#
# Uso:
#   new-feature.sh --service DIR --spec FILE [opções]
#
# Exemplos:
#   ./new-feature.sh --service ../invoice-service --spec invoice.json
#   ./new-feature.sh --service . --spec invoice.json --dry-run
#
# Opções:
#   --service DIR   raiz do serviço criado por new-go-service.sh
#   --spec FILE     descritor JSON (ver feature.schema.json)
#   --dry-run       mostra o plano sem escrever nada
#   --force         sobrescreve arquivos existentes que não foram gerados
#   --no-verify     pula go build/vet/test e o arch-check
#   -h, --help      mostra esta ajuda
#
# Arquivos gerados levam o cabeçalho "DO NOT EDIT" e podem ser regerados.
# Migrations aplicadas nunca são reescritas; para mudar o schema, crie a próxima.
#
# O descritor fica copiado em <serviço>/.scaffold/features/<feature>.json, então
# regerar a feature depois é só rodar de novo com o mesmo --spec (ou com o
# descritor salvo).
#
# A documentação em docs/ é regerada ao final (exceto em --dry-run), para não
# divergir do código.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly GENERATOR_DIR="${SCRIPT_DIR}/scaffold"

usage() {
	sed -n '2,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

fail() {
	printf 'erro: %s\n' "$*" >&2
	exit 1
}

service=""
spec=""
passthrough=()
dry_run=0

while (($# > 0)); do
	case "$1" in
	-h | --help)
		usage
		exit 0
		;;
	--service)
		(($# >= 2)) || fail "--service exige um valor"
		service="$2"
		shift 2
		;;
	--spec)
		(($# >= 2)) || fail "--spec exige um valor"
		spec="$2"
		shift 2
		;;
	--dry-run | --force | --no-verify)
		[[ "$1" == "--dry-run" ]] && dry_run=1
		passthrough+=("$1")
		shift
		;;
	-*)
		fail "opção desconhecida: $1"
		;;
	*)
		fail "argumento inesperado: $1"
		;;
	esac
done

[[ -n "$service" ]] || fail "informe --service DIR"
[[ -n "$spec" ]] || fail "informe --spec FILE"
[[ -d "$service" ]] || fail "serviço não encontrado: $service"
[[ -f "$spec" ]] || fail "descritor não encontrado: $spec"
[[ -f "${GENERATOR_DIR}/go.mod" ]] || fail "gerador não encontrado em ${GENERATOR_DIR}"

command -v go >/dev/null 2>&1 || fail "go não encontrado no PATH"

# Resolve caminhos antes do cd, para o gerador receber caminhos absolutos.
service="$(cd "$service" && pwd)"
spec="$(cd "$(dirname "$spec")" && pwd)/$(basename "$spec")"

cd "$GENERATOR_DIR"
go run . --service "$service" --spec "$spec" ${passthrough[@]+"${passthrough[@]}"}

# O código mudou; a documentação gerada precisa acompanhar (regra DOC1/DOC2).
if [[ "$dry_run" -eq 0 ]]; then
	(
		cd "${SCRIPT_DIR}/docgen"
		go run . --service "$service" --templates "${SCRIPT_DIR}/templates/go-service/docs"
	)
fi
