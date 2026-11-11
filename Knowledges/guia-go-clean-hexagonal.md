D# Guia de desenvolvimento Go — Clean Architecture + Hexagonal

> **Público:** agentes de IA e pessoas que escrevem código Go neste monorepo.
> **Natureza:** instrução normativa. Não é tutorial: cada regra tem ID (`D1`,
> `A3`, `I4`…) para ser citada em revisão, PR e checklist.
> **Precedência:** ADRs em [`spec/decisions/`](../Application/spec/decisions/README.md)
> \> seções normativas em [`spec/task-service/`](../Application/spec/task-service/)
> \> este guia \> código existente. Divergência não se resolve "editando de
> passagem": exige ADR.
> **Base:** [`17. Estrutura de pastas`](../Application/spec/task-service/17-estrutura-de-pastas.md),
> [`2. Decisões arquiteturais transversais`](../Application/docs/2.%20Decis%C3%B5es%20arquiteturais%20transversais.md).

---

## 0. Escopo e como usar

Aplica-se a **todo serviço Go** do monorepo (Task Service, AI Gateway, Knowledge
Service, workers e futuros serviços).

- Serviço novo: rode o scaffold da [seção 14](#14-scaffold-do-projeto-padrão),
  leia as regras abaixo e implemente o primeiro caso de uso real.
- Serviço existente: use o guia como régua de revisão. Código legado que viola
  uma regra não é corrigido "de passagem" numa feature — abra issue/ADR.
- Agente: antes de criar arquivo, identifique a camada (seção 2). Se não souber
  a camada, a resposta é "não criar ainda"; descubra a responsabilidade primeiro.

Regra zero: **o domínio não conhece o mundo externo**. Toda decisão de layout
abaixo existe para preservar isso.

---

## 1. Princípios

1. **Domínio no centro.** Entidades, value objects e invariantes não importam
   HTTP, SQL, broker, filesystem ou SDK.
2. **Dependência aponta para dentro.** `adapters → application → domain`; as
   portas ficam no meio e são implementadas pelos adapters.
3. **Porta pertence ao consumidor.** Quem precisa da capacidade declara a
   interface; quem implementa não dita o contrato.
4. **Composição explícita.** Um único lugar (`internal/infrastructure/app` ou
   `cmd`) conhece tipos concretos e monta o grafo de dependências.
5. **Abstração só quando paga.** Interface para segunda implementação, teste ou
   fronteira real. Não criar camada/pacote por entidade.
6. **Sem framework mágico.** stdlib primeiro; DI manual; sem `init()`, sem
   variável global mutável, sem ORM.

---

## 2. Camadas e mapa de imports

```text
┌─────────────────────────────────────────────────────────────┐
│ adapters/inbound      HTTP, CLI, consumer de fila           │
│ adapters/outbound     Postgres, broker, clientes externos    │
├─────────────────────────────────────────────────────────────┤
│ application           casos de uso, transação, orquestração │
│ ports                 interfaces de saída/infraestrutura    │
├─────────────────────────────────────────────────────────────┤
│ domain                entidades, VOs, invariantes, erros    │
├─────────────────────────────────────────────────────────────┤
│ infrastructure        config, log, telemetria, composition  │
│ cmd/<service>         entrypoint, sinais, lifecycle         │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Matriz de imports

| De ↓ / pode importar → | `domain` | `ports` | `application` | `adapters` | `infrastructure` | stdlib |
|---|---|---|---|---|---|---|
| `domain` | ✔ | ✘ | ✘ | ✘ | ✘ | ✔ |
| `ports` | ✔ | ✔ | ✘ | ✘ | ✘ | ✔ |
| `application` | ✔ | ✔ | ✔ (mesmo módulo) | ✘ | ✘ | ✔ |
| `adapters` | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ |
| `infrastructure` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `cmd` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

Regras derivadas:

- **L1** `domain` não importa nenhum outro pacote `internal/` do próprio módulo.
- **L2** `application` nunca importa `adapters` nem `infrastructure`.
- **L3** `ports` importam apenas `domain` e stdlib.
- **L4** `adapters` não importam `infrastructure` (config/logger chegam por
  parâmetro, não por import).
- **L5** `infrastructure` e `cmd` são os únicos que podem importar tudo.
- **L6** Um serviço **não importa** `internal/` de outro serviço. Contratos
  compartilhados vivem em pacote pequeno, versionado, sem lógica de negócio.

Verificação executável (ver [seção 13](#13-definition-of-done)):

```bash
go list -deps ./internal/domain/... \
  | grep "$(go list -m)/internal/" | grep -v "$(go list -m)/internal/domain/"
# saída vazia = OK
```

---

## 3. Layout padrão

```text
services/<service>/
├── cmd/<service>/main.go            # entrypoint: config, sinais, lifecycle
├── internal/
│   ├── domain/                      # um pacote por agregado/contexto
│   │   └── <aggregate>/
│   ├── ports/                       # interfaces, por área
│   │   ├── repositories/
│   │   ├── broker/
│   │   ├── clock/
│   │   ├── id/
│   │   ├── tx/
│   │   └── auth/
│   ├── application/                 # um pacote por responsabilidade
│   │   └── <use-case-group>/
│   ├── adapters/
│   │   ├── inbound/http/            # router, handlers, dto, errors
│   │   └── outbound/postgres/       # repositórios, broker, transactor
│   └── infrastructure/
│       ├── config/
│       ├── logging/
│       ├── telemetry/
│       ├── clock/
│       ├── id/
│       └── app/                     # composition root + loops
├── migrations/
├── configs/
├── tests/                           # integração (Postgres real)
├── Dockerfile
├── Makefile
└── go.mod
```

### 3.1 Regras de organização

- **S1** Um pacote por **responsabilidade de caso de uso** (`application/tasks`,
  `application/scheduling`, `application/consuming`), não um `services.go` com
  40 métodos.
- **S2** Um pacote de domínio por agregado/contexto (`domain/task`,
  `domain/execution`), não `domain/models`.
- **S3** Proibido criar `internal/utils`, `internal/common`, `internal/helpers`,
  `internal/models`, `internal/services`, `internal/pkg`. Se o código não tem
  dono claro, ele ainda não foi entendido.
- **S4** Nome de arquivo descreve o assunto (`ping.go`, `router.go`, `errors.go`,
  `accesslog.go`), sem `misc.go`/`helpers.go`.
- **S5** `cmd/<service>/main.go` é o **único** arquivo `package main`; nada de
  lógica além de config, sinais e chamada ao composition root.
- **S6** Monorepo: cada serviço tem seu `go.mod`, `migrations`, `Dockerfile` e
  pipeline. A raiz pode ter `go.work` só para desenvolvimento conjunto.
- **S7** `migrations/` é forward-only e aplicada por job separado (ADR-010); a
  aplicação valida a versão do schema no boot e falha readiness se estiver atrás.
- **S8** `tests/` guarda integração; testes unitários ficam ao lado do código
  (`_test.go` no mesmo pacote ou `_test`).

---

## 4. `domain`

O domínio é a razão de o serviço existir. Se ele depende de framework, a
arquitetura já foi perdida.

- **D1** Sem imports de `application`, `ports`, `adapters`, `infrastructure`.
  Sem `net/http`, `database/sql`, `pgx`, `encoding/json` (exceto `json.RawMessage`
  para payload opaco), `os`, SDKs.
- **D2** Campos privados. O construtor (`New...`) valida invariantes; não existe
  estado inválido alcançável. Sem setters públicos.
- **D3** Erros exportados e comparáveis com `errors.Is` (`ErrEmptyMessage`,
  `ErrInvalidTransition`). Nunca `errors.New` anônimo atravessando camadas.
- **D4** Agregado é a fronteira transacional. Referência a outro agregado é por
  **ID**, não por ponteiro.
- **D5** Value objects imutáveis, comparáveis por valor, com validação no
  construtor (`Schedule`, `Target`, `ExecutionPolicy`).
- **D6** Nenhuma entidade/método de domínio recebe `context.Context`. `ctx` é
  preocupação de I/O, não de regra.
- **D7** Tempo sempre em UTC (`time.Time.UTC()`); dinheiro/durations com tipo
  explícito, nunca `float64` para valor monetário.
- **D8** Comportamento nos métodos (`execution.Complete(...)` valida a
  transição), não um struct anêmico manipulado de fora.
- **D9** Sem tags `json`/`db`/`validate` em struct de domínio. Tags são contrato
  de adapter.

```go
// internal/domain/ping/ping.go
func New(id, message string, createdAt time.Time) (Ping, error) {
	if id == "" {
		return Ping{}, ErrEmptyID
	}
	message = strings.TrimSpace(message)
	switch {
	case message == "":
		return Ping{}, ErrEmptyMessage
	case len([]rune(message)) > maxMessageLength:
		return Ping{}, ErrMessageTooLong
	}
	return Ping{id: id, message: message, createdAt: createdAt.UTC()}, nil
}
```

---

## 5. `application` (casos de uso)

- **A1** Um pacote por responsabilidade; cada caso de uso é um método exportado
  com nome de ação (`Create`, `Trigger`, `ReapExpiredLeases`).
- **A2** Assinatura padrão: `func (s *Service) Execute(ctx context.Context, in Input) (Output, error)`.
  `ctx` é sempre o primeiro parâmetro e nunca é armazenado em struct.
- **A3** `Input`/`Output` são DTOs do caso de uso, sem tags. DTO HTTP e linha de
  banco não atravessam esta fronteira.
- **A4** Dependências chegam por porta (`repositories.X`, `clock.Clock`,
  `id.Generator`, `tx.UnitOfWork`). Nunca `*pgxpool.Pool`, `*sql.DB` ou
  `*http.Client` cru.
- **A5** Um caso de uso = uma transação. Abra via `UnitOfWork`/`Transactor`;
  repositórios participam da transação, não abrem `BEGIN` por conta própria.
- **A6** Orquestra; não reimplementa regra que pertence ao domínio. Se a
  validação depende só de dados do agregado, ela vive no domínio.
- **A7** Erros são embrulhados com contexto (`fmt.Errorf("save ping: %w", err)`)
  e logados **uma vez**, na borda (middleware/handler ou composition root).
  Proibido "logar e retornar".
- **A8** Serviço é stateless. Sem cache mutável de pacote; estado vai para
  repositório/porta explícita.
- **A9** Entrega at-least-once exige idempotência explícita (chave de
  idempotência, compare-and-set, constraint única), não "esperança".
- **A10** Caso de uso não importa `net/http`, `encoding/json` (exceto payload
  opaco), `pgx` ou SDK.

```go
// internal/application/ping/service.go
type Service struct {
	repo  repositories.PingRepository
	clock clock.Clock
	ids   id.Generator
}

func (s *Service) Execute(ctx context.Context, in Input) (Output, error) {
	aggregate, err := domainping.New(s.ids.New(), in.Message, s.clock.Now())
	if err != nil {
		return Output{}, err
	}
	if err := s.repo.Save(ctx, aggregate); err != nil {
		return Output{}, fmt.Errorf("save ping: %w", err)
	}
	return Output{ID: aggregate.ID(), Message: aggregate.Message(), CreatedAt: aggregate.CreatedAt()}, nil
}
```

---

## 6. `ports`

- **P1** Interfaces de saída e de infraestrutura ficam em `internal/ports/<área>`
  (`repositories`, `broker`, `clock`, `id`, `tx`, `auth`).
- **P2** Interface pequena e orientada ao uso: só os métodos que o consumidor
  realmente chama. Proibido `Repository[T]` genérico com CRUD universal.
- **P3** A interface é declarada por quem consome. Adapter pode declarar uma
  interface local mínima se precisar desacoplar de detalhe do driver.
- **P4** Nomes pelo papel: `TaskRepository`, `MessageBroker`, `Clock`,
  `IDGenerator`, `Transactor`, `Authenticator`, `Authorizer`.
- **P5** Toda porta usada por caso de uso tem **fake** de teste (struct pequena
  no `_test.go`). Mock gerado é opcional, nunca obrigatório.
- **P6** Porta não vaza tipo de driver (`pgx.Tx`, `*sql.Rows`) nem tipo HTTP.

---

## 7. `adapters/inbound`

### 7.1 HTTP

- **I1** Handler faz quatro coisas: decodifica, valida **forma**, chama o caso de
  uso, mapeia erro. Regra de negócio fica em `domain`/`application`.
- **I2** DTO em `dto/`, com tags JSON. Entidade de domínio nunca é serializada
  direto.
- **I3** Prefixo `/api/v1` é registrado **uma vez** em `router.go`; handlers
  declaram apenas o sufixo.
- **I4** Mapeamento erro → status/código vive em `errors.go`. Handler não chama
  `http.Error` solto nem devolve texto de erro interno.
- **I5** `/healthz`, `/readyz` e `/metrics` ficam **fora** do prefixo versionado,
  sem token de cliente, expostos só na rede interna.
- **I6** Auth, request ID, access log, recover, body limit e rate limit são
  middleware — nenhum handler repete isso.
- **I7** `net/http.ServeMux` com padrões de método (Go 1.22+) é suficiente.
  `chi` só com necessidade real de grupos de middleware (decisão de
  implementação, não arquitetural).
- **I8** Limite de payload com `http.MaxBytesReader` e `DisallowUnknownFields`;
  payload máximo do Task Service é 256 KiB (ADR-009).
- **I9** Mudou endpoint → atualizar contrato OpenAPI, teste de contrato e a
  tabela de rotas na mesma entrega.

Tabela de erros estáveis (Task Service §11.4):

| Código | HTTP | Quando |
|---|---|---|
| `validation_error` | 400/422 | forma inválida ou invariante violada |
| `not_found` | 404 | recurso inexistente ou fora do `owner_id` |
| `conflict` | 409 | unicidade, versão otimista |
| `invalid_transition` | 409 | transição de estado proibida |
| `lease_expired` | 409 | ACK/NACK sem posse válida |
| `capability_not_authorized` | 403 | worker sem capacidade autorizada |
| `payload_too_large` | 413 | acima de `PAYLOAD_MAX_BYTES` |
| `rate_limited` | 429 | limite por principal |
| `internal` | 500 | erro não classificado (nunca vaza detalhe) |

### 7.2 Outros inbound

CLI, consumer de fila e webhook seguem o mesmo contrato: traduzir entrada →
chamar caso de uso → traduzir saída/erro. Nenhum deles contém regra de negócio.

---

## 8. `adapters/outbound`

- **O1** Implementa a porta e traduz o mundo externo. Trocar memória por
  Postgres não muda `application`/`domain`.
- **O2** Um pacote por tecnologia: `outbound/postgres`, `outbound/memory`,
  `outbound/httpclient`.
- **O3** Mapeamento explícito domínio ↔ linha/JSON. Struct de persistência com
  tags `db`/`json` é **separada** da entidade.
- **O4** SQL vive no adapter, em constantes legíveis, sempre com `ctx`. Nada de
  SQL em `application` ou `domain`.
- **O5** Erros do driver são traduzidos para erros de porta (`ErrNotFound`,
  `ErrConflict`, `ErrUnavailable`). `pgx.ErrNoRows` não vaza para o caso de uso.
- **O6** Asserção de conformidade em tempo de compilação:
  `var _ repositories.PingRepository = (*PingRepository)(nil)`.
- **O7** Migrations forward-only; nunca `DROP` silencioso. Retenção e purge
  seguem ADR-011.
- **O8** Broker/transactor seguem o mesmo padrão: porta em `ports/`, implementação
  em `adapters/outbound`, semântica de entrega documentada no adapter.

---

## 9. `infrastructure` e `cmd`

- **F1** `main.go` só: carrega config, monta app, trata `SIGINT`/`SIGTERM`,
  chama `Run`. Sem regra, sem query, sem handler.
- **F2** Config é struct explícita, lida uma vez e **validada no boot**
  (`HTTP_ADDR`, `DATABASE_URL` obrigatória etc.). Proibido `os.Getenv` espalhado.
- **F3** Log com `log/slog` em JSON, nível validado na config. Proibido
  `fmt.Println` para diagnóstico; segredos e payload sensível são redigidos.
- **F4** Composition root é o **único** lugar que conhece tipos concretos.
  Wiring manual, sem framework de DI, sem `init()`, sem global mutável.
- **F5** Loops de background (scheduler, reaper, reconciliação, heartbeat):
  cada um com `ctx`, intervalo configurável, log de erro e métrica própria.
  Falha de loop não derruba a API.
- **F6** Shutdown ordenado: parar loops → parar de aceitar conexões → drenar
  requisições → liberar leases em voo (ou deixar expirar) → fechar pool.
- **F7** Telemetria (OTel, métricas, traces) é infraestrutura, injetada por porta
  ou middleware; domínio não conhece span.
- **F8** Deploy: binário único, imagem distroless, usuário não-root, healthcheck
  em `/readyz`.

---

## 10. Convenções Go

- **G1** `context.Context` é o primeiro parâmetro de função de I/O e nunca é
  armazenado em struct.
- **G2** Erros: sentinela/tipo no pacote de origem, embrulho com `%w`, `errors.Is`/
  `errors.As` na borda. Sem `panic` em biblioteca; sem `log.Fatal` fora de `main`.
- **G3** Interfaces: `accept interfaces, return structs`; pequenas; no consumidor.
- **G4** Tempo via `Clock`; proibido `time.Now()` em `domain`/`application`.
- **G5** Identidade via `IDGenerator`; proibido `uuid.New()` em `domain`/`application`.
- **G6** Nomes: pacote singular, minúsculo, sem `util`/`common`; exportado com
  comentário iniciando pelo nome.
- **G7** Concorrência: `-race` obrigatório; toda goroutine tem caminho de
  encerramento; prefira `errgroup` a `WaitGroup` + canal de erro manual.
- **G8** Sem estado global mutável. `init()` proibido.
- **G9** Dependência nova exige justificativa (stdlib cobre? manutenção ativa?
  licença?). ORM proibido; SQL explícito.
- **G10** `any`/`interface{}` proibido em `domain`/`ports`; JSON opaco é
  `json.RawMessage`.
- **G11** `gofmt`/`goimports` e `go vet` limpos antes de qualquer entrega.
- **G12** Generics só para eliminar duplicação real e verificável — não para
  "parecer moderno".

---

## 11. Testes

| Camada | O que testar | Como |
|---|---|---|
| Domínio | invariantes, transições válidas/inválidas, cálculos | table-driven, sem I/O |
| Application | orquestração, idempotência, propagação de erro | fakes de porta, `Clock` fixo |
| Adapter HTTP | contrato, status, código de erro, payload | `httptest` + fake do caso de uso |
| Adapter Postgres | SQL, mapeamento, constraints | Postgres real + `-race` |
| Integração | fluxo completo com worker fake | Postgres real + API + `-tags=integration` |

- **T1** Teste de domínio não toca banco, rede ou relógio real.
- **T2** Fakes pequenos no próprio `_test.go`; sem mock framework obrigatório.
- **T3** Handler testado com `httptest` e fake do caso de uso; não sobe servidor.
- **T4** Concorrência (reserva, lease, reaper, fencing) só se prova com Postgres
  real e `-race` — banco fake não prova constraint nem isolamento.
- **T5** Jitter, tempo e IDs são injetáveis para resultado determinístico.
- **T6** Cobertura não é meta. Meta é invariante, caminho de erro e contrato
  cobertos.

---

## 12. Anti-padrões

| Errado | Certo | Por quê |
|---|---|---|
| `domain` importa `pgx`/`gorm` | porta `repositories` + adapter | domínio precisa ser testável sem banco |
| Handler valida regra de negócio | handler valida forma; caso de uso/domínio valida regra | uma regra, um dono |
| `services/tasks.go` com 40 métodos | `application/tasks` com casos de uso coesos | coesão e diff revisável |
| `Repository` genérico com `Save(any)` | portas específicas por agregado | tipo e contrato explícitos |
| Entidade com tags `json`/`db` | DTO e struct de persistência separadas | contrato de fora não vaza para dentro |
| Erro do driver chegando ao caso de uso | tradução para erro de porta | desacoplamento e mapeamento estável |
| `time.Now()` no caso de uso | `clock.Clock` injetado | teste determinístico |
| `log.Error` e `return err` no mesmo lugar | logar uma vez na borda | log duplicado e ruído |
| `init()` montando dependências | composition root explícito | ciclo de vida e teste controlados |
| `utils`/`common`/`helpers` | pacote com responsabilidade nomeada | código sem dono apodrece |

---

## 13. Definition of Done

Antes de considerar a entrega pronta:

```bash
gofmt -l .            # saída vazia
go vet ./...          # limpo
go test ./...         # verde
go test -race ./...   # verde nos pacotes concorrentes
make arch-check       # regras de dependência OK
```

Checklist:

- [ ] Arquivo novo está na camada correta e importa só o permitido (seção 2.1).
- [ ] Nenhum `time.Now()`, `uuid.New()`, `os.Getenv` ou `slog` fora de infra.
- [ ] Nenhuma regra de negócio em handler, repositório ou `main.go`.
- [ ] Erros de domínio são sentinelas/tipos e têm mapeamento HTTP definido.
- [ ] Caso de uso recebe `ctx` e depende só de portas.
- [ ] Porta nova tem fake e teste do caminho de erro.
- [ ] Endpoint novo atualizou contrato, teste de contrato e tabela de rotas.
- [ ] Migration nova é forward-only e não quebra readiness.
- [ ] Log não contém segredo, token ou payload sensível.

---

## 14. Scaffold do projeto padrão

O script [`scripts/new-go-service.sh`](./scripts/new-go-service.sh) gera um
serviço já compilando, com exemplo ponta a ponta (`ping`) nos modos `example` e
`full`, que demonstra cada camada e cada regra deste guia. Os templates ficam em
[`scripts/templates/go-service/`](./scripts/templates/go-service/).

### 14.1 Uso do scaffold

```bash
# a partir da raiz do vault
./Knowledges/scripts/new-go-service.sh <service-name> <module-path> [opções]

# exemplo: serviço no monorepo, modo completo
./Knowledges/scripts/new-go-service.sh task-service \
  github.com/acme/platform/services/task-service --mode full

# exemplo: destino explícito, só o esqueleto
./Knowledges/scripts/new-go-service.sh billing github.com/acme/billing \
  --dir services/billing --mode minimal
```

| Opção | Efeito |
|---|---|
| `--dir DIR` | destino (default `./<service-name>`) |
| `--mode MODE` | `minimal`, `example` (default) ou `full` |
| `--force` | permite sobrescrever diretório não vazio |
| `--no-verify` | não roda `go mod tidy`, build, vet, test nem arch-check |
| `--dry-run` | mostra o plano sem escrever nada |
| `--list-templates` | lista os templates do modo |
| `-h`, `--help` | ajuda |

O script valida nome (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`), module path, recusa
destino não vazio sem `--force`, substitui `__SERVICE__`, `__MODULE__` e
`__GO_VERSION__` (detectada de `go env GOVERSION`), copia apenas o que está no
manifesto, roda `gofmt` e falha se sobrar placeholder. Por padrão valida
`go build`, `go vet`, `go test` e as regras de dependência.

