# Documento Técnico: Testes Automatizados em JavaScript e TypeScript

Este documento estabelece as diretrizes, conceitos e ferramentas recomendadas para a implementação de testes automatizados em aplicações utilizando o ecossistema JavaScript e TypeScript.

---

## 1. Conceitos Fundamentais

### A Pirâmide de Testes
A estratégia de testes deve seguir o modelo da Pirâmide de Testes, garantindo eficiência, baixo custo de manutenção e feedback rápido:

* **Testes Unitários:** Base da pirâmide. Validam a menor unidade de código isolável (funções, classes ou componentes) sem dependências externas.
* **Testes de Integração:** Camada intermediária. Verificam a comunicação entre múltiplas unidades de código, módulos, ou interações com bancos de dados e APIs locais.
* **Testes End-to-End (E2E):** Topo da pirâmide. Simulam a jornada completa do usuário final na interface (Front-End) comunicando-se com todos os serviços reais (Back-End).

```
     /\
    /  \     E2E (Poucos, lentos, caros)
   /----\
  /      \   Integração (Moderados)
 /--------\
/          \ Unitários (Muitos, rápidos, baratos)
------------
```

### O Padrão AAA (Arrange, Act, Assert)
Todos os blocos de teste devem ser estruturados seguindo rigorosamente as três etapas:

1. **Arrange (Organizar):** Configuração do cenário, inicialização de variáveis, instanciação de classes e definição de comportamentos de dublês de teste (mocks).
2. **Act (Agir):** Execução estrita do método ou função sob teste.
3. **Assert (Afirmar):** Validação dos resultados obtidos contra os resultados esperados através de asserções.

---

## 2. Técnicas Avançadas e Boas Práticas

### Tipagem Estrita em Testes (TypeScript)
No ecossistema TypeScript, os testes devem reforçar a segurança do código, eliminando brechas estruturais.

* **Proibição do tipo `any`:** O uso de `any` em arquivos de teste camufla erros de regressão. Se um contrato mudar na produção, o teste deve quebrar estaticamente durante a compilação.
* **Utilização de Utility Types:** Para simular payloads parciais sem violar tipagens, utilize utilitários nativos do TypeScript:

```typescript
// Exemplo de payload parcial tipado de forma segura
const mockUser: Partial<User> = {
  id: "123",
  email: "test@example.com"
};
```

### Dublês de Teste (Test Doubles)
Para isolar a unidade sob teste de efeitos colaterais externos (I/O, APIs, Banco de Dados), utilizam-se os seguintes dublês:

* **Stubs:** Fornecem respostas pré-programadas para chamadas feitas durante o teste.
* **Spies:** Envolvem a função real para registrar estatísticas de execução (quantas vezes foi chamada, com quais argumentos).
* **Mocks:** Objetos pré-configurados com expectativas que definem exatamente o comportamento e as chamadas que devem receber.

### Isolamento e Ciclo de Vida
Testes nunca devem depender do estado residual de testes anteriores. O ambiente de execução deve ser resetado a cada bloco utilizando os hooks de ciclo de vida do framework:

```typescript
describe('UserService', () => {
  beforeEach(() => {
    // Inicializa instâncias limpas antes de cada teste
  });

  afterEach(() => {
    // Limpa mocks e temporizadores para evitar vazamento de estado
    vi.clearAllMocks(); 
  });
});
```

---

## 3. Ecossistema e Frameworks Recomendados

Abaixo encontra-se a matriz de ferramentas recomendadas para o desenvolvimento moderno em JS/TS:

| Categoria | Ferramenta | Descrição | Principais Casos de Uso |
| :--- | :--- | :--- | :--- |
| **Test Runner & Assertion** | **Vitest** | Framework de testes nativo para Vite. Extremamente rápido e compatível com a API do Jest. | Projetos SPA (React, Vue) modernos e APIs Node.js rápidas. |
| **Test Runner & Assertion** | **Jest** | O ecossistema de testes mais popular do mercado, robusto e com ampla comunidade. | Legados consolidados e grandes monólitos Node.js. |
| **Component Testing** | **Testing Library** | Conjunto de utilitários focado em testar comportamento de componentes simulando o usuário. | Testes unitários/integração no React, Vue e Angular. |
| **End-to-End (E2E)** | **Playwright** | Ferramenta moderna da Microsoft para automação de browsers, rápida e com suporte multi-browser nativo. | Testes de fluxos críticos de ponta a ponta e testes visuais. |
| **End-to-End (E2E)** | **Cypress** | Framework E2E focado na experiência do desenvolvedor com interface visual rica para depuração. | Automação e testes funcionais complexos em aplicações web. |

---

## 4. Guia de Implementação (Exemplo Prático)

Demonstração prática de um teste unitário utilizando **TypeScript**, **Vitest** e o padrão **AAA**:

```typescript
// processador-pagamento.ts
export interface PaymentGateway {
  charge(amount: number): boolean;
}

export class OrderProcessor {
  constructor(private gateway: PaymentGateway) {}

  process(amount: number): string {
    if (amount <= 0) {
      throw new Error('Valor inválido');
    }

    const isSuccess = this.gateway.charge(amount);
    return isSuccess ? 'PAID' : 'DECLINED';
  }
}
```

```typescript
// processador-pagamento.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderProcessor, PaymentGateway } from './processador-pagamento';

describe('OrderProcessor', () => {
  let mockGateway: PaymentGateway;
  let sut: OrderProcessor; // System Under Test (SUT)

  beforeEach(() => {
    // Arrange: Configurando o mock com tipagem estrita da interface
    mockGateway = {
      charge: vi.fn()
    };
    sut = new OrderProcessor(mockGateway);
  });

  it('deve processar o pagamento com sucesso quando o gateway aprovar', () => {
    // Arrange (específico do cenário)
    vi.mocked(mockGateway.charge).mockReturnValue(true);
    const amount = 100;

    // Act
    const result = sut.process(amount);

    // Assert
    expect(result).toBe('PAID');
    expect(mockGateway.charge).toHaveBeenCalledWith(amount);
    expect(mockGateway.charge).toHaveBeenCalledTimes(1);
  });

  it('deve lançar um erro se o valor for menor ou igual a zero', () => {
    // Arrange
    const invalidAmount = 0;

    // Act & Assert
    expect(() => sut.process(invalidAmount)).toThrow('Valor inválido');
    expect(mockGateway.charge).not.toHaveBeenCalled();
  });
});
```

---

## 5. Critérios de Aceitação e Cobertura (Coverage)

* **Foco em Comportamento, não em Linhas:** Buscar 100% de cobertura de código (*code coverage*) cegamente induz a testes ruins que testam apenas detalhes de implementação. Priorize a cobertura de **caminhos críticos e regras de negócio**.
* **Métricas de Qualidade recomendadas:**
    * Cobertura Global mínima sugerida: **80% de Branches** (ramificações condicionais).
    * Mutabilidade: Testes devem falhar se o código de produção for alterado sutilmente (Testes de Mutação).