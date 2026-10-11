# Roadmap

O que foi desenhado e ainda não existe, e onde o projeto tem margem para
amadurecer. Levantado em 09/10/2026 a partir do código, dos documentos antigos
(revisão de arquitetura, planos e propostas, já executados e removidos) e das
rotas do backend ([`BACKEND_CONTRACT.md`](BACKEND_CONTRACT.md)).

Cada item diz **de quem depende**: do front sozinho, do backend, ou de uma
decisão do escritório.

---

## 1. Projetado e não implementado

### Telas com dado de exemplo

| O quê | Hoje | Falta |
|---|---|---|
| Os três indicadores do topo da Home ("Formulários preenchidos", "Clientes contemplados"…) | números fixos, com o mês "Novembro" escrito à mão (`PENDING_STATS`, `home/page.tsx`). O contador de formulários pendentes, ao lado, já é real | backend: endpoint de métricas por período |
| Central de notificações (o sino) | dois avisos de exemplo (`SAMPLE_NOTIFICATIONS`, `Navbar.tsx`) | backend: endpoint de notificações. O componente já é controlado por props — a troca é numa constante |

### Pedido na tela, não gravado

- **Justificativa da mudança de etapa.** Pular ou voltar etapa pede
  justificativa (mínimo de 10 caracteres), mas o `PATCH /clients/{id}` não tem
  o campo — o texto fica na tela. *Backend:* campo na rota (ou rota própria de
  mudança de situação) e a trilha de situação mostrando o motivo.

### Rotas que existem no backend e não têm tela

| Rota | Seria |
|---|---|
| `GET /clients/deleted`, `PATCH /clients/{id}/restore` | **lixeira de clientes**: hoje a exclusão (lógica) tem só a janela de desfazer de 5 s |
| `GET /appointments/deleted`, `PATCH /appointments/{id}/restore` | lixeira de compromissos |
| `PATCH /files/documents/{id}`, `PATCH /files/simulations/{id}` | corrigir tipo e observação de um arquivo depois do envio (hoje: excluir e reenviar) |
| `PATCH /files/simulations/{id}/principal` | trocar a simulação principal depois do envio |
| `DELETE /clients/{id}/interviews/{id}`, `GET …/interviews` completo | histórico de entrevistas: a ficha edita só a mais recente e mostra "N registros" |
| `GET /appointments/{id}/history` | a trilha de um compromisso (quem remarcou, cancelou, concluiu) |
| `GET /tenants/current` | nome e marca do escritório vindos do backend, para mais de um escritório |
| `/support/login`, `/support/sessions/{tenantId}` | console de suporte (entrar num escritório como suporte) |

### Depende do contrato da API

- **Contato na lista de clientes.** A linha da lista
  (`ClientListResponseDTO`) não traz e-mail, WhatsApp nem nascimento; ações de
  contato e aniversário na lista dependem de o backend incluí-los.
- **Busca global.** A barra superior busca **clientes** (nome ou CPF). Uma
  busca que também ache compromissos e documentos pede uma rota de busca
  unificada.
- **Contrato de honorário** (`FINANCE_SPEC.md`, seção 14): percentual do êxito,
  parcelamento, o que fazer quando o INSS paga menos. Precisa das regras reais
  do escritório antes de virar modelo; até lá, a receita é lançada à mão na
  Carteira.

### Decisão em aberto

- **Revisão do cadastro:** as visualizações *Blocos* e *Documento* ainda
  convivem, com a chave na tela ([ADR 0002](adr/0002-client-form-layout.md)).
  Escolhida uma, a outra e a chave saem.

### Ambiente e entrega

- **Instância de desenvolvimento uma build atrás:** `users-me`, `payments`,
  `expenses`, `revenues` e `cep` estão pausados em `env/development.env`
  (`NEXT_PUBLIC_PENDING_INTEGRATIONS`). Publicar o backend atual lá e apagar a
  linha — o código das telas não muda.
- **Site HTTPS chamando API HTTP** (bloqueado como *mixed content*): o
  comportamento `/api/*` no CloudFront descrito em [`DEPLOY.md`](DEPLOY.md).
- **Credencial do deploy:** trocar a chave de acesso da AWS por OIDC
  (`role-to-assume`).

## 2. Margem para a maturidade

Em ordem de retorno.

### Segurança

1. **Access token fora do alcance do JavaScript.** Hoje ele fica num cookie
   legível (`token`); um XSS o levaria. O refresh já é `httpOnly` e a
   restauração de sessão já existe (`tryRestoreSession`, no `RouteGuard`):
   guardar o access token só em memória custa um refresh por carregamento de
   página.
2. **Cabeçalhos de segurança** pela *Response headers policy* do CloudFront:
   `Content-Security-Policy` (scripts só da própria origem, `connect-src` da
   API), `frame-ancestors 'none'`, `Referrer-Policy`, e `Permissions-Policy`
   liberando só `microphone=(self)` — o ditado por voz precisa dele.

### Testes e qualidade

3. **E2E no CI.** A suíte (99 testes) só roda na máquina de quem lembra de
   rodar. Backend e banco semeado em contêiner (`docker compose`) a cada PR
   fecham o maior buraco de proteção do projeto.
4. **Testes com DOM** (`jsdom` + Testing Library) para os hooks com regra de
   interação: `useHoverCard`, `usePagedList`, `useClientSheet`,
   `useAppointmentEditor`. Hoje só o e2e os cobre.
5. **Cobertura medida** (`vitest --coverage`) com piso no CI.
6. **Acessibilidade automatizada:** `@axe-core/playwright` nas páginas
   principais. A suíte já localiza tudo por papel e nome; falta afirmar
   contraste, rótulos e foco.
7. **Lint com tipos** (`typescript-eslint` *type-aware*):
   `no-floating-promises` e `no-misused-promises` pegam a promessa esquecida
   que hoje só o olho pega.

### Robustez

8. **Fronteira de erro:** não há `error.tsx`/`global-error.tsx` — um erro de
   renderização derruba a página inteira sem explicação. E o 404 é o padrão do
   Next, sem a marca (`not-found.tsx`).
9. **Registro de erro do navegador** (Sentry ou equivalente): falha no
   computador do escritório hoje só aparece se alguém contar.

### Código

10. **`ClientFormPage.tsx` (1.400 linhas):** a página orquestra criação,
    abas de endereço, deficiência, entrevista e arquivos. Extrair os fluxos em
    hooks (`useAddressSlots`, `useDisabilityDrafts`, `useClientCreate`), como a
    ficha já faz com `useClientSheet`.
11. **`Field.tsx` (840 linhas):** um arquivo por controle (texto, select,
    múltiplo, data, senha).
12. **`"use client"` em 141 de 144 componentes.** Retorno baixo — o HeroUI é
    *client-only* e o export estático não renderiza dado —, mas folhas puras
    (selos, títulos) poderiam ser Server Components e sair do JavaScript
    inicial.

### Produto

13. **Desfazer com lixeira:** com a restauração do backend, a exclusão poderia
    deixar de depender da janela de 5 s.
14. **Indicadores reais na Home** (item da seção 1) são o que mais engana hoje:
    número fixo com cara de dado.
