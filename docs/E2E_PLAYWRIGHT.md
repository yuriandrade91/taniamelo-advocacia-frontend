# Testes de ponta a ponta (Playwright)

Complementa o Vitest, não substitui.

| | Vitest | Playwright |
|---|---|---|
| O que cobre | função pura: validação, conversão de payload, cálculo de data | a tela inteira, com backend de verdade |
| Precisa de backend | não | **sim** |
| Onde ficam | `src/**/*.test.ts` | `e2e/**/*.spec.ts` |
| Quanto demora | segundos | dezenas de segundos |

A divisão é intencional: se uma regra dá para afirmar sem navegador, ela é
teste de unidade. E2E é caro e é para o que só existe com tudo ligado — rota
protegida, formulário que grava, resposta do servidor chegando na tela.

## Instalação (uma vez)

```bash
pnpm install
pnpm exec playwright install chromium
```

O segundo comando baixa o navegador (~150 MB) para o cache do Playwright
(`~/Library/Caches/ms-playwright` no macOS), fora do projeto. Só o Chromium:
rodar a suíte em três navegadores triplicaria o tempo sem afirmar nada a mais
sobre regra de negócio.

No Linux, acrescente `--with-deps` — lá o navegador depende de bibliotecas do
sistema que a máquina pode não ter. No macOS não é preciso.

## Credenciais

**Nunca em arquivo versionado.** `env/local.env` e `env/development.env` são
versionados; credencial ali vira credencial no histórico do git.

O caminho padrão é `env/e2e.local.env`, ignorado pelo git e carregado sozinho
pelo `playwright.config.ts`:

```bash
cp env/e2e.example.env env/e2e.local.env   # e preencha
```

Variável já exportada no shell (ou secret do CI) vence o arquivo. A alternativa,
sem arquivo, é exportar a cada sessão:

```bash
export E2E_USER='usuario.e2e'
export E2E_PASSWORD='...'

# Segundo usuário, com papel STAFF. Sem ele, os testes de papel e de
# financeiro restrito se PULAM com aviso — e o que eles provam (que a tela não
# oferece ao atendente um botão que só vai negá-lo) fica sem cobertura.
export E2E_USER_STAFF='atendente.e2e'
export E2E_PASSWORD_STAFF='...'

export E2E_TENANT_ID='...'   # opcional, só para a limpeza via API
```

Use um **usuário dedicado ao teste**, não a conta de alguém: a suíte cria,
cancela e exclui compromissos.

São as mesmas contas que a suíte de API do backend usa
(`api-tests/.env`: `API_LOGIN`, `API_PASSWORD`, `API_LOGIN_STAFF`,
`API_PASSWORD_STAFF`). Para não manter a credencial em dois lugares:

```bash
set -a; . ../taniamelo-advocacia-backend/api-tests/.env; set +a
export E2E_USER="$API_LOGIN" E2E_PASSWORD="$API_PASSWORD"
export E2E_USER_STAFF="$API_LOGIN_STAFF" E2E_PASSWORD_STAFF="$API_PASSWORD_STAFF"
```

## Rodando

```bash
pnpm test:e2e            # backend local (env/local.env)
pnpm test:e2e:dev        # instância publicada na AWS (env/development.env)
pnpm test:e2e:ui         # modo interativo, para escrever teste novo
pnpm exec playwright show-report   # relatório da última execução
```

O relatório HTML é gerado em toda execução, também fora do CI, em
`playwright-report/` (ignorado pelo git). É onde se abre o `trace` e o vídeo
de um teste que falhou — os dois já eram gravados em `test-results/`, mas sem
a página que os abre `show-report` respondia "No report found" justamente na
máquina onde a falha aconteceu.

Cada um sobe o `next dev` na 3001 por conta própria e o derruba no fim. Um
`pnpm dev` já rodando na 3001 é reaproveitado — **e é aí que mora uma
armadilha**: o servidor reaproveitado é o que já estava de pé, com o ambiente
dele, não o do alvo que você pediu. Se havia um `pnpm dev` apontado para outro
backend, é contra ele que a suíte roda. Na dúvida, derrube o dev antes.

Contra uma aplicação já servindo em outro lugar, defina `E2E_BASE_URL` — o
Playwright deixa de subir servidor próprio.

### Qual alvo, e contra qual escritório

| Script | Backend | Escritório |
|---|---|---|
| `pnpm test:e2e` | `localhost:8080` | `tania` |
| `pnpm test:e2e:dev` | AWS (dev) | `tania` |

