# Testes

Duas suítes, com papéis que não se sobrepõem.

| | Vitest (unidade) | Playwright (ponta a ponta) |
|---|---|---|
| Cobre | função pura: validação, conversão de payload, cálculo de data, regra de tela sem DOM | a tela inteira, com o backend de verdade |
| Onde | `tests/unit/`, espelhando `src/` | `tests/e2e/`, um arquivo por fluxo |
| Precisa de backend | não | **sim** |
| Roda no CI | sim (`ci.yml`, `deploy.yml`, `buildspec.yml`) | não — localmente, antes de subir |
| Demora | segundos | minutos |

Se uma regra dá para afirmar sem navegador, ela é teste de unidade. E2E é caro
e fica para o que só existe com tudo ligado: rota protegida, formulário que
grava, resposta do servidor chegando na tela.

---

## Unidade (Vitest)

```bash
pnpm test           # uma vez
pnpm test:watch     # enquanto edita
```

- **Ambiente `node`, sem DOM** (`vitest.config.ts`). O que se testa aqui é
  função: por isso a regra de tela mora em módulo puro (`appointmentForm.ts`,
  `stageMoves.ts`, `review.ts`…) e o componente só desenha.
- **Caminho espelhado:** `src/lib/format.ts` ↔ `tests/unit/lib/format.test.ts`.
  Import sempre pelo alias `@/`.
