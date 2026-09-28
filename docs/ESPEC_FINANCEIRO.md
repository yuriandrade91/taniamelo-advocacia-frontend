# Especificação — domínio financeiro

> ## ⚠️ Correção de premissa — 04/09/2026
>
> Esta especificação foi escrita assumindo que **Pagamentos** eram os
> honorários que o cliente deve ao escritório. **Está errado.**
>
> - **Pagamentos** (`client_payments`) é o que o **INSS paga ao cliente**:
>   atrasados da concessão, benefício mensal, parcela de acordo. É dinheiro do
>   cliente e **não passa pelo caixa do escritório**.
> - **Honorário** — a receita do escritório — não tem tabela nenhuma hoje.
>
> A confusão não é descuido de leitura: as duas coisas têm exatamente o mesmo
> formato — um valor, com vencimento, data de pagamento e um cliente ao lado.
> `client_payments` serve às duas de forma igual, e nada na tabela as
> distingue. O significado vem de quem escreve nela.
>
> **O que isso quebrou enquanto passou despercebido:** a Carteira somava
> `GET /payments/summary` como entrada do escritório. Ou seja, mostrava o
> dinheiro dos clientes como faturamento — inflado por um fator que depende do
> tamanho dos atrasados, com saldo plausível, positivo e falso. Já corrigido no
> frontend: a Carteira não consulta mais aquele resumo.
>
> As seções abaixo que falam de `/payments` como "recebimentos do escritório"
> continuam válidas **como contrato de rota** — os campos e os baldes não
> mudam. O que muda é o que os números significam: são valores a receber do
> INSS, não cobranças. A Parte 4 é nova e trata da receita de verdade.

Cobre as três telas do frontend:

| tela | pergunta | recorte de data | rotas |
|---|---|---|---|
| **Pagamentos** (`/pagamentos`) | o que os clientes têm a receber do INSS | previsão de crédito (`dueDate`) | `/payments` |
| **Carteira** (`/carteira`) | como está o caixa do escritório | **pagamento** | `/revenues` + `/expenses` |

---

## 0. Competência × caixa — leia antes do resto

As duas telas consultam os mesmos resumos com **recortes de data diferentes**, e
confundi-los é o erro mais caro desta especificação:

- `dueFrom`/`dueTo` recortam por **vencimento**. Responde "o que vence no mês".
- `paidFrom`/`paidTo` recortam por **data de pagamento**. Responde "o que entrou
  e saiu do caixa no mês".

Somar recebimento por vencimento e apresentar como "entrou" conta dinheiro que
não chegou. O erro é silencioso — os números parecem plausíveis — e só aparece
quando alguém confere com o extrato.

**Os dois pares são mutuamente exclusivos numa mesma chamada.** Receber ambos
deve responder **400**, e não escolher um por conta própria.

---

## `GET /api/v1/payments` (recebimentos consolidados)

- **Status:** especificado, **não implementado**. A tela `/pagamentos` no
  frontend já consome este contrato e mostra estado vazio explícito enquanto a
  rota não existe.
- **Motivação:** hoje pagamento só é acessível por cliente
  (`/clients/{clientId}/payments`). A pergunta "quanto está atrasado no
  escritório" não tem como ser respondida sem abrir cliente por cliente.
- **Alternativa descartada:** agregar no frontend. Com 125 clientes seriam 126
  requisições por carregamento, e o custo cresce com a base. Não é otimização
  prematura evitar isso — é evitar um N+1 sobre HTTP.

---

## 1. Rota e escopo

```
GET /api/v1/payments
GET /api/v1/payments/summary
```

Top-level e tenant-scoped, como `/appointments`. **Não** fica sob `/clients`:
a visão é do escritório. O `X-Tenant-Id` já é injetado pelo `axiosService` no
front e resolvido pelo `MultiTenantFlywayMigrator`/filtro no back — nada novo
aqui.