Para fixar a versão do Go (go.mod e imagem Docker), exporte `GO_VERSION` antes
de rodar:

```bash
GO_VERSION=1.24 ./Knowledges/scripts/new-go-service.sh billing github.com/acme/billing
```

Os três modos existem para não obrigar ninguém a apagar código de exemplo:

| Modo | Contém | Use quando |
|---|---|---|
| `minimal` | HTTP, health, middlewares, config, portas base | o serviço ainda não tem domínio |
| `example` | `minimal` + feature `ping` em memória | quer aprender o fluxo ponta a ponta |
| `full` | `example` + pgx, repositório Postgres, `UnitOfWork`, migration e teste de integração | o serviço já nasce com banco |

### 14.2 O que é gerado

O [manifesto](./scripts/templates/go-service/template.manifest.tsv) é a única
fonte de verdade do scaffold. Cada linha declara
`source <TAB> output <TAB> camada <TAB> modo`; linhas com o mesmo `output` são
variantes exclusivas (só uma é renderizada). Nenhum arquivo fora do manifesto é
copiado.

| Camada | Template (exemplo) | Arquivo gerado | Regras |
|---|---|---|---|
| raiz | `go.mod.tmpl`, `Makefile.tmpl`, `Dockerfile.tmpl` | `go.mod`, `Makefile`, `Dockerfile` | G1/G7 |
| cmd | `cmd/__SERVICE__/main.go.tmpl` | `cmd/<service>/main.go` | F1/F2/F7 |
| domain | `internal/domain/ping/ping.go.tmpl` | `internal/domain/<feature>/<feature>.go` | D1–D7 |
| ports | `internal/ports/{clock,id,repositories,tx}/*.tmpl` | mesmos caminhos | P1–P6 |
| application | `internal/application/ping/service.go.tmpl` | `internal/application/<feature>/service.go` | A1–A7 |
| inbound HTTP | `internal/adapters/inbound/http/*.tmpl` | router, handlers, DTOs, erros, middleware | I1–I7 |
| outbound | `internal/adapters/outbound/{memory,postgres}/*.tmpl` | adapters de porta | O1–O7 |
| infrastructure | `internal/infrastructure/{config,logging,clock,id,app}/*.tmpl` | config, logging, implementações de porta, composition root | F2–F6 |
| migrations | `migrations/0001_create_pings.sql.tmpl` | `migrations/0001_create_pings.sql` | O7/S7 |
| testes | `tests/integration/*.tmpl` | `tests/integration/` | T4 |
| docs | `docs/*.md.tmpl` | `docs/` (ver 14.4) | DOC1–DOC6 |

