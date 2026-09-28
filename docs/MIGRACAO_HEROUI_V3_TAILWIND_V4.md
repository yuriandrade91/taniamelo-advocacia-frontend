# Migração: Next latest + HeroUI v3.2.2 + Tailwind v4.3

**Projeto:** taniamelo-advocacia-frontend
**Data:** Julho/2026
**Estado atual:** Next 16.0.8 · HeroUI v2 (18 pacotes) · Tailwind 3.4.17 · framer-motion 12

> ⚠️ **Este documento é verificação + plano.** Nada foi aplicado. A migração é *breaking* e exige `pnpm install` local.

---

## 1. Dá para atualizar? (item 1)

Versões verificadas no npm registry hoje:

| Pacote | Atual | Alvo (latest) | Viável |
|---|---|---|---|
| `next` | 16.0.8 | **16.2.12** | ✅ Bump menor, baixo risco |
| `react` / `react-dom` | 19.2.1 | 19.2+ | ✅ Já atende (v3 exige React 19+) |
| `@heroui/react` + `@heroui/styles` | — (18 pacotes v2) | **3.2.2** | ✅ Exatamente a versão pedida |
| `tailwindcss` | 3.4.17 | **4.3.3** | ✅ "v4.3" — pré-requisito do HeroUI v3 |
| `@tailwindcss/postcss` | 4.1.8 (instalado, inativo) | 4.3.3 | ✅ Já presente |
| `framer-motion` | 12.16.0 | **remover** | ✅ v3 usa animações CSS |

**Conclusão:** as três atualizações são viáveis e se sustentam mutuamente. Next e React são a parte trivial; o esforço real está no HeroUI v2→v3, que arrasta o Tailwind v4 (são uma decisão única).

### Estado híbrido a resolver
O projeto está "meio migrado" e isso hoje gera silêncio, não erro:
- `globals.css` já tem um bloco **`@theme inline`** (sintaxe v4) que o Tailwind 3 **ignora**.
- `@tailwindcss/postcss` (plugin v4) está instalado, mas o `postcss.config.mjs` usa o plugin antigo (`tailwindcss: {}`).
- O `tailwind.config.js` ainda registra o plugin `heroui()` do v2.

---

## 2. Verificação componente a componente (item 2)

### Inventário real do código

| Arquivo | Pacotes HeroUI usados |
|---|---|
| `app/layout.tsx` | `toast` |
| `app/(private)/layout.tsx` | `system` (**HeroUIProvider**) |
| `app/(private)/clientes/page.tsx` | `button`, `date-picker`, `input`, `pagination`, `select`, `skeleton`, `table`, `tooltip` |
| `app/(public)/login/page.tsx` | `button`, `input`, `spinner` |
| `components/ui/NotBillableSwitch` | `switch` |
| `components/ui/modals/DetailsClientModal` | `button`, `input`, `modal`, `progress`, `skeleton`, `select` |
| `components/ui/modals/AddNewClientModal` | `input`, `button`, `select`, `modal`, `spinner` |
| `components/ui/modals/DeleteClientModal` | `modal`, `button` |
| `components/SituationChips` | `chip` |
| **`services/axiosService.ts`** | `toast` ⚠️ (arquivo não-componente) |

### Superfície de mudança medida

| Padrão | Ocorrências | Impacto no v3 |
|---|---|---|
| `classNames={{...}}` | **31** | ❌ **Removido** — vira `className` |
| `variant="..."` | 44 | ⚠️ Semântica mudou; revisar caso a caso |
| `color="..."` | 19 | ⚠️ Vários viram `variant`; `primary`→`accent` |
| `isOpen` / `onOpenChange` | 19 | ⚠️ Modal virou compound; `useDisclosure`→`useOverlayState` |
| `<SelectItem>` | 13 | ⚠️ Passa a exigir `id` (+ `textValue` se o conteúdo não for texto puro) |
| `onPress` | 13 | ✅ Continua válido (React Aria) |
| `text-tiny/small/medium/large` | **0** | ✅ Nada a converter |
| `rounded-small/medium/large` | **0** | ✅ Nada a converter |
| `border-small/medium` | **0** | ✅ Nada a converter |

