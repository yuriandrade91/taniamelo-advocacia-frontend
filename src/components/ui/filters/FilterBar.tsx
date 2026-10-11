"use client";

import { parseDate } from "@internationalized/date";
import { MultiSelectField, SelectField } from "@/components/ui/form/Field";
import { ActionButton } from "@/components/ui/actions/ActionGroup";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import dynamic from "next/dynamic";
import { useSlideHover } from "@/hooks/useSlideHover";
import { SearchIcon } from "@/components/ui/icons/glyphs";
import type { DateRange } from "./DateRangeField";
import type { DateSpan, FilterChip, FilterSchema, FilterValues } from "./filters";

/**
 * As peças das barras de filtro (Clientes, Carteira, Pagamentos, Agenda): o
 * desenho solto na página — campos brancos, busca grande, chips — num lugar
 * só. Cada tela monta a sua barra com elas; `FilterField` desenha um campo do
 * schema pelo tipo.
 */

/**
 * Superfície branca sem borda para os campos prontos (`Select`, período).
 * Com `!`: a `.form-border-style` do gatilho é CSS global fora das layers e
 * venceria as utilities.
 */
export const FIELD_SURFACE =
  "[&_.form-border-style]:h-12! [&_.form-border-style]:rounded-2xl! [&_.form-border-style]:border-transparent! [&_.form-border-style]:bg-white! [&_.form-border-style]:px-4! [&_.form-border-style]:transition [&_.form-border-style:hover]:bg-primary/5!";

/** Busca grande; a lupa fica azul enquanto o campo está ativo. */
export function SearchInput({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  /** Nome acessível ("Pesquisar lançamento"). */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`group/search relative block ${className}`}>
      <span className="sr-only">{label}</span>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-100/50 transition group-focus-within/search:text-primary" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl bg-white pr-4 pl-12 text-sm text-gray-100 ring-1 ring-transparent transition outline-none placeholder:text-gray-100/50 hover:bg-primary/5 focus:bg-white focus:ring-secondary/60"
      />
    </label>
  );
}

/**
 * `count`: número no selo; `null` carregando (círculo no lugar do número);
 * ausente, sem selo. `hint`: a linha de baixo, quando o rótulo sozinho não diz
 * o que a opção significa ("Entrada" / "Honorário do escritório").
 * `isDisabled`: a opção existe mas não se aplica agora ("Só pendências" sem
 * pendência nenhuma).
 */
type Segment = {
  id: string;
  label: string;
  active: boolean;
  count?: number | null;
  hint?: string;
  isDisabled?: boolean;
};

/**
 * O trilho sob os botões. `page` é para o segmentado que vive sobre branco
 * (dentro de uma modal), onde o trilho branco sumiria.
 *
 * É prop, e não `className`: entre duas utilitárias da mesma camada quem vence
 * é a ordem no CSS gerado, não a ordem no atributo. Com o mapa, só uma das
 * duas é escrita.
 */
const SEGMENTED_SURFACE = { white: "bg-white", page: "bg-page" } as const;

/**
 * O formato, como no `ActionGroup`: `rounded` (o padrão das barras de filtro)
 * ou `pill` (cápsula, o modelo de botões). Mapa de classes literais pelo mesmo
 * motivo da superfície — o Tailwind só gera o que encontra escrito, e duas
 * utilitárias da mesma camada não têm vencedor garantido.
 */
const SEGMENTED_SHAPE = {
  rounded: { track: "rounded-2xl", button: "rounded-xl" },
  pill: { track: "rounded-full", button: "rounded-full" },
} as const;

type SegmentedShape = keyof typeof SEGMENTED_SHAPE;

/**
 * A altura do trilho. `md` é a das barras de filtro, onde o segmentado fica
 * na linha da busca e do "Limpar filtros" (todos com 48px).
 *
 * `lg` é para dentro de uma modal: ali o segmentado encosta na grade de
 * campos, e 58px é exatamente a altura da caixa de um campo
 * (`formFields.css`) — com a dica em duas linhas, os 48px deixavam o texto
 * espremido contra a borda e mais baixo que tudo o que vem abaixo.
 *
 * Mapa de classes literais pelo mesmo motivo da superfície e do formato: o
 * Tailwind só gera o que encontra escrito, e duas utilitárias da mesma camada
 * não têm vencedor garantido.
 */
const SEGMENTED_HEIGHT = { md: "min-h-12", lg: "min-h-[58px]" } as const;

type SegmentedSize = keyof typeof SEGMENTED_HEIGHT;

/**
 * Botões segmentados. `radio` (um entre vários), `tab` (abas da lista) ou
 * `toggle` (cada um liga e desliga o seu).
 */
export function Segmented({
  label,
  mode,
  segments,
  onPress,
  surface = "white",
  shape = "rounded",
  size = "md",
  grow = false,
  className = "",
}: {
  label: string;
  mode: "radio" | "tab" | "toggle";
  segments: readonly Segment[];
  onPress: (id: string) => void;
  surface?: keyof typeof SEGMENTED_SURFACE;
  shape?: SegmentedShape;
  size?: SegmentedSize;
  /** Divide a largura entre as opções, em vez de cada uma ocupar o seu texto. */
  grow?: boolean;
  className?: string;
}) {
  const role = { radio: "radiogroup", tab: "tablist", toggle: "group" }[mode];
  return (
    <div
      role={role}
      aria-label={label}
      // `min-h`, e não `h`: com dica, o botão tem duas linhas. Os botões se
      // esticam pelo `align-items: stretch` do flex, e não por `h-full` —
      // altura em porcentagem contra um pai de altura indefinida vira `auto`,
      // e o segmento marcado encolhia para o tamanho do texto.
      className={`flex shrink-0 overflow-x-auto p-1 ${SEGMENTED_HEIGHT[size]} ${SEGMENTED_SHAPE[shape].track} ${SEGMENTED_SURFACE[surface]} ${grow ? "w-full" : ""} ${className}`}
    >
      {segments.map((segment) => (
        <SegmentButton
          key={segment.id}
          segment={segment}
          mode={mode}
          shape={shape}
          grow={grow}
          onPress={onPress}
        />
      ))}
    </div>
  );
}