A linha `docs` é a exceção: os templates de docs curados são consumidos pelo
`docgen`, não pelo manifesto.

O wiring é dividido para não exigir edição de arquivo existente ao adicionar
feature:

- `internal/infrastructure/app/app.go` monta o processo e chama
  `registerFeatures(api, deps)`.
- `features_gen.go` é **gerado** e chama um `register<Feature>` por feature.
- `<feature>_gen.go` é **gerado** e escolhe o adapter daquela feature.

Trocar o adapter de uma feature é editar só o `<feature>_gen.go` (ou mudar o
descritor e regerar). Nunca edite `features_gen.go` à mão.

### 14.3 Gerar uma feature a partir do descritor

O scaffold entrega o esqueleto; features de negócio nascem do descritor JSON e
do gerador:

```bash
./Knowledges/scripts/new-feature.sh --service ./task-service --spec invoice.json
```

O contrato do descritor está em
[`scripts/feature.schema.json`](./scripts/feature.schema.json). Um exemplo
mínimo:

```json
{
  "version": 1,
  "feature": {
    "name": "invoice",
    "aggregate": "Invoice",
    "plural": "invoices",
    "table": "invoices",
    "route": "/invoices",
    "description": "Faturas emitidas para um cliente."
  },
  "fields": [
    {"name": "id", "type": "string", "pk": true},
    {"name": "customer_id", "type": "string", "required": true, "max_len": 64},
    {"name": "amount_cents", "type": "int64", "required": true, "min": 1},
    {"name": "status", "type": "string", "required": true,
     "enum": ["draft", "issued", "paid"], "default": "draft"},
    {"name": "created_at", "type": "time"}
  ],
  "use_cases": [
    {"name": "Create", "http": {"method": "POST", "path": "/invoices", "status": 201}},
    {"name": "Get", "http": {"method": "GET", "path": "/invoices/{id}", "status": 200}},
    {"name": "List", "http": {"method": "GET", "path": "/invoices", "status": 200}}
  ],
  "adapters": {"memory": true, "postgres": true},
  "tests": {"domain": true, "application": true, "http": true, "integration": true}
}
```