> 🎯 **Boa notícia:** vocês não usam as utilities customizadas do v2 (`text-small`, `rounded-medium`, `border-small`), que costumam ser o maior atrito visual da migração.

### Mapeamento de componentes

| v2 (uso atual) | v3 | Status | O que muda de fato |
|---|---|---|---|
| `Button` | `Button` | ✅ | Import; `color="primary"` → `variant="primary"` |
| `Input` | `TextField` + `Input` (+ `Label`, `FieldError`, `InputGroup`) | ⚠️ **Reescrita** | Vira compound; label/erro passam a ser filhos |
| `Select` + `SelectItem` | `Select` | ⚠️ **Reescrita** | Itens usam `id`/`textValue`; composição nova |
| `Modal` + `ModalContent/Header/Body/Footer` | `Modal` (compound) | ⚠️ **Reescrita** | `Modal.Content`, `Modal.Header`…; controle via `useOverlayState` |
| `Table` + `TableHeader/Body/Column/Row/Cell` | `Table` | ⚠️ Atualizado | Revisar API de colunas/linhas e seleção |
| `DateRangePicker` | `DateRangePicker` | ✅ | Mantém `@internationalized/date`; revisar props |
| `Chip` | `Chip` | ✅ | Import |
| `Switch` | `Switch` | ✅ | Import; **remover `classNames`** (há 1 uso) |
| `Tooltip` | `Tooltip` | ✅ | Import |
| `Spinner` | `Spinner` | ✅ | Import |
| `Skeleton` | `Skeleton` | ✅ | Import |
| `Pagination` | `Pagination` | ✅ | Import |
| `Progress` | **`ProgressBar`** | ⚠️ **Renomeado** | Trocar o nome do componente |
| `addToast` (`@heroui/toast`) | `Toast` / `toast` | ⚠️ API nova | Afeta `axiosService.ts` e o `Toast.Provider` |
| `HeroUIProvider` (`@heroui/system`) | — | ❌ **Não existe** | v3 **não tem provider**: remover de `(private)/layout.tsx` |
| `@heroui/navbar` | — | ❌ Removido no v3 | ✅ **Não afeta**: seu Navbar é custom (o pacote está no `package.json` mas nunca é importado) |

### Armadilhas verificadas (custaram build na tentativa anterior)

1. **`@heroui/react` é `client-only`.** Todo arquivo que o importa precisa de `"use client"` na primeira linha — inclusive **`app/layout.tsx`** (que é Server Component) e **`services/axiosService.ts`**.
   → Solução: extrair `app/providers.tsx` (`"use client"`) com o `Toast.Provider` e deixar o layout como Server Component.
2. **`framer-motion`** é usado só em `SituationChips.tsx` — reescrever com CSS/`animate.css`.
3. **Turbopack não builda em arm64 sem binários nativos** — em CI/local Apple Silicon, se der erro de binding, use `next build --webpack`.
4. **`next lint` foi removido no Next 16** e o `eslint.config.mjs` atual quebra (`FlatCompat` → erro de estrutura circular). Migrar para flat config puro.

---

## 3. Style guide transposto para Tailwind v4.3 (item 3)

No v4 a configuração é **CSS-first**: `tailwind.config.js` e o plugin `heroui()` saem; os tokens vivem no CSS.

### Bugs encontrados no style guide atual

| Problema | Consequência hoje |
|---|---|
| **`light-gray` não existe** no theme, mas `bg-light-gray` é usada **3×** | Classe sem efeito (o cinza vem de `body { background: #DDDFE3 }`) |
| **`"light-green "`** tem **espaço no final** da chave | `bg-light-green` **nunca funcionou** |
| **`linear-gradient`** declarado como objeto de cor | `bg-linear-gradient-secondary` não gera gradiente (cor não aceita `linear-gradient()`) |
| `body` fixa `#DDDFE3` / `#090D4C` em CSS puro | Duplica o token em vez de reusá-lo |

