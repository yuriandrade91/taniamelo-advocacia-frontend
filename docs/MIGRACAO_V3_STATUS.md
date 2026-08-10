# Migração HeroUI v3 + Tailwind v4.3 — CONCLUÍDA

**Stack:** Next 16.2.12 · React 19.2.1 · HeroUI 3.2.2 · Tailwind 4.3.3

**`npx tsc --noEmit` → 0 erros** (eram 103)

---

## O que foi migrado

| Área | Mudança |
|---|---|
| **Deps** | 18 pacotes `@heroui/*` v2 → `@heroui/react` + `@heroui/styles` 3.2.2; Next 16.2.12; Tailwind 4.3.3; removidos `framer-motion`, `autoprefixer`, `npm` |
| **Config** | `postcss.config.mjs` → `@tailwindcss/postcss`; `tailwind.config.js` esvaziado (**pode apagar**) |
| **Style guide** | `globals.css` CSS-first: `@import "tailwindcss"` + `@import "@heroui/styles"` + `@theme` com paleta em OKLCH; 18 `@font-face` do Jost preservados |
| **Tokens** | `--accent` mapeado para a marca; `--brand-gold` exposto via `@theme inline`; utility `bg-gradient-brand` |
| **Providers** | `app/providers.tsx` (client) com `Toast.Provider`; `HeroUIProvider` removido (não existe no v3) |
| **Layouts** | root com `class="light" data-theme="light"`; `(private)/layout.tsx` voltou a ser Server Component |
| **Novo** | `components/ui/form/Field.tsx` — wrappers `Field` e `SelectField` que encapsulam os compounds do v3 |

### Bugs do style guide corrigidos
1. `light-gray` era usada em `bg-light-gray` (3×) mas **nunca existiu** → criada (`#DDDFE3`)
2. chave `"light-green "` tinha **espaço no fim** → a classe nunca funcionou
3. `linear-gradient` estava como *cor* → virou a utility `bg-gradient-brand`

---

## API v3 — equivalências aplicadas

Extraídas dos tipos em `node_modules/@heroui/react/dist` (ground truth).

| v2 | v3 |
|---|---|
| `<Input label errorMessage onValueChange>` | `TextField > Label + Input + FieldError`; `onChange(e)` |
| `startContent` / `endContent` | `InputGroup.Prefix` / `InputGroup.Suffix` |
| `<Select><SelectItem>` | `Select > Select.Trigger(Value+Indicator) + Select.Popover > ListBox > ListBox.Item id=` |
| **Select multi-seleção** | ❌ não existe — usar `Popover` + `ListBox selectionMode="multiple"` |
| `Modal/ModalContent/Header/Body/Footer` | `Modal > Modal.Backdrop(variant,isOpen,onOpenChange) > Modal.Container(size) > Modal.Dialog > Modal.Header/Body/Footer` |
| `Table isStriped shadow radius color` | root só aceita `children`/`className`/`variant` |
| `Pagination total page onChange` | compound manual: `.Content > .Item > .Link / .Previous(.PreviousIcon) / .Next(.NextIcon)` |
| `Tooltip color content showArrow` | `Tooltip > Tooltip.Content` |
| `Switch onValueChange` | `onChange(isSelected)` |
| `Button color="primary"` | `variant="primary"` (`primary\|secondary\|danger\|danger-soft\|ghost\|outline\|tertiary`) |
| `Spinner color="default" variant="gradient"` | `color="current"` (`current\|accent\|success\|warning\|danger`) |
| `CircularProgress` | **`ProgressCircle`** (sem `showValueLabel`/`strokeWidth`) |
| `Progress` | **`ProgressBar`** |
| `addToast({title,description,color})` | `toast.success(title,{description})` / `toast.danger(...)` |
| `classNames={{...}}` | ❌ removido → `className` no subcomponente |
| `size`/`radius`/`color` em campos | ❌ removidos → Tailwind |

⚠️ **`@heroui/react` é client-only:** todo arquivo que o importa precisa de `"use client"` — inclui `services/axiosService.ts`. O root `layout.tsx` continua Server Component graças ao `providers.tsx`.

### ⚠️ Armadilha do Table (erro em runtime, invisível ao TypeScript)

`Table` (Root) é **apenas um wrapper `div`**. Quem estabelece a coleção do React
Aria é **`Table.Content`**. Sem ele, o erro em runtime é:

> `cannot be rendered outside a collection`

Estrutura correta:

```tsx
<Table>
  <Table.Content aria-label="...">
    <TableHeader>
      {cols.map((c) => (
        <TableColumn key={c.key} id={c.key} isRowHeader={c.key === "fullName"}>
          {c.label}
        </TableColumn>
      ))}
    </TableHeader>
    <TableBody>
      {rows.map((r) => (
        <TableRow key={r.id} id={String(r.id)}>…</TableRow>
      ))}
    </TableBody>
  </Table.Content>
</Table>
```

Regras do React Aria a respeitar: cada `TableColumn` precisa de **`id`**, uma
coluna deve ser **`isRowHeader`**, e cada `TableRow` precisa de **`id`**
(o `key` do React não substitui o `id` da coleção).

---

## Pendências (não bloqueiam)

```bash
rm tailwind.config.js     # obsoleto, já esvaziado
```

- **Validação visual:** o typecheck passa, mas o layout precisa de conferência no browser — o v3 mudou paddings, raios e alturas padrão.
- **`eslint.config.mjs`** quebra com `FlatCompat` (erro de estrutura circular); `next lint` foi removido no Next 16 → migrar para flat config puro.
- **Build:** se o Turbopack falhar em arm64, use `next build --webpack`.