O gerador cobre exatamente o que o descritor declara:

| Elemento | Suporte |
|---|---|
| Campos | `string`, `int64`, `bool`, `time`, `json`; `required`, `nullable`, `unique`, `min`, `max`, `max_len`, `enum`, `default` |
| Casos de uso | `Create`, `Get`, `List`; outro nome é erro explícito |
| Paginação | `cursor` (default) — keyset por PK |
| Idempotência | `none`/`recommended`; `required` é rejeitado (exigiria tabela de chaves) |
| Adapters | `memory` e `postgres` (postgres exige serviço no modo `full`) |
| Testes | domain, application, http e integration (build tag) |

Regras que o gerador aplica para manter o guia honesto:

- `created_at` e `updated_at` são `ServerManaged`: preenchidos no caso de uso
  com `clock.Now().UTC()`, fora de `CreateInput`, sem validação de obrigatório.
- `required` em `int64`/`bool` vira apenas `NOT NULL`; não há rejeição de zero
  porque zero é valor válido. A validação `min`/`max` cobre a faixa.
- `http.path` não inclui `/api/`: o prefixo versionado é aplicado uma vez em
  `http.Mount`.
- Nome `ping` é reservado ao exemplo do scaffold; rotas duplicadas entre
  features são rejeitadas antes de escrever qualquer arquivo.