### Bloco pronto para o `globals.css`

Substitui `@tailwind base/components/utilities` e o `tailwind.config.js` inteiro:

```css
/* A ORDEM IMPORTA: tailwindcss primeiro, depois @heroui/styles */
@import "tailwindcss";
@import "@heroui/styles";
@import "animate.css/animate.min.css";

/* ── Tokens da marca (fonte única de verdade) ────────────────── */
@theme {
  /* Tipografia */
  --font-sans: "Jost", Arial, Helvetica, sans-serif;

  /* Paleta — valores idênticos aos atuais, em OKLCH (nativo do v3) */
  --color-primary: oklch(0.2157 0.1122 269.75);    /* #090D4C */
  --color-secondary: oklch(0.6478 0.1071 74.24);   /* #B5843C */
  --color-success: oklch(0.7459 0.1812 152.33);    /* #2ECC71 */
  --color-danger: oklch(0.6460 0.2094 24.40);      /* #F34649 */
  --color-gray-100: oklch(0.4712 0.0000 89.88);    /* #5B5B5B */

  /* CORRIGIDO: usada em bg-light-gray, antes indefinida */
  --color-light-gray: oklch(0.9033 0.0059 264.53); /* #DDDFE3 */

  /* Tons translúcidos (mantidos em rgba: alpha é intencional) */
  --color-light-secondary: rgba(181, 132, 60, 0.1);
  --color-light-white: rgba(255, 255, 255, 0.3);
  --color-light-green: rgba(106, 231, 110, 0.25);  /* CORRIGIDO: sem espaço na chave */
}

/* ── Gradiente: utilitário, não "cor" ────────────────────────── */
@utility bg-gradient-brand {
  background-image: linear-gradient(
    0deg,
    rgb(181 132 60) 0%,
    rgb(89 68 69) 50%,
    rgb(9 13 76) 100%
  );
}

/* ── Superfície da aplicação, agora via token ────────────────── */
body {
  background: var(--color-light-gray);
  color: var(--color-primary);
  font-family: var(--font-sans);
}
```

Os `@font-face` do Jost (18 arquivos em `public/fonts/`) permanecem como estão.

### Compatibilidade das classes existentes

Cada `--color-*` no `@theme` gera as utilities automaticamente, então **o que já está no JSX continua funcionando**:

| Classe | Usos | Status |
|---|---|---|
| `*-secondary` | 44 | ✅ Continua |
| `*-gray-100` | 26 | ✅ Continua |
| `*-primary` | 16 | ✅ Continua |
| `*-success` | 5 | ✅ Continua |
| `*-light-gray` | 3 | ✅ **Passa a funcionar** (era quebrada) |

### Outras mudanças de configuração

1. `postcss.config.mjs` → trocar `tailwindcss: {}` por `"@tailwindcss/postcss": {}`.
2. `tailwind.config.js` → **remover** (não é mais necessário; `content` é detectado automaticamente).
3. Remover o bloco `@theme inline` legado e `--font-mono: var(--font-geist-mono)`.
4. `<html class="light" data-theme="light">` e `<body className="bg-background text-foreground">` — exigido pelo tema do v3.

> ⚠️ **Conflito de fontes a decidir:** o `app/layout.tsx` carrega **Geist** via `next/font` e aplica `${geistSans.variable}` no `<body>`, enquanto o style guide define **Jost**. Hoje o `body { font-family: 'Jost' }` ganha por especificidade. Na migração, decida: remover o Geist ou tratá-lo como fonte secundária.

---

## 4. Modelo tokenizado + Tailwind (item 4)