- **Convenções viram teste** em `tests/unit/conventions/`: hoje, nenhum
  `data-testid` sem justificativa escrita (ver [Localizadores](#localizadores)).

## Ponta a ponta (Playwright)

### Instalação (uma vez)

```bash
pnpm install
pnpm exec playwright install chromium     # Linux: acrescente --with-deps
```

Só o Chromium: três navegadores triplicariam o tempo sem afirmar nada a mais
sobre regra de negócio.

### Credenciais

**Nunca em arquivo versionado** — `env/local.env` e `env/development.env` são
versionados. O caminho é `env/e2e.local.env`, ignorado pelo git e carregado
sozinho pelo `playwright.config.ts`:

```bash
cp env/e2e.example.env env/e2e.local.env   # e preencha
```

| Variável | |
|---|---|
| `E2E_USER` / `E2E_PASSWORD` | conta **ADMIN** — obrigatória |
| `E2E_USER_STAFF` / `E2E_PASSWORD_STAFF` | conta **STAFF**. Sem ela, `roles` e `restricted-finance` se pulam com aviso |
| `E2E_TENANT_ID` | UUID do escritório, para a limpeza pela API (sem ele, vai o slug) |

Variável exportada no shell (ou secret do CI) vence o arquivo. São as mesmas
contas da suíte de API do backend (`api-tests/.env`):

```bash
set -a; . ../taniamelo-advocacia-backend/api-tests/.env; set +a
export E2E_USER="$API_LOGIN" E2E_PASSWORD="$API_PASSWORD"
export E2E_USER_STAFF="$API_LOGIN_STAFF" E2E_PASSWORD_STAFF="$API_PASSWORD_STAFF"
```

### Rodando

```bash
pnpm test:e2e                          # backend local (env/local.env)
pnpm test:e2e:dev                      # instância de desenvolvimento na AWS
pnpm test:e2e tests/e2e/agenda.spec.ts # um arquivo
pnpm test:e2e:ui                       # modo interativo, para escrever teste
pnpm exec playwright show-report       # relatório da última execução (trace e vídeo da falha)
```

O Playwright sobe o `next dev` na **3001** e o derruba no fim. Um `pnpm dev` já
de pé na 3001 é **reaproveitado** — com o ambiente dele, não o do script que
você chamou. Se ele aponta para outro backend, é contra ele que a suíte roda;
na dúvida, derrube-o antes. Contra uma aplicação servida em outro lugar (o
build estático, por exemplo: `pnpm build && pnpm preview`), defina
`E2E_BASE_URL` e o Playwright não sobe servidor.

### Contra qual escritório

Os dois alvos usam o escritório `tania`, que nessas instâncias é **massa
semeada** (`db/mock-data/seed_tenant_tania.sql` do backend: 125 clientes
fictícios). A suíte **escreve**: cada teste cria o que precisa com a marca
`[e2e]` (`TAG`) e apaga no fim, pela API. Nenhum teste edita ou exclui
registro que já existia. No dia em que a instância servir dado real, o alvo
passa a ser outro escritório — muda o `env/*.env`, não os testes.

### O que existe

| Arquivo | Prova |
|---|---|
| `auth.setup.ts` | login uma vez; grava `tests/e2e/.auth/user.json` para os demais |
| `smoke` | guarda de rota e as páginas principais renderizando sem erro — se falha, o problema é ambiente |
| `agenda` | agendar, aviso de conflito enquanto se digita, aviso de sucesso |
| `client-sheet` | ficha: vista não edita; o PUT de substituição não apaga o que a tela não mostra; CPF barrado; um aviso só no Salvar; abrir e baixar arquivo com o token |
| `clients-crud` | cadastrar, editar e excluir pela tela |
| `clients-list` | contagem na paginação, copiar CPF, cartão de etapa (pular, voltar, avançar), selo e filtro de isenção |
| `clients-board-situation` | mudar a situação na lista |
| `situation-trail` | a trilha diz de onde para onde, marca "voltou" e nomeia quem mudou |
| `signup-address-batch` | dois endereços saem numa requisição (`/addresses/batch`) |
| `signup-review` | o que falta fica na barra de ações; a Revisão mostra o que foi digitado e "Editar" volta à aba |
| `disability-crud` | a seção de deficiência aparece pelo benefício, a pergunta de sexo, a chave "se mantém", o tempo convertido |
| `inss-password` | a ficha não busca a senha sozinha; revelar audita; copiar; salvar sem tocar não apaga |
| `payments-crud` | parcela a receber: lançar, editar, confirmar o crédito, excluir |
| `wallet-crud` | Carteira: entrada e saída, lançar, editar, excluir |
| `filters-and-views` | filtros por schema, carga sob demanda das abas, as visões de Relatórios |
| `profile` | "Meus dados" e a troca de senha |
| `roles` | o que o atendente não vê, com a contraprova do admin |
| `restricted-finance` | financeiro some do menu de quem não é admin; a URL digitada explica |
| `session-expired` | token vencido leva ao login, sem enxurrada de toasts |
| `login-throttle` | o 429 vira "tente novamente em X" |
| `no-offline-calls` | nenhuma tela chama rota pausada no ambiente |

Auxiliares: `helpers.ts` (datas por segmento, `choose`, `openSection`, sessão
de STAFF, a senha do INSS) e `apiHelper.ts` (contexto de API com a sessão
gravada, CPF válido, `TAG`, `integrationPaused`).

### Convenções

- **Serial, um worker.** Os testes gravam num backend compartilhado; em
  paralelo, dois disputariam o mesmo horário na agenda e falhariam pela regra
  de conflito — que é uma regra sob teste.
- **Massa pela API, limpeza pela API** (`beforeAll`/`afterAll`). O teste é da
  tela que ele prova, não do cadastro inteiro; e a limpeza precisa funcionar
  mesmo quando o teste quebra no meio.
- **Nome único** (`Date.now()`) em tudo que é criado.
- **Busca com espera de digitação:** depois de digitar na busca, espere a lista
  **filtrada** (`toHaveCount(1)` na lista inteira), e não só a linha — o
  registro novo também está no topo da lista sem filtro, e a busca recarrega
  a lista depois, desmontando o que o teste abriu.
- **Abas do cadastro não deixam sair com obrigatório pendente:** preencha o
  Atendimento (benefício e situação) antes de trocar de aba.
- Campo de data do React Aria não aceita `fill`: cada parte é um
  `spinbutton` — `fillDateSegments`.

### Localizadores

Ordem de preferência:

1. **Papel e nome acessível** — `getByRole("button", { name: "Revelar senha" })`.
2. **Texto, placeholder, rótulo** — `getByText`, `getByPlaceholder`,
   `getByLabel` (com o cuidado abaixo).
3. **`data-testid`** — só quando 1 e 2 não alcançam, com o porquê escrito ao
   lado. O teste `tests/unit/conventions/locators.test.ts` falha com
   `data-testid` novo sem justificativa na lista dele.

Um localizador semântico afirma o que a pessoa vê; quando o rótulo muda, o
teste **deve** falhar — o produto mudou. Um `data-testid` sobrevive a "Revelar
sneha" e deixa o defeito chegar ao usuário.

**Aqui `getByRole` vem antes de `getByLabel`.** O `Select` do HeroUI renderiza
um `<select>` espelho escondido cujo "rótulo" é a concatenação das opções —
"Aposentadoria por in**capacidade**…" contém "cidade", e `getByLabel("Cidade")`
casa com dois elementos. `getByRole` respeita `aria-hidden` e nunca alcança o
espelho. Com duas abas de endereço no DOM, filtre a visível:
`getByRole("textbox", { name: "Cidade" }).filter({ visible: true })`.

Legítimo para `data-testid`: elemento sem papel nem nome que não deveria
ganhar um só para o teste (contêiner de gráfico), ou o caso em que o texto
**é** o dado sob teste.

### Escrevendo teste com o Playwright MCP (opcional)

O servidor MCP do Playwright dá ao assistente de código um navegador: abrir a
página, tirar o *snapshot* da árvore de acessibilidade, clicar. Serve para
**escrever e depurar** teste — responde em segundos "como esta tela aparece
para uma consulta por papel e rótulo?". Não serve para rodar a suíte: o que
protege o projeto é o que está em `tests/e2e/`.

Para usar, crie à mão um `.mcp.json` na raiz (configuração de MCP é
executável; ferramenta nenhuma deve plantá-la):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--isolated",
               "--allowed-origins", "http://localhost:3001;http://localhost:8080"]
    }
  }
}
```

Autenticado: acrescente `"--storage-state", "tests/e2e/.auth/user.json"` (rode
o projeto `setup` antes, para o arquivo existir). Snapshot logo após navegar
pega a página antes da hidratação — papel e nome do usuário vêm do
`localStorage` num efeito; espere um elemento antes de concluir que algo
sumiu.

## Ainda não coberto

Por valor, não por esforço:

1. Erros de validação **entre abas** no cadastro (o caminho feliz está em
   `clients-crud`).
2. Substituir/cancelar na modal de conflito da agenda.
3. Janela de desfazer: desfazer de fato cancela a requisição.
4. Componentes com DOM em teste de unidade (hoje só módulo puro): pediria
   `jsdom` e Testing Library.