Ambas respeitam `deleted_at IS NULL` (o `client_payments` tem soft delete) e
só enxergam pagamentos de clientes não excluídos.

## 2. `GET /api/v1/payments` — lista

### Query params

| param | tipo | observação |
|---|---|---|
| `pageNumber` | int, default 1 | 1-based, como o resto da API |
| `pageSize` | int, default 10 | |
| `searchTerm` | string | nome do cliente **ou** descrição do pagamento, sem acento, case-insensitive |
| `status` | lista | repetido na query (`status=PENDENTE&status=PAGO`), nome do enum ou label |
| `paymentMethod` | lista | idem |
| `dueFrom` / `dueTo` | `yyyy-MM-dd` | intervalo de **vencimento**, inclusivo |
| `clientId` | UUID | filtra um cliente específico |

> ⚠️ Listas repetidas **sem colchetes**. O front já manda nesse formato
> (`paramsSerializer: { indexes: null }` no `axiosService`); um
> `@RequestParam List<String>` do Spring lê exatamente assim. Foi o que já
> causou filtro silenciosamente ignorado em `/clients`.

Valor de enum desconhecido → **400** `INVALID_ENUM_VALUE`, igual ao
`parseEnumList` do `ClientController`.

### Ordenação

Padrão: `due_date ASC`, depois `created_at ASC`. O caso de uso principal é
cobrança — o que vence primeiro aparece primeiro.

### Resposta

Envelope padrão com paginação. Cada item é o `ClientPaymentResponseDTO` de
hoje **mais duas colunas do cliente**:

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "clientId": "uuid",          // novo
      "clientName": "Maria Aparecida da Silva",  // novo
      "description": "Honorários — entrada",
      "amount": 1500.00,
      "installmentNumber": 1,
      "installmentTotal": 3,
      "dueDate": "2026-03-12",
      "paidDate": null,
      "status": "Pendente",        // label (@JsonValue)
      "paymentMethod": "Pix",
      "notes": null,
      "overdue": true              // calculado no servidor
    }
  ],
  "pagination": { "pageNumber": 1, "pageSize": 10, "totalRecords": 47, "totalPages": 5, "hasNextPage": true, "hasPreviousPage": false },
  "success": true
}
```

`clientName` denormalizado na resposta é deliberado: sem ele a tela precisaria
de uma segunda consulta por linha para mostrar de quem é a cobrança — o N+1
mudaria de lugar, não sumiria.

**`overdue` continua sendo calculado no servidor.** O front não recalcula com
`new Date()`: o relógio do navegador é do usuário, o do servidor é do sistema, e
duas fontes para "hoje" fazem a mesma linha aparecer vencida numa tela e em dia
noutra.

## 3. `GET /api/v1/payments/summary` — totais

Aceita `dueFrom`, `dueTo` e `clientId` (os mesmos recortes da lista). **Não**
aceita paginação — é justamente o que ele resolve: somar a página traria o
total de 10 linhas, não do período.

```jsonc
{
  "data": {
    "overdueAmount": 4500.00,  "overdueCount": 3,
    "upcomingAmount": 12000.00,"upcomingCount": 8,
    "paidAmount": 30500.00,    "paidCount": 21,
    "totalAmount": 47000.00
  },
  "success": true
}
```

### Os três baldes são disjuntos

| balde | regra |
|---|---|
| `overdue` | `status = 'Pendente'` **e** `due_date < CURRENT_DATE` |
| `upcoming` | `status = 'Pendente'` **e** `due_date >= CURRENT_DATE` |
| `paid` | `status = 'Pago'` |

`Cancelado` fica **fora dos três** e fora do `totalAmount`.

`totalAmount` = `overdueAmount + upcomingAmount + paidAmount`. É redundante de
propósito: se algum dia a soma não fechar, a regra divergiu entre as duas
pontas, e é melhor descobrir por uma conta que não bate do que por um relatório
errado.

O frontend classifica cada linha com a **mesma** regra
(`components/payments/paymentBuckets.ts`, testado). Se mudar aqui, muda lá.

## 4. Implementação sugerida

Nada de entidade nova. `client_payments` já tem tudo, inclusive os índices que
importam:

```sql
CREATE INDEX ... ON client_payments (client_id) WHERE deleted_at IS NULL;
CREATE INDEX ... ON client_payments (due_date)  WHERE deleted_at IS NULL;
```

O índice por `due_date` já serve à ordenação e ao filtro de período.

1. **`PaymentController`** novo, `@RequestMapping("/api/v1/payments")` — no
   espírito do `AppointmentController`, que também é top-level e tenant-scoped.
2. **`PaymentSearchParams`** no molde de `AppointmentSearchParams`.
3. **`PaymentSpecification`** para os filtros dinâmicos, como
   `AppointmentSpecification`, com `join` em `client` para o `searchTerm` por
   nome e para trazer `clientName`.
4. **`summary`** como uma consulta de agregação só, com `CASE WHEN` para os
   três baldes — não três consultas, e nem carregar tudo para somar em Java.

```sql
SELECT
  SUM(CASE WHEN status = 'Pendente' AND due_date <  CURRENT_DATE THEN amount ELSE 0 END) AS overdue_amount,
  COUNT(*) FILTER (WHERE status = 'Pendente' AND due_date <  CURRENT_DATE)               AS overdue_count,
  SUM(CASE WHEN status = 'Pendente' AND due_date >= CURRENT_DATE THEN amount ELSE 0 END) AS upcoming_amount,
  COUNT(*) FILTER (WHERE status = 'Pendente' AND due_date >= CURRENT_DATE)               AS upcoming_count,
  SUM(CASE WHEN status = 'Pago' THEN amount ELSE 0 END)                                  AS paid_amount,
  COUNT(*) FILTER (WHERE status = 'Pago')                                                AS paid_count