- `time` sem `nullable` vira coluna `NOT NULL`; `required` controla apenas a
  rejeição do zero value. Para um timestamp realmente opcional, use
  `"nullable": true`.

Arquivos gerados carregam o cabeçalho
`Code generated by new-feature.sh ...; DO NOT EDIT.`. O gerador só sobrescreve
arquivo com esse marcador (ou com `--force`); migrations aplicadas nunca são
reescritas. O estado fica em `.scaffold/features/<name>.json` (cópia do
descritor) e `<name>.state.json` (migration, arquivos e sha256), o que torna a
regeneração idempotente. `--dry-run` mostra o plano sem escrever.

### 14.4 Documentação gerada

O scaffold e o gerador de feature produzem a documentação do serviço em
`docs/`, sempre no mesmo comando que muda o código. A estrutura é um hub com
subarquivos curtos e linkados, não um arquivo grande:

```text
docs/
├── README.md          # hub de navegação (gerado)
├── estrutura.md       # diretório → responsabilidade → pode importar (gerado)
├── dominio.md         # catálogo de agregados (gerado)
├── api.md             # rotas, erros e contratos (gerado)
├── dados.md           # tabelas, migrations e transações (gerado)
├── configuracao.md    # variáveis de ambiente (gerado)
├── features/<name>.md # um doc por feature (gerado)
├── visao-geral.md     # curado, criado uma vez e nunca sobrescrito
├── arquitetura.md     # curado
├── operacao.md        # curado
├── testes.md          # curado
└── decisoes.md        # curado (ADRs)
```