/**
 * Um botão do `Segmented`. O fundo desliza no hover, como no menu
 * (`useSlideHover`): azul-claro passando, azul-marinho fixo no marcado.
 */
function SegmentButton({
  segment,
  mode,
  shape,
  grow,
  onPress,
}: {
  segment: Segment;
  mode: "radio" | "tab" | "toggle";
  shape: SegmentedShape;
  grow?: boolean;
  onPress: (id: string) => void;
}) {
  const { handlers, showLayer, layer } = useSlideHover(segment.active);
  return (
    <button
      type="button"
      {...(mode === "toggle"
        ? { "aria-pressed": segment.active }
        : { role: mode, [mode === "tab" ? "aria-selected" : "aria-checked"]: segment.active })}
      {...handlers}
      disabled={segment.isDisabled}
      onClick={() => onPress(segment.id)}
      className={`relative flex items-center overflow-hidden px-4 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        SEGMENTED_SHAPE[shape].button
      } ${grow ? "flex-1" : ""} ${segment.active ? "text-white" : "text-gray-100 hover:text-primary"}`}
    >
      {showLayer && (
        <span
          {...layer}
          className={`${layer.className} ${SEGMENTED_SHAPE[shape].button} ${segment.active ? "bg-primary" : "bg-primary/10"}`}
        />
      )}
      {/* `relative` para o rótulo e o selo ficarem acima da camada de fundo.
          Com dica, as duas linhas ficam alinhadas à esquerda. */}
      <span
        className={`relative flex items-center gap-2 ${segment.hint ? "w-full" : ""}`}
      >
        {segment.hint ? (
          <span className="flex flex-col items-start gap-0.5 text-left leading-tight">
            <span>{segment.label}</span>
            <span
              className={`text-[11px] font-normal ${segment.active ? "text-white/70" : "text-gray-100/70"}`}
            >
              {segment.hint}
            </span>
          </span>
        ) : (
          segment.label
        )}
        {segment.count !== undefined && (
          <span
            className={`inline-flex h-4 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] leading-4 tabular-nums ${
              segment.active ? "bg-secondary text-white" : "bg-page text-gray-100"
            }`}
          >
            {segment.count === null ? <LoadingCircle size={10} label={`Contando ${segment.label}`} /> : segment.count}
          </span>
        )}
      </span>
    </button>
  );
}

/** Os filtros ativos como chips removíveis. */
export function FilterChips({ chips, className = "mt-3" }: { chips: readonly FilterChip[]; className?: string }) {
  if (chips.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full bg-primary py-1 pr-1 pl-3 text-xs font-medium text-white"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remover filtro ${chip.label}`}
            onClick={chip.remove}
            className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-white/20"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

/** "Limpar filtros" — só quando há o que limpar. */
export function ClearFilters({ isVisible, onClear }: { isVisible: boolean; onClear: () => void }) {
  if (!isVisible) return null;
  return (
    <ActionButton tone="neutral" shape="pill" className="h-12 shrink-0" onClick={onClear}>
      Limpar filtros
    </ActionButton>
  );
}

/** O calendário de intervalo é pesado e só serve às barras com período: vem sob demanda. */
const DateRangeField = dynamic(() => import("./DateRangeField").then((m) => m.DateRangeField), { ssr: false });

const toRange = ({ from, to }: DateSpan): DateRange => {
  if (!from || !to) return null;
  try {
    return { start: parseDate(from), end: parseDate(to) };
  } catch {
    return null;
  }
};

/** Um campo do schema, desenhado pelo tipo. */
export function FilterField<S extends FilterSchema, K extends keyof S & string>({
  schema,
  name,
  values,
  onChange,
  className = "min-w-40 flex-1",
}: {
  schema: S;
  name: K;
  values: FilterValues<S>;
  onChange: (key: K, value: FilterValues<S>[K]) => void;
  className?: string;
}) {
  const def = schema[name];
  const set = (value: unknown) => onChange(name, value as FilterValues<S>[K]);
  switch (def.kind) {
    case "search":
      return (
        <SearchInput
          label={def.label}
          placeholder={def.placeholder}
          value={values[name] as string}
          onChange={set}
          className={className}
        />
      );
    case "select":
      return (
        <SelectField
          label={def.label}
          labelInside
          placeholder={def.placeholder}
          className={`${className} ${FIELD_SURFACE}`}
          options={def.options}
          selectedKey={values[name] as string}
          onSelectionChange={set}
        />
      );
    case "multi":
      return (
        <MultiSelectField
          label={def.label}
          placeholder={def.placeholder}
          hideLabel
          className={`${className} ${FIELD_SURFACE}`}
          options={def.options}
          selectedKeys={values[name] as string[]}
          onSelectionChange={set}
        />
      );
    case "dateRange":
      return (
        <div className={`min-w-60 shrink-0 ${FIELD_SURFACE}`}>
          <DateRangeField
            value={toRange(values[name] as DateSpan)}
            onChange={(range) => set({ from: range?.start.toString() ?? "", to: range?.end.toString() ?? "" })}
          />
        </div>
      );
  }
}