Os dois rodam no `tania`, e isso é deliberado. **Nesta instância `tania` é
massa semeada**: 125 clientes fictícios e os usuários `dra.tania` e
`ana.souza`, vindos de `db/mock-data/seed_tenant_tania.sql`. Não é o
escritório em produção — testar ali exercita a mesma carga que se vê ao abrir
a aplicação, que é o ponto.

O que continua valendo: a suíte **escreve**. Cada teste cria o que precisa,
marca com `[e2e]` e apaga no fim; um teste que falha no meio deixa resíduo
reconhecível. Nenhum deles edita ou exclui registro que já estivesse lá.

Quando esta instância passar a servir dados de verdade, o alvo da suíte volta
a ser um escritório separado (`tenant_demo`, que continua semeado) — e aí é o
`env/development.env` que muda, não os testes.

O `webServer` do `playwright.config.ts` chama `next dev` direto, e não `pnpm
dev:local`: aquele script recarrega `env/local.env` por cima do ambiente já
preparado, e `test:e2e:dev` acabaria servindo a aplicação apontada para o
backend **local** enquanto o processo de teste acreditava estar na AWS.

## O que existe hoje

- `e2e/auth.setup.ts` — faz login uma vez e grava `e2e/.auth/user.json`. Os
  demais testes começam autenticados; sem isso cada um repetiria o formulário.
- `e2e/smoke.spec.ts` — guarda de rota (sem sessão vai para o login) e as cinco
  páginas principais renderizando sem erro de JavaScript. É o arquivo que
  distingue "ambiente quebrado" de "regra quebrada": se ele falha, não adianta
  investigar formulário.
- `e2e/agenda.spec.ts` — agendar, ver o aviso de conflito de horário
  (`GET /appointments/conflicts` disparado enquanto se digita) e limpar o que
  foi criado, pela API.
- `e2e/inss-password.spec.ts` — a ficha não busca a senha sozinha, revelar
  grava auditoria, e salvar sem tocar no campo não apaga a senha.
- `e2e/login-throttle.spec.ts` — o 429 vira "tente novamente em X" em vez de
  "credenciais inválidas", que mandaria a pessoa tentar de novo e aprofundar o
  bloqueio.
- `e2e/papeis.spec.ts` — o que o atendente não vê, com a contraprova de que
  para o admin os mesmos botões aparecem.
- `e2e/financeiro-restrito.spec.ts` — Pagamentos e Carteira somem do menu para
  quem não é admin, e o endereço digitado direto explica em vez de mostrar uma
  lista vazia.
- `e2e/cadastro-endereco-em-lote.spec.ts` — dois endereços no cadastro saem em
  UMA requisição (`/addresses/batch`), e nenhum POST avulso.
- `e2e/trilha-de-situacao.spec.ts` — a trilha diz de onde para onde, marca
  "voltou" no retrocesso e mostra nome em vez de UUID.

## Convenções

- **Localizar por papel e texto visível** (`getByRole`, `getByLabel`,
  `getByPlaceholder`), não por classe CSS nem por `data-testid`. Classe muda
  com refatoração de estilo; rótulo só muda quando o produto muda — e aí o
  teste *deve* falhar. A ordem de preferência, os três casos em que
  `data-testid` se justifica, e por que aqui `getByRole` vem **antes** de
  `getByLabel` estão em [`PLANO_LOCALIZADORES.md`](./PLANO_LOCALIZADORES.md).
- **Serial, um worker.** Os testes gravam num backend compartilhado. Em
  paralelo, dois deles disputariam o mesmo horário na agenda e falhariam por
  "conflito de horário" — que é justamente uma regra sob teste.
- **Cada teste limpa o que criou**, pela API, no `afterAll`. Pela interface não
  serve: um teste que falha no meio deixa a tela em qualquer estado, e a
  limpeza precisa funcionar mesmo assim.
- **Título único** (`Date.now()`) em tudo que é criado, para uma execução não
  enxergar o resíduo da anterior.
- Campo de data/hora do react-aria não aceita `fill`: cada parte é um
  spinbutton. Use o helper `preencherDataHora`.

## Playwright MCP — para ESCREVER teste, não para rodar

Um `.mcp.json` na raiz do projeto registra o servidor MCP do Playwright. Quem
abrir o Claude Code aqui recebe um pedido de aprovação na primeira vez (config
de escopo "project" exige isso) e, aceito, passa a ter ferramentas de navegador:
abrir uma página, tirar um *snapshot da árvore de acessibilidade*, clicar,
digitar, ler console e requisições de rede.

