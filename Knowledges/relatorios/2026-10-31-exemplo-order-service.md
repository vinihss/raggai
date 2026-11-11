# Exemplo ponta a ponta — `order-service` + feature `invoice`

> Registro de execução do fluxo da §14 do
> [`guia-go-clean-hexagonal.md`](../guia-go-clean-hexagonal.md) usando o agente
> `go-artifact-builder` e a skill `go-artifact-flow`.
> Data: 2026-10-31 · Go 1.27.3 · Postgres 16 (container temporário)

## 1. Objetivo

Criar um serviço Go de exemplo, implementar uma feature de negócio pelo
descritor JSON, gerar a documentação e validar o resultado — registrando o que
funcionou, o que quebrou e o que precisa de decisão.

Resultado: `services/order-service` compilando, testado (unitário + integração
com Postgres real) e documentado, com a feature `invoice` ponta a ponta.

## 2. Decisões de entrada

| Decisão | Valor | Motivo |
|---|---|---|
| Serviço | `order-service` | nome ilustrativo, sem colidir com `task-service` das specs |
| Module path | `github.com/example/order-service` | exemplo autocontido |
| Modo do scaffold | `full` | exercita pgx, repositório Postgres, migration e teste de integração |
| Feature | `invoice` | caso de negócio com enum, default, campo nullable, `time` e idempotência |
| Adapters | `memory` + `postgres` | mesmo código de aplicação, duas persistências |

Optei por `full` porque o modo `example` já é o exemplo `ping` do scaffold e não
exercita migration, `dados.md` nem teste de integração.

## 3. Passo a passo executado

### 3.1 Scaffold do serviço

```bash
./Knowledges/scripts/new-go-service.sh order-service \
  github.com/example/order-service \
  --dir services/order-service --mode full
```

- exit `0`, ~6,5 s (inclui `go mod tidy` com rede, build, vet, test e
  arch-check).
- gerou 49 arquivos `.go` (2.388 linhas) + Makefile, Dockerfile, migrations,
  `docs/` e `configs/`.
- `docs/` já nasceu completo, com os 5 docs curados e os gerados.

### 3.2 Descritor da feature

Arquivo final: [`services/order-service/specs/invoice.json`](../../services/order-service/specs/invoice.json).

```json
{
  "version": 1,
  "feature": {"name": "invoice", "aggregate": "Invoice", "plural": "invoices",
              "table": "invoices", "route": "/invoices",
              "description": "Faturas emitidas para um cliente do serviço de pedidos."},
  "fields": [
    {"name": "id", "type": "string", "pk": true},
    {"name": "customer_id", "type": "string", "required": true, "immutable": true, "max_len": 64},
    {"name": "amount_cents", "type": "int64", "required": true, "min": 1, "max": 100000000},
    {"name": "currency", "type": "string", "required": true, "enum": ["BRL", "USD"], "default": "BRL"},
    {"name": "status", "type": "string", "required": true, "enum": ["draft", "issued", "paid", "void"], "default": "draft"},
    {"name": "description", "type": "string", "nullable": true, "max_len": 280},
    {"name": "due_date", "type": "time", "required": true},
    {"name": "created_at", "type": "time"},
    {"name": "updated_at", "type": "time"}
  ],
  "use_cases": [
    {"name": "Create", "idempotency": "recommended",
     "http": {"method": "POST", "path": "/invoices", "status": 201}},
    {"name": "Get", "http": {"method": "GET", "path": "/invoices/{id}", "status": 200}},
    {"name": "List", "http": {"method": "GET", "path": "/invoices", "status": 200}}
  ],
  "adapters": {"memory": true, "postgres": true},
  "tests": {"domain": true, "application": true, "http": true, "integration": true}
}
```

Ajuste feito durante o fluxo: `due_date` começou opcional e virou
`required: true`. Motivo na seção 8.2.

### 3.3 Dry-run

```bash
./Knowledges/scripts/new-feature.sh --service services/order-service \
  --spec services/order-service/specs/invoice.json --dry-run
```

Listou 17 arquivos e terminou com `(dry-run: nada foi escrito)`. Nenhum arquivo
foi criado — conferido depois pela contagem de arquivos.

### 3.4 Geração

```bash
./Knowledges/scripts/new-feature.sh --service services/order-service \
  --spec services/order-service/specs/invoice.json
```

Falhou **três vezes** antes de passar; cada falha expôs um defeito real do
gerador (seção 6). Na quarta execução: build, vet (inclusive
`-tags=integration`), test, arch-check e docgen com `architecture OK` e
`documentação OK`.

### 3.5 Integração e smoke HTTP