As regras de documentação são normativas:

```text
DOC1  docs/README.md é o hub: todo documento é alcançável a partir dele.
DOC2  Gerado tem cabeçalho "Code generated"; curado não tem. Nunca edite um
      arquivo gerado: mude o descritor/template e regere. Curado nunca é
      sobrescrito pelo gerador.
DOC3  Um assunto por arquivo e nenhum arquivo gigante. Se um doc passar de
      ~200 linhas ou acumular dois assuntos, divida e linke no hub.
DOC4  Todo link é relativo e validado ao final de cada geração. Link quebrado
      falha o comando, como teste quebrado.
DOC5  Documentação é regerada no mesmo comando que muda o código
      (new-go-service.sh, new-feature.sh). Doc que depende de disciplina
      manual apodrece.
DOC6  Fonte de verdade não se duplica: catálogo de agregados, rotas e tabelas
      vêm do descritor; prosa e decisões ficam nos docs curados. Se a prosa
      repetir a tabela, a tabela vence.
```

Idioma: prosa em português (o vault é PT-BR), identificadores de código em
inglês, como no restante do guia.

O gerador de docs é
[`scripts/docgen/`](./scripts/docgen/) e pode ser rodado isolado:

```bash
# a partir da raiz do vault; ajuste o caminho do serviço
(cd Knowledges/scripts/docgen && go run . \
  --service ../../../services/task-service \
  --templates ../templates/go-service/docs)
```

