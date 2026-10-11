import { formatDateBR } from "@/lib/format";
import type { SelectFieldOption } from "@/components/ui/form/Field";

/**
 * Filtros de lista orientados a schema — a parte pura (sem React).
 *
 * Cada campo declara o tipo; o tipo escolhe a strategy: valor vazio, quando
 * conta como ativo e como vira chip removível. A barra de cada tela continua
 * sendo JSX (o arranjo muda de tela para tela); o que não muda — a regra de
 * "tem filtro?", os chips e o "Limpar" — sai daqui.
 *
 * "Ativo" é **diferente do padrão da tela**, não "diferente de vazio": a
 * Agenda nasce filtrada em "Agendado", e isso não é filtro a limpar.
 */

/** Período em `yyyy-MM-dd` (pontas vazias = sem limite). */
export type DateSpan = { from: string; to: string };

type FilterDef =
  | { kind: "search"; label: string; placeholder: string }
  | { kind: "select"; label: string; placeholder: string; options: readonly SelectFieldOption[] }
  | { kind: "multi"; label: string; placeholder: string; options: readonly SelectFieldOption[] }
  | { kind: "dateRange"; label: string };

export type FilterSchema = Record<string, FilterDef>;

type ValueOf<D extends FilterDef> = D["kind"] extends "multi"
  ? string[]
  : D["kind"] extends "dateRange"
    ? DateSpan
    : string;

export type FilterValues<S extends FilterSchema> = { -readonly [K in keyof S]: ValueOf<S[K]> };

export type FilterChip = { key: string; label: string; remove: () => void };

/** Factory: preserva as chaves e os tipos de cada campo (`FilterValues<typeof s>`). */
export const defineFilters = <const S extends FilterSchema>(schema: S): S => schema;

const NO_SPAN: DateSpan = { from: "", to: "" };

/** "12/03/2026 – 20/03/2026", "A partir de 12/03/2026", "Até …", ou `null`. */
export function periodLabel({ from, to }: DateSpan): string | null {
  if (from && to) return `${formatDateBR(from)} – ${formatDateBR(to)}`;
  if (from) return `A partir de ${formatDateBR(from)}`;
  if (to) return `Até ${formatDateBR(to)}`;
  return null;
}

const optionLabel = (def: FilterDef, id: string) =>
  ("options" in def ? def.options.find((o) => o.id === id)?.label : undefined) ?? id;

/** Strategy por tipo: o vazio e os chips. */
const STRATEGIES = {
  search: { empty: () => "", chips: () => [] },
  select: {
    empty: () => "",
    chips: (def: FilterDef, value: string, reset: (next: string) => void, key: string): FilterChip[] =>
      value ? [{ key, label: optionLabel(def, value), remove: () => reset("") }] : [],
  },
  multi: {
    empty: () => [],
    chips: (def: FilterDef, value: string[], reset: (next: string[]) => void, key: string): FilterChip[] =>
      value.map((id) => ({
        key: `${key}:${id}`,
        label: optionLabel(def, id),
        remove: () => reset(value.filter((item) => item !== id)),
      })),
  },
  dateRange: {
    empty: () => NO_SPAN,
    chips: (_def: FilterDef, value: DateSpan, reset: (next: DateSpan) => void, key: string): FilterChip[] => {
      const label = periodLabel(value);
      return label ? [{ key, label, remove: () => reset(NO_SPAN) }] : [];
    },
  },
} as const;

/** Os valores vazios de todos os campos. */
export function emptyFilters<S extends FilterSchema>(schema: S): FilterValues<S> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, def]) => [key, STRATEGIES[def.kind].empty()]),
  ) as FilterValues<S>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Algum campo longe do padrão? Busca conta, mesmo antes do debounce. */
export function hasActiveFilters<S extends FilterSchema>(
  schema: S,
  values: FilterValues<S>,
  defaults: FilterValues<S> = emptyFilters(schema),
): boolean {
  return (Object.keys(schema) as (keyof S)[]).some((key) => {
    const value = values[key];
    const normalized = typeof value === "string" ? value.trim() : value;
    return !same(normalized, defaults[key]);
  });
}

/** Os filtros ativos como chips removíveis, na ordem do schema. A busca nunca vira chip. */
export function filterChips<S extends FilterSchema>(
  schema: S,
  values: FilterValues<S>,
  onChange: (next: FilterValues<S>) => void,
): FilterChip[] {
  return (Object.entries(schema) as [keyof S & string, FilterDef][]).flatMap(([key, def]) => {
    const reset = (next: unknown) => onChange({ ...values, [key]: next });
    const chips = STRATEGIES[def.kind].chips as (
      def: FilterDef,
      value: unknown,
      reset: (next: unknown) => void,
      key: string,
    ) => FilterChip[];
    return chips(def, values[key], reset, key);
  });
}