```bash
docker run -d --rm --name demo-pg -e POSTGRES_PASSWORD=demo \
  -e POSTGRES_DB=orders -p 55432:5432 postgres:16-alpine
docker exec -i demo-pg psql -U postgres -d orders -q < migrations/0001_create_pings.sql
docker exec -i demo-pg psql -U postgres -d orders -q < migrations/0002_create_invoices.sql

DATABASE_URL='postgres://postgres:demo@localhost:55432/orders?sslmode=disable' \
  go test -count=1 -tags=integration ./tests/...
```

Com o serviço em `:18080`:

| Requisição | Resultado |
|---|---|
| `GET /healthz` | `200` |
| `GET /readyz` | `200` |
| `POST /api/v1/invoices` (payload válido) | `201` + recurso com `created_at`/`updated_at` preenchidos |
| `POST /api/v1/invoices` (`amount_cents: 0`) | `422` `{"code":"validation_error","message":"amount_cents must be >= 1"}` |
| `GET /api/v1/invoices/{id}` | `200` |
| `GET /api/v1/invoices/inexistente` | `404` `{"code":"not_found"}` |
| `GET /api/v1/invoices?limit=1` | `200` + `next_cursor` |
| `GET ...?limit=1&cursor=<pk>` | próxima página keyset, sem repetir o item anterior |

## 4. Artefatos gerados

```text
services/order-service/
├── cmd/order-service/main.go
├── configs/.env.example
├── internal/
│   ├── domain/{invoice,ping}/
│   ├── ports/{clock,id,repositories,tx}/
│   ├── application/{invoice,ping}/
│   ├── adapters/inbound/http/...        # router, handlers, DTOs, erros, middleware
│   ├── adapters/outbound/{memory,postgres}/
│   └── infrastructure/{app,config,clock,id,logging}/
├── migrations/0001_create_pings.sql
├── migrations/0002_create_invoices.sql   # gerada, forward-only
├── specs/invoice.json                    # descritor versionado com o serviço
├── .scaffold/features/invoice.{json,state.json}
├── tests/integration/{ping,invoice}_test.go
├── docs/                                 # 12 arquivos, 520 linhas
├── Makefile · Dockerfile · go.mod · README.md
```

Wiring: `features_gen.go` chama `registerInvoice`, `invoice_gen.go` escolhe o
adapter. Nenhum arquivo existente precisou ser editado para adicionar a feature.

## 5. Validação final

| Checagem | Comando | Resultado |
|---|---|---|
| Build | `go build ./...` | ok |
| Vet | `go vet ./...` e `go vet -tags=integration ./tests/...` | ok |
| Testes | `go test -count=1 ./...` | 5 pacotes ok, 0 falhas |
| Integração | `go test -count=1 -tags=integration ./tests/...` (3×) | ok nas 3 execuções |
| Arquitetura | `make arch-check` | `architecture OK` |
| Formatação | `gofmt -l .` | vazio |
| Placeholders | `grep -rnE '__[A-Z_]+__'` | vazio |
| Docs/links | docgen (dentro do gerador) | `documentação OK` |
| Idempotência | sha256 de todos os arquivos antes/depois de regerar | 0 bytes de diferença (23 `same`, 1 `skip` de migration) |
| Dry-run | `--dry-run` | nenhum arquivo escrito |
| Matriz do template | `minimal`, `example`, `full` em `/tmp` | 3/3 ok |
| Scripts | `shellcheck`, `go vet` em `scaffold/` e `docgen/` | ok |

## 6. Defeitos encontrados no gerador (e correções)

Todos só apareceram porque o exemplo usa tipos que o `ping` não usa
(`time` opcional, `json`, nullable) ou porque o teste foi rodado duas vezes no
mesmo banco.