Sem `--templates`, só os docs gerados são atualizados; os curados existentes
ficam intactos.

### 14.5 Evoluir o template

- Edite os arquivos em `scripts/templates/go-service/` mantendo os placeholders
  `__SERVICE__`, `__MODULE__` e `__GO_VERSION__`.
- O nome do diretório `cmd/__SERVICE__` é substituído no caminho pelo script.
- Ao adicionar ou renomear arquivo, atualize o
  [manifesto](./scripts/templates/go-service/template.manifest.tsv) e a tabela
  de 14.2 na mesma mudança.
- Templates de docs curados ficam em
  `scripts/templates/go-service/docs/*.md.tmpl`; use apenas os quatro
  placeholders que o docgen substitui.
- Depois de alterar, valide a matriz inteira em diretório temporário:

```bash
tmp="$(mktemp -d)"
for mode in minimal example full; do
  ./Knowledges/scripts/new-go-service.sh demo example.com/demo \
    --dir "$tmp/$mode" --mode "$mode"
done
```

### 14.6 Fluxo assistido (agente e skill)

Este guia é operado por um agente especializado, configurado no próprio vault:

| Artefato | Caminho | Papel |
|---|---|---|
| Agente | [`.opencode/oh-my-opencode-slim.json`](../.opencode/oh-my-opencode-slim.json) | registra `go-artifact-builder` e quando o Orchestrator deve delegar |
| Prompt | [`.opencode/oh-my-opencode-slim/go-artifact-builder.md`](../.opencode/oh-my-opencode-slim/go-artifact-builder.md) | postura do especialista: fonte de verdade, geração em vez de escrita manual, limites |
| Skill | [`.opencode/skills/go-artifact-flow/SKILL.md`](../.opencode/skills/go-artifact-flow/SKILL.md) | procedimento: modo do scaffold, descritor, gerador, docs, validação e DoD |