FROM client_payments
WHERE deleted_at IS NULL;
```

## 5. Fora de escopo

**Despesas do escritório.** Não existe tabela, DTO nem service — seria o
domínio `financial` do ADR-0003, com migration própria. Esta especificação
cobre só recebimentos, que é o que o dado de hoje permite responder.

**Criar/editar pagamento por aqui.** Continua em
`/clients/{clientId}/payments`: um pagamento pertence a um cliente, e a rota
agregada é de leitura. A tela consolidada leva para a ficha do cliente quando
for preciso editar.


---

# Parte 2 — Despesas do escritório (`/api/v1/expenses`)

- **Status:** **nada existe.** Nem tabela, nem migration, nem DTO, nem service.
  É o domínio `financial` que o ADR-0003 previa.
- A tela `/carteira` já consome este contrato e mostra explicitamente que a
  metade das saídas não tem servidor — em vez de exibir saldo zero. Zero é um
  número, e número errado em tela financeira é pior que tela vazia.

## 6. Migration

```sql
CREATE TABLE office_expenses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description    VARCHAR(255)  NOT NULL,
    amount         NUMERIC(12,2) NOT NULL,
    category       VARCHAR(40),
    supplier       VARCHAR(255),
    due_date       DATE          NOT NULL,
    paid_date      DATE,
    status         VARCHAR(20)   NOT NULL DEFAULT 'Pendente',
    payment_method VARCHAR(20),
    notes          TEXT,
    created_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT now(),
    updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    updated_at     TIMESTAMP,
    deleted_at     TIMESTAMP
);

