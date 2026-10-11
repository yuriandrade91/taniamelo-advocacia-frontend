# Tânia Melo Advocacia — frontend

Sistema interno do escritório de advocacia previdenciária: clientes e a esteira
de cada caso, agenda, valores que o INSS paga aos clientes, a carteira do
escritório e relatórios. Este repositório é a interface; a API é o
[`taniamelo-advocacia-backend`](../taniamelo-advocacia-backend) (Spring Boot).

| | |
|---|---|
| Framework | Next.js 16 (App Router), exportado como **site estático** (`output: "export"`) |
| UI | React 19, HeroUI v3 (React Aria), Tailwind CSS v4 |
| Dados | API REST, via `axios`, multi-escritório (`X-Tenant-Id`) |
| Testes | Vitest (unidade) e Playwright (ponta a ponta, contra o backend de verdade) |
| Publicação | `out/` no S3, servido pelo CloudFront |

## Começando

Requisitos: **Node 22** e **pnpm 10** — a versão exata está no
`packageManager` do `package.json` (com o Corepack, `corepack enable` basta).
Para usar a aplicação de verdade, o backend rodando em `localhost:8080`.

```bash
pnpm install
pnpm dev            # http://localhost:3001, contra o backend local
```

Entre com um usuário do escritório `tania` — a massa semeada do backend traz
uma conta ADMIN e uma STAFF (ver o README do backend).

## Ambientes

As variáveis `NEXT_PUBLIC_*` são **inlinadas no build**: trocar de backend é
gerar outro build, não reiniciar um servidor.

| Arquivo | Backend | Script |
|---|---|---|
| `env/local.env` | `http://localhost:8080` | `pnpm dev`, `pnpm test:e2e` |
| `env/development.env` | instância de desenvolvimento na AWS | `pnpm dev:development`, `pnpm build:development`, `pnpm test:e2e:dev` |

| Variável | |
|---|---|
| `NEXT_PUBLIC_API_URL` | origem da API (sem `/api/v1`) |
| `NEXT_PUBLIC_TENANT_SLUG` | o escritório (`tania`) — vai no `X-Tenant-Id` de toda requisição, inclusive no login |
| `NEXT_PUBLIC_PENDING_INTEGRATIONS` | grupos de rota que **não existem** naquela instância (`users-me,payments,…`): a tela diz "não está no ar neste ambiente" em vez de errar a cada carga |

Credenciais da suíte e2e ficam em `env/e2e.local.env`, fora do git
([`docs/TESTING.md`](docs/TESTING.md)).

## Scripts

| | |
|---|---|
| `pnpm dev` | servidor de desenvolvimento na 3001 (backend local) |
| `pnpm build` / `pnpm preview` | gera `out/` e o serve para conferir (`next start` não serve export estático) |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | os três portões — limpos antes de fechar qualquer mudança, e os mesmos do CI |
| `pnpm test:watch` | Vitest enquanto edita |
| `pnpm test:e2e` | Playwright contra o backend local (`test:e2e:ui` para o modo interativo) |

## As telas

| Rota | | Quem vê |
|---|---|---|
| `/site` | o site público do escritório: atuação, como funciona, simulador da LC 142/2013, dúvidas e contato. Canais de contato em `components/site/siteContent.ts` (vazio não aparece) | público |
| `/login` | entrada; avisa quando a sessão venceu e quando o login foi freado por tentativas | todos |
| `/home` | agenda do mês, esteira de clientes (arrastar muda a etapa), aniversariantes, próximas receitas e balanço | todos; o dinheiro só para ADMIN |
| `/clientes` | lista com filtros, mudança de etapa na linha, ficha (ler e editar no mesmo lugar), exclusão com desfazer | todos; excluir só ADMIN/SUPPORT |
| `/clientes/novo` | cadastro em abas, com Revisão e os modos "Colar e preencher" e "Ditado por voz" | todos |
| `/agenda` | compromissos: agendar, remarcar, concluir, cancelar com justificativa, aviso de conflito de horário | todos |
| `/pagamentos` | o que o INSS paga aos clientes: a receber, em atraso, recebido | ADMIN |
| `/carteira` | entradas e saídas do escritório | ADMIN |
| `/relatorios` | cinco visões — visão geral, indicadores, jornada do cliente, mês a mês, proporções —, na ordem que cada pessoa arrumar, abrindo na última vista | todos; o financeiro só para ADMIN |
| `/perfil` | dados do usuário e troca de senha | todos |

**Quem autoriza é o backend** (`@RequerAdmin`, `@RequerAdvogado`); a tela só não
oferece o que vai ser recusado (`lib/permissions.ts`).

## Como o código está organizado

```
src/
  app/           rotas — só montam a página
  components/    por domínio (clients, agenda, payments, wallet, reports, home…) e o kit em ui/
  hooks/  lib/   estado reutilizável e funções puras
  services/      uma função por rota da API; nenhum componente chama o axios direto
  interfaces/ enums/ constants/
tests/
  unit/          Vitest, espelhando src/
  e2e/           Playwright, um arquivo por fluxo
```

O desenho e as razões estão em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md);
o checklist do dia a dia — qual peça usar para cada coisa — em
[`CLAUDE.md`](CLAUDE.md).

**Idioma:** identificadores em inglês (arquivo, função, variável, tipo);
texto de interface e comentário em português; o que espelha o backend (chave de
enum, valor da API) fica como a API escreve.

## Documentação

| | |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | camadas, sessão, formulários, listas, o kit de UI, armadilhas do HeroUI v3 |
| [`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md) | o contrato com a API: fundamentos, erros, papéis, as 90 rotas e quem usa cada uma |
| [`docs/FINANCE_SPEC.md`](docs/FINANCE_SPEC.md) | regras do financeiro: competência × caixa, baldes disjuntos, Pagamentos ≠ receita |
| [`docs/TESTING.md`](docs/TESTING.md) | Vitest e Playwright: como rodar, credenciais, convenções, localizadores |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | S3 + CloudFront, a função de reescrita, o pipeline |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | o que foi desenhado e não existe, e a margem de maturidade |
| [`docs/adr/`](docs/adr) | decisões registradas: formulário por schema, layout do cadastro |

## Publicação

Push na `develop` roda o `deploy.yml`: lint, tipos e testes de unidade, build
estático, envio ao S3 (assets imutáveis primeiro, HTML depois), invalidação do
CloudFront e conferência das rotas. Detalhes e a configuração da distribuição
em [`docs/DEPLOY.md`](docs/DEPLOY.md).
