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
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

O segundo comando baixa o navegador (~150 MB). Só o Chromium: rodar a suíte em
três navegadores triplicaria o tempo sem afirmar nada a mais sobre regra de
negócio.

## Credenciais

**Nunca em arquivo do repositório.** `env/local.env` e `env/development.env` são
versionados; credencial ali vira credencial no histórico do git.

```bash
export E2E_USER='usuario.e2e'
export E2E_PASSWORD='...'
export E2E_TENANT_ID='...'   # opcional, só para a limpeza via API
```

Use um **usuário dedicado ao teste**, não a conta de alguém: a suíte cria,
cancela e exclui compromissos.

## Rodando

```bash
pnpm test:e2e            # backend local (env/local.env), sobe o next dev sozinho
pnpm test:e2e:dev        # backend de desenvolvimento na AWS (env/development.env)
pnpm test:e2e:ui         # modo interativo, para escrever teste novo
pnpm exec playwright show-report
```

Contra uma aplicação já servindo em outro lugar, defina `E2E_BASE_URL` — o
Playwright deixa de subir servidor próprio.

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

## Convenções

- **Localizar por papel e texto visível** (`getByRole`, `getByLabel`,
  `getByPlaceholder`), não por classe CSS. Classe muda com refatoração de
  estilo; rótulo só muda quando o produto muda — e aí o teste *deve* falhar.
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

## Ainda não coberto

Por ordem de valor, não de esforço:

1. Cadastro de cliente ponta a ponta (página com accordion, endereços,
   entrevista) — é o formulário mais longo do sistema e o que mais quebra.
2. Ficha do cliente: abrir, editar uma seção, conferir que o histórico de
   situação registrou.
3. Substituir/cancelar na modal de decisão de conflito.
4. Exclusão e restauração (cliente e compromisso), agora que o backend tem
   `PATCH /restore`.