O agente não fixa modelo (`inheritModelFrom: "orchestrator"`), então acompanha o
preset ativo. A ordem do fluxo é a das seções anteriores: 14.1 → 14.3 → 14.4 →
13. A skill é a lista de comandos e checagens; o guia continua sendo a regra.

Se o plugin `oh-my-opencode-slim` não estiver ativo, os mesmos passos funcionam
manualmente — os scripts são a interface, o agente é conveniência.

Um exemplo real de execução, com os defeitos que o fluxo revelou e as correções
aplicadas, está em
[`relatorios/2026-10-31-exemplo-order-service.md`](./relatorios/2026-10-31-exemplo-order-service.md)
(serviço `services/order-service`, feature `invoice`).

---

## 15. Referências

| Documento | Papel |
|---|---|
| [`17. Estrutura de pastas`](../Application/spec/task-service/17-estrutura-de-pastas.md) | layout e regras de dependência do Task Service |
| [`11. API REST`](../Application/spec/task-service/11-api-rest.md) | contratos, erros, layout de handlers |
| [`06. Casos de uso`](../Application/spec/task-service/06-casos-de-uso.md) | entradas, efeitos transacionais e portas |
| [`19. Testes e critérios de aceite`](../Application/spec/task-service/19-testes-e-criterios-de-aceite.md) | estratégia de teste por camada |
| [`18. Operação`](../Application/spec/task-service/18-operacao.md) | config, migrations, shutdown, deploy |
| [`2. Decisões arquiteturais transversais`](../Application/docs/2.%20Decis%C3%B5es%20arquiteturais%20transversais.md) | Clean Architecture + Hexagonal, monorepo |
| [`decisions/`](../Application/spec/decisions/README.md) | ADRs que prevalecem sobre este guia |