**Sim — e é exatamente o modelo oficial do HeroUI v3.** Verificado na documentação de theming: o v3 é construído sobre CSS variables + o `@theme` do Tailwind v4, com **BEM** para ajustes finos de componente.

### Como funciona (padrão documentado)

Cada token declarado no `@theme` é, simultaneamente:

1. Uma **CSS custom property** real → `var(--color-primary)` (usável em CSS puro, gradientes, libs externas).
2. Uma **utility class** gerada → `bg-primary`, `text-primary`, `border-primary`…

Convenção de nomes do v3: sem sufixo = **fundo**; com `-foreground` = **texto sobre aquele fundo**.

### Ligando a marca aos tokens semânticos do HeroUI

Para que os **componentes da lib** adotem a identidade do escritório, sobrescreva as variáveis semânticas — este é o padrão recomendado:

```css
/* Componentes HeroUI passam a usar a marca */
:root,
[data-theme="light"] {
  --accent: var(--color-primary);              /* v3 renomeou primary → accent */
  --accent-foreground: oklch(0.9911 0 0);      /* texto sobre o accent */
  --success: var(--color-success);
  --danger: var(--color-danger);

  /* Cor de marca própria, exposta ao Tailwind (padrão oficial) */
  --brand-gold: var(--color-secondary);
}

.dark,
[data-theme="dark"] {
  --brand-gold: var(--color-secondary);
}

/* Ponte para o Tailwind gerar bg-brand-gold / text-brand-gold */
@theme inline {
  --color-brand-gold: var(--brand-gold);
}
```

Ajustes finos de componente via BEM, sem `classNames`:

```css
@layer components {
  .button--primary { @apply bg-primary text-white; }
}
```

Formulários têm tokens próprios (`--field-background`, `--field-hover`, `--field-radius`…), o que permite restilizar inputs sem afetar botões e cards.

### Ganhos concretos

- **Uma fonte de verdade** por token, servindo utilities, CSS puro e o tema da lib.
- **Dark mode** vira troca de bloco (`.dark` / `[data-theme]`), sem duplicar classes.
- Estados de hover/soft são **calculados** por `color-mix()` — não é preciso manter escalas 50→900.

### Atenções específicas do seu caso

1. **`primary` → `accent`:** no v3 a cor semântica principal chama-se `accent`. Seu **token próprio** `--color-primary` continua válido como utility (`bg-primary`), mas `variant="primary"` nos componentes lê `--accent`. Por isso o mapeamento acima.
2. **`secondary` não é mais cor semântica no v3** — virou nome de *variante* de componente. Seu `#B5843C` (44 usos) sobrevive como token próprio, mas **`variant="secondary"` num `Button` não vai pintar de dourado**. Se quiser isso, sobrescreva via BEM (`.button--secondary`) ou use `className="bg-secondary"`.
3. **Escalas numéricas foram removidas** (`primary-50`, `primary-100`…). Vocês não usam nenhuma — sem impacto.
4. `gray-100` é um token seu com valor `#5B5B5B` (escuro), não o `gray-100` claro do Tailwind. Como está no `@theme`, o seu valor prevalece — mas o nome é contraintuitivo; considere renomear para `--color-neutral-text`.

---

## 5. Plano de ação

Duas fases, com níveis de risco bem diferentes.

### Fase A — Baixo risco (independente, pode ir já)
1. `next` → **16.2.12**; validar `dev` + `build`.
2. Remover `@heroui/navbar` do `package.json` (nunca importado).
3. Corrigir o `eslint.config.mjs` (flat config puro) — hoje está quebrado.

### Fase B — HeroUI v3 + Tailwind v4 (breaking, em branch dedicada)
Estratégia: **Full migration** — o codebase é pequeno (10 arquivos com HeroUI), então a coexistência v2+v3 (aliases pnpm) não compensa a complexidade.