CREATE INDEX idx_office_expenses_due  ON office_expenses (due_date)  WHERE deleted_at IS NULL;
CREATE INDEX idx_office_expenses_paid ON office_expenses (paid_date) WHERE deleted_at IS NULL;
```

Vai em `db/migration/tenant/` — despesa é do escritório, e escritório é o
tenant. Sem `client_id`: despesa de escritório não pertence a cliente. Custa
processual adiantada por um cliente específico é **receita a reembolsar**, não
despesa — e isso é `client_payments`.

O índice por `paid_date` existe por causa do regime de caixa: sem ele, o
resumo da Carteira varre a tabela toda todo mês.

## 7. Enum de categoria

Não existe no Java. O vocabulário proposto está em
`src/enums/expenseCategory/ExpenseCategory.ts`, no mesmo formato dos demais
(`@JsonValue` no label, `@JsonCreator` aceitando nome ou label):

`ALUGUEL`, `PESSOAL`, `CUSTAS_PROCESSUAIS`, `SOFTWARE`, `MARKETING`,
`CONTABILIDADE`, `IMPOSTOS`, `MATERIAL`, `DESLOCAMENTO`, `OUTROS`.

**Status e forma de pagamento reaproveitam `PaymentStatus` e `PaymentMethod`**
que já existem. Uma despesa também está Pendente/Paga/Cancelada e também sai
por Pix. Criar um segundo par de enums com os mesmos valores só daria duas
listas para manter sincronizadas.

## 8. Rotas

```
GET    /api/v1/expenses           lista paginada
GET    /api/v1/expenses/summary   totais do período
POST   /api/v1/expenses           lança despesa
PUT    /api/v1/expenses/{id}      substitui
DELETE /api/v1/expenses/{id}      soft delete
```

Filtros da lista: `searchTerm` (descrição ou fornecedor), `category[]`,
`status[]`, `dueFrom`/`dueTo` **ou** `paidFrom`/`paidTo`, `pageNumber`,
`pageSize`. Listas repetidas sem colchetes, como em `/clients` e `/payments`.

## 9. `GET /api/v1/expenses/summary`

Mesmos três baldes disjuntos de `/payments/summary` (`overdue`, `upcoming`,
`paid`; `Cancelado` fora dos três), mais a quebra por categoria:

```jsonc
{
  "data": {
    "overdueAmount": 1200.00, "overdueCount": 2,
    "upcomingAmount": 3400.00,"upcomingCount": 5,
    "paidAmount": 8900.00,    "paidCount": 14,
    "totalAmount": 13500.00,
    "byCategory": [
      { "category": "Aluguel e condomínio", "amount": 4200.00 },
      { "category": "Salários e encargos",  "amount": 3100.00 }
    ]
  },
  "success": true
}
```

`byCategory` cobre **apenas as despesas pagas** no período — é o que alimenta
o gráfico de composição do gasto. Incluir o que ainda não foi pago mudaria o
gráfico de "no que gastamos" para "no que pretendemos gastar", que é outra
pergunta.

## 10. Saldo: por que não há `/wallet/summary`

O saldo é `entradas − saídas`, composto no front a partir dos dois resumos
(`components/wallet/walletOverview.ts`, testado). Um terceiro endpoint para
calcular uma subtração seria superfície de API sem regra própria.

Isso muda **se** entrar reconciliação bancária, conta a conta ou saldo
acumulado entre meses — aí passa a haver estado no servidor, e o recurso
se justifica.

## 11. Ordem sugerida de implementação

1. `/payments` + `/payments/summary` — dado já existe, destrava a tela de
   Pagamentos inteira e metade da Carteira.
2. `paidFrom`/`paidTo` no summary — poucas linhas, destrava as **entradas** da
   Carteira.
3. `office_expenses` completo — é o trabalho de verdade, e o único que precisa
   de migration.

---

# Parte 3 — Séries mensais para os gráficos

```
GET /api/v1/payments/timeline?from&to&basis=due|paid
GET /api/v1/expenses/timeline?from&to&basis=due|paid
```

`from`/`to` em `yyyy-MM-dd`; a resposta agrega por mês.

```jsonc
{
  "data": [
    { "month": "2026-04", "overdueAmount": 0, "upcomingAmount": 3200.00, "paidAmount": 5400.00 },
    { "month": "2026-05", "overdueAmount": 900.00, "upcomingAmount": 1500.00, "paidAmount": 7300.00 }
  ],
  "success": true
}
```

**Meses sem movimento devem vir no array, zerados.** Omiti-los faz o gráfico
colar dois meses distantes lado a lado e sumir justamente com o mês vazio —
que costuma ser a informação.

`basis` escolhe a pergunta, com as mesmas regras da Parte 0:

- `due` (padrão) — agrupa por `due_date`. É o gráfico de **Pagamentos**:
  "quanto vence em cada mês e em que estado está".
- `paid` — agrupa por `paid_date`, e só o que foi pago. É o gráfico da
  **Carteira**: "quanto entrou e saiu em cada mês".

Com `basis=paid`, `overdueAmount` e `upcomingAmount` vêm zerados por
definição — o que foi pago não está atrasado nem a vencer. O front usa só
`paidAmount` nesse modo.

Uma consulta com `GROUP BY date_trunc('month', ...)` resolve as duas; os
índices por `due_date` e `paid_date` já previstos servem a elas.

## Por que não é o `summary` com um parâmetro a mais

O `summary` responde sobre **um** período e é o que alimenta os indicadores; a
timeline responde sobre **vários** e alimenta o gráfico. Espremer as duas numa
rota faria o formato de resposta mudar conforme o parâmetro — o tipo de API que
o cliente tipado não consegue descrever sem união discriminada.

---

# Parte 4 — Receita do escritório (`/api/v1/revenues`)

**Nada disto existe.** É a metade que faltava da Carteira, ao lado das
despesas.

## 12. Por que não reaproveitar `client_payments`

Porque o formato é quase igual — e é exatamente esse o risco. Gravar honorário
lá o tornaria indistinguível do dinheiro do INSS: mesmas colunas, mesma FK,
mesma cara. A tela de Pagamentos passaria a somar honorário como benefício do
cliente, e não haveria consulta capaz de separar depois. Uma coluna
`tipo` resolveria no papel e não na prática: o primeiro lançamento sem tipo, ou
com o tipo errado, contamina os dois relatórios ao mesmo tempo.

Tabela separada torna a confusão impossível por construção, que é o único
nível de garantia que vale em dado financeiro.

## 13. Migration sugerida

```sql
CREATE TABLE office_revenues (
    id                UUID PRIMARY KEY,
    description       VARCHAR(255) NOT NULL,
    amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date          DATE NOT NULL,
    paid_date         DATE,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    payment_method    VARCHAR(20),
    -- Opcional: nem toda receita vem de cliente (parecer avulso, reembolso).
    client_id         UUID REFERENCES clients(id),
    -- Quando o honorário é percentual do êxito, o client_payments de origem.
    -- É o que permite conferir "30% dos atrasados" contra o valor de fato.
    source_payment_id UUID REFERENCES client_payments(id),
    notes             TEXT,
    created_by        UUID,
    created_at        TIMESTAMPTZ NOT NULL,
    updated_by        UUID,
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
);
```

Rotas espelham `/expenses`: `GET /revenues`, `POST`, `PUT`, `DELETE`,
`GET /revenues/summary`, `GET /revenues/timeline` — mesmos query params, mesmos
três baldes disjuntos, mesma regra de competência × caixa.

## 14. O que ainda NÃO está decidido: o contrato de honorário

Os arranjos variam — percentual do êxito sobre os atrasados, valor fixo
parcelado, e outros. `office_revenues` descreve a receita **já apurada**; não
descreve o contrato que a origina.

Isso é modelo à parte (`fee_agreements`, ou nome equivalente), com regra
própria: qual o arranjo, sobre o que incide o percentual, quando a parcela
vence, o que acontece se o INSS pagar menos que o previsto. Só depois disso faz
sentido gerar receita automaticamente a partir de uma contemplação.

**Não implemente esse modelo a partir desta especificação** — ele precisa das
regras reais do escritório antes de virar tabela. `office_revenues` funciona
sem ele: enquanto não existir, a receita é lançada à mão.