O conteúdo é este — **o arquivo precisa ser criado à mão**, porque configuração
de MCP é executável e ferramenta remota não tem (nem deve ter) permissão de
plantar uma:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--isolated",
        "--allowed-origins", "http://localhost:3001;http://localhost:8080",
        "--test-id-attribute", "data-testid"
      ]
    }
  }
}
```

Conferir depois com `claude mcp list` (ou `/mcp` dentro da sessão).

### Para que serve — e para que não serve

**Serve para escrever e depurar teste.** A pergunta que ele responde em segundos
é sempre a mesma: *como esta tela se parece, agora, para uma consulta por papel
e rótulo?* Quatro surpresas reais desta suíte eram exatamente essa pergunta:

- a seção do accordion já vinha **aberta**, e o `click()` do teste fechava — o
  conteúdo continuava no DOM, deitado atrás dos cabeçalhos seguintes;
- `getByLabel("Tipo")` passou a casar com **dois** controles, depois que a
  agenda ganhou barra de filtros;
- o diálogo fica `aria-hidden` enquanto o popover do ComboBox está aberto, então
  nenhuma busca por papel encontra nada lá dentro;
- `/home` não tem nenhum `h1` desde a reformulação em cards.

Todas custaram rodadas de tentativa e erro. Um snapshot responderia cada uma de
primeira.

**Não serve para rodar a suíte.** Um agente clicando na tela não deixa asserção
no repositório, não roda no CI e não protege ninguém amanhã. O que vale é o que
está em `e2e/*.spec.ts`. O MCP é ferramenta de autoria — o produto dele é código
commitado, não uma execução que passou.

### Usando autenticado

Do jeito que está commitado, o navegador abre **sem sessão** e cai no login —
proposital, para funcionar em clone novo. Para explorar tela interna,
acrescente a linha do estado de sessão em `.mcp.json`:

```jsonc
"--storage-state", "e2e/.auth/user.json",
```

Pré-requisito: ter rodado a suíte (ou só o projeto `setup`) ao menos uma vez,
para o arquivo existir. **Sem o arquivo, o servidor sobe e a navegação falha** —
o erro não diz que o problema é esse. O token expira; quando começar a cair no
login de novo, rode o setup outra vez.

### Detalhes que evitam investigação à toa

- **`--test-id-attribute data-testid`** casa com o que o código já usa
  (`InssPasswordField` expõe `inss-password-field` e `inss-password-toggle`).
- **Snapshot logo após navegar pega a página antes da hidratação.** Esta
  aplicação lê `localStorage` em `useEffect` — papel do usuário, nome no menu.
  Tirado cedo demais, o snapshot mostra "Menu do usuário" e **nenhum botão de
  excluir**, e a conclusão fácil é que a autorização quebrou. Não quebrou: é
  cedo. Espere por um elemento antes de tirar o snapshot.
- **`--allowed-origins` é guarda-corpo, não barreira de segurança** — está
  escrito no `--help` da própria ferramenta. Serve para o agente não sair
  navegando por engano; não substitui cuidado.
- **`browser_evaluate` e `browser_run_code_unsafe` executam código arbitrário**
  na página, com a sessão que estiver carregada. Aponte para `localhost`
  enquanto a instância remota for a única publicada: código arbitrário com
  sessão de ADMIN é a ferramenta mais afiada da caixa, e a máquina local é
  onde um engano custa um `pnpm dev` reiniciado.
- `--isolated` mantém o perfil em memória: não suja o navegador de ninguém.

### Conferido

Servidor `@playwright/mcp` 1.63.0-alpha (31/08/2026), 24 ferramentas, handshake
MCP e `browser_navigate` + `browser_snapshot` contra `localhost:3001`
autenticado, retornando a árvore de acessibilidade com os elementos nomeados da
tela de clientes. Esta versão **não** tem ferramenta de gravação/codegen
(`browser_start_recording` e parentes aparecem em artigos, mas não nesta versão)
— o código do teste continua sendo escrito à mão, a partir do snapshot.

## Ainda não coberto

Por ordem de valor, não de esforço:

1. Cadastro de cliente ponta a ponta (página com accordion, endereços,
   entrevista) — é o formulário mais longo do sistema e o que mais quebra.
2. Ficha do cliente: abrir, editar uma seção, conferir que o histórico de
   situação registrou.
3. Substituir/cancelar na modal de decisão de conflito.
4. Exclusão e restauração (cliente e compromisso), agora que o backend tem
   `PATCH /restore`.