**B1. Preparação**
- Branch `feat/heroui-v3`, árvore limpa e **commitada** (este trabalho já foi revertido 2×).
- Instalar o **HeroUI Migration MCP** — automatiza boa parte da conversão (imports, compound components, tokens).

**B2. Dependências**
```bash
pnpm remove $(node -p "Object.keys(require('./package.json').dependencies).filter(k=>k.startsWith('@heroui/')).join(' ')") framer-motion
pnpm add @heroui/react@3.2.2 @heroui/styles@3.2.2
pnpm add -D tailwindcss@4.3.3 @tailwindcss/postcss@4.3.3
pnpm remove -D autoprefixer   # desnecessário no v4
```

**B3. Tailwind v4 + tokens**
- `postcss.config.mjs` → `@tailwindcss/postcss`.
- `globals.css` → bloco da seção 3.
- **Apagar** `tailwind.config.js`.

**B4. Fronteira client/server (fazer ANTES dos componentes)**
- Criar `app/providers.tsx` com `"use client"` + `Toast.Provider`.
- `app/layout.tsx` → usar `<Providers>`; adicionar `class="light" data-theme="light"` no `<html>`.
- Remover `HeroUIProvider` de `app/(private)/layout.tsx`.
- Garantir `"use client"` em **todo** arquivo que importe `@heroui/react` (inclui `services/axiosService.ts`).

**B5. Componentes** (ordem crescente de esforço)
1. Trocar todos os imports `@heroui/<pkg>` → `@heroui/react`.
2. Triviais: `Chip`, `Switch`, `Tooltip`, `Spinner`, `Skeleton`, `Pagination`, `Button`.
3. `Progress` → `ProgressBar`.
4. Eliminar as **31** ocorrências de `classNames` → `className`.
5. `SituationChips` sem framer-motion.
6. Reescritas: `Input`→`TextField`, `Select` (com `id`/`textValue`), `Modal` (compound), `Table`.
7. Toast: `axiosService.ts` + `lib/toast.ts` (se recriado).

**B6. Validação**
- `npx tsc --noEmit`
- `npx next build` (ou `--webpack` em arm64)
- Smoke test visual: login, home, clientes, os 3 modais
- Conferir paleta e Jost aplicados

### Esforço estimado

| Etapa | Esforço | Risco |
|---|---|---|
| Fase A | 0,5 dia | Baixo |
| B2–B4 (deps, Tailwind, tokens, providers) | 0,5–1 dia | Médio |
| B5 triviais + `classNames` + `ProgressBar` | 1 dia | Baixo |
| B5 reescritas (Input/Select/Modal/Table/Toast) | 2–4 dias | Médio-Alto |
| B6 validação/QA | 1 dia | — |

---

## 6. Recomendação

1. Rodar a **Fase A** já — ganho imediato, risco baixo, desacoplado do resto.
2. Tratar a **Fase B** como um sprint dedicado, em branch, com o **Migration MCP**.
3. Aproveitar a migração para corrigir os **3 bugs do style guide** (`light-gray`, `light-green `, gradiente) e adotar o **modelo tokenizado** como padrão.
4. Fazer a Fase B **junto ou depois** da migração SSR — ambas mexem em providers e layout; evita retrabalho.
5. A camada de dados (`services/`, `interfaces/`, `enums/`, `lib/tenant.ts`) é **agnóstica de UI** e não é afetada pela Fase B.

---

## Fontes
- HeroUI v3 — Quick Start: <https://heroui.com/en/docs/react/getting-started/quick-start>
- HeroUI v3 — Theming (tokens, BEM, `@theme inline`): <https://heroui.com/en/docs/react/getting-started/theming>
- HeroUI v2→v3 — Migração e mapa de componentes: <https://heroui.com/en/docs/react/migration>
- HeroUI v2→v3 — Styling & Theming (utilities, `classNames`, primary→accent): <https://heroui.com/en/docs/react/migration/styling>
- Tailwind CSS v4: <https://tailwindcss.com/blog/tailwindcss-v4>