| # | Sintoma | Causa | Correção |
|---|---|---|---|
| D1 | `internal/domain/invoice/invoice.go:114: undefined: ErrDueDate` | `validationFor` rejeitava zero de **todo** campo `time.Time`, mas `fieldErrors` só declara o erro quando o campo é `required` | `spec.go` ([`568`](../scripts/scaffold/spec.go#L568)) passou a usar `emitsRequiredError(f)`, a mesma regra da declaração |
| D2 | `internal/application/invoice/create.go:18: undefined: time` | `emitAppCreate` fixava imports `context`/`fmt`/domain, mas `CreateInput` inclui os tipos dos campos graváveis | `emit_app.go` ([`76`](../scripts/scaffold/emit_app.go#L76)) monta imports conforme os campos: `time` e `encoding/json` só quando aparecem |
| D3 | `tests/integration/invoice_test.go:43: undefined: ptr` | o teste de integração usava `ptr(...)` para campos nullable sem emitir o helper | `emit_adapters.go` ([`224`](../scripts/scaffold/emit_adapters.go#L224)) emite `func ptr[T any]` quando algum sample usa ponteiro |
| D4 | `tests/integration/rma_test.go:45: undefined: json` | campo `json` no sample, mas o import fixo do teste de integração não incluía `encoding/json` | `emit_adapters.go` ([`216`](../scripts/scaffold/emit_adapters.go#L216)) inclui o import quando `UsesJSON` |
| D5 | 2ª execução do teste de integração falha com PK duplicada | o teste insere sempre o mesmo `id` e nunca limpa | `emit_adapters.go` ([`242`](../scripts/scaffold/emit_adapters.go#L242)) emite `DELETE FROM <tabela> WHERE <pk> = $1` antes do `Save`; mesma correção no template [`ping_test.go.tmpl`](../scripts/templates/go-service/tests/integration/ping_test.go.tmpl#L35) e no arquivo já gerado do exemplo |

Nota de processo: a primeira versão da correção D5 usou `sqlColumn(m.PK)`, que
devolve a **definição DDL** (`id text PRIMARY KEY`) e produzia
`syntax error at or near "text"`. O correto é `m.PK.Name`. Vale como argumento
para o gerador ter testes próprios.

Cobertura de regressão usada (fora do vault, em `/tmp/opencode/regress`):
feature com `time` opcional, `time` nullable, `string` nullable e campo `json` —
build, `vet -tags=integration`, `go test ./...` e `make arch-check` verdes depois
das correções.

## 7. Observações para análise (não bloqueantes)

### 7.1 `--no-verify` também pula `go mod tidy`

O `--help` do script diz isso, mas a tabela da §14.1 do guia diz apenas "não roda
build/vet/test/arch-check". Em serviço `full`, gerar com `--no-verify` deixa o
`go.mod` sem `pgx` e o build falha até rodar `go mod tidy`. A tabela do guia
deveria citar o `tidy`.

### 7.2 `time` opcional vs `nullable`

Um campo `time` sem `required` e sem `nullable` gera coluna `timestamptz NOT
NULL` e aceita o zero value (`0001-01-01`). Ou seja: "opcional" no descritor não
significa "ausente" no banco. Para opcional de verdade é preciso
`"nullable": true`. Foi por isso que `due_date` virou `required: true` — a regra
atual é defensável, mas merece uma linha explícita no guia (e talvez no schema).

### 7.3 Formatação numérica nos docs

`amount_cents` aparece como `máx. 1e+08` em `docs/features/invoice.md`. É o
`%v` de `float64`; em documentação de negócio, `100000000` leria melhor.

### 7.4 Timestamps UTC na escrita, offset local na leitura

`POST` devolve `created_at` em `Z`; `GET`/`List` devolvem `-03:00` (o Postgres
devolve `timestamptz` no fuso da sessão). Não é bug, mas se o contrato da API
promete UTC, o adapter ou o DTO precisa normalizar.

### 7.5 Estado do gerador no serviço

`.scaffold/features/invoice.json` guarda o descritor e `.state.json` o sha256 dos
arquivos. Isso torna a regeração idempotente, mas cria uma segunda cópia do
descritor além de `specs/invoice.json`. Decidir qual é a fonte (ou documentar
que `.scaffold` é cache) evita divergência futura.

### 7.6 Escopo do gerador

`Create/Get/List` cobrem o exemplo, mas não há `Update`/`Delete` nem troca de
status (`issued`/`paid`). Uma fatura real precisaria de transições de estado —
provavelmente o próximo incremento do gerador.

## 8. Como reproduzir

```bash
# 1. serviço
./Knowledges/scripts/new-go-service.sh order-service \
  github.com/example/order-service --dir services/order-service --mode full

# 2. feature (dry-run antes)
./Knowledges/scripts/new-feature.sh --service services/order-service \
  --spec services/order-service/specs/invoice.json --dry-run
./Knowledges/scripts/new-feature.sh --service services/order-service \
  --spec services/order-service/specs/invoice.json

# 3. validação
cd services/order-service
go build ./... && go vet ./... && go test ./... && make arch-check && gofmt -l .
```

Para a integração, suba um Postgres, aplique `migrations/*.sql` em ordem e rode
`DATABASE_URL=... go test -tags=integration ./tests/...`.

## 9. Próximos passos sugeridos

1. **Testes do gerador**: os 5 defeitos acima são todos de geração de código e
   teriam sido pegos por um teste de matriz de campos (string/int64/bool/time/
   json × required/nullable/default/enum) que compile a saída.
2. **Decidir `time` opcional**: exigir `nullable: true` explicitamente ou tratar
   `required: false` como coluna nullable — hoje o comportamento é ambíguo.
3. **Alinhar o guia**: §14.1 precisa citar `go mod tidy` no `--no-verify`.
4. **Normalizar tempo na borda HTTP** (UTC explícito) ou documentar o offset.
5. **Avaliar `Update`/`Delete` e transições de estado** no gerador antes de usar
   o fluxo em um serviço real de faturamento.
