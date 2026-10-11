"use client";

import {
  createContext,
  useContext,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

/**
 * O modelo de botões da barra de ações do painel de detalhes da Carteira
 * (`wallet/DetailBento.tsx`), para as outras telas falarem a mesma língua.
 *
 * - `ActionGroup`: o contêiner — fundo claro arredondado com filete, os
 *   botões dentro dele como segmentos.
 * - `ActionButton`:
 *   - `primary`: a ação principal, azul da marca, larga, em negrito;
 *   - `secondary`: dourado (o mesmo do lápis das tabelas), com ícone;
 *   - `neutral`: cinza, para sair/voltar;
 *   - `danger`: a ação principal quando ela destrói (excluir);
 *   - `onDark`: para superfície azul-marinho (cabeçalho da página, barra de
 *     filtros) — os outros tons somem ou brigam com o fundo escuro.
 * - `ChipButton`: o botão pequeno com contorno ("Copiar", "Ver ficha").
 *
 * Todos encolhem um pouco ao toque (`active:scale`), menos para quem pede
 * menos movimento. As classes são literais, não montadas por interpolação:
 * o Tailwind só gera o que encontra escrito.
 */

const PRESS =
  "transition active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const ACTION_TONE = {
  primary:
    "bg-primary font-semibold text-white hover:bg-primary/90 disabled:hover:bg-primary",
  secondary: "font-medium text-secondary hover:bg-white",
  neutral: "font-medium text-gray-100 hover:bg-white hover:text-primary",
  danger:
    "bg-danger font-semibold text-white hover:bg-danger/90 disabled:hover:bg-danger",
  onDark:
    "bg-white/15 font-medium text-white hover:bg-white/25 disabled:hover:bg-white/15",
} as const;

type ActionTone = keyof typeof ACTION_TONE;

/**
 * Formato: `rounded` (o padrão, cantos suaves) ou `pill` (cápsula). Um mapa
 * por peça, com classes literais — passar `rounded-full` por `className`
 * disputaria com o `rounded-xl` da própria peça, sem vencedor garantido.
 */
type ActionShape = "rounded" | "pill";

const GROUP_SHAPE: Record<ActionShape, string> = {
  rounded: "rounded-2xl",
  pill: "rounded-full",
};

const BUTTON_SHAPE: Record<ActionShape, string> = {
  rounded: "rounded-xl",
  pill: "rounded-full",
};

const CHIP_SHAPE: Record<ActionShape, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full",
};

/**
 * A superfície sob o grupo. `dark` é o par de `tone="onDark"`: sobre o
 * azul-marinho (ou o gradiente da marca) o fundo claro do grupo viraria uma
 * placa clara no meio do painel.
 *
 * É prop, e não `className`: `bg-white/10` passado por fora disputaria com o
 * `bg-page` daqui, e entre duas utilitárias da mesma camada quem vence é a
 * ordem no CSS gerado — não a ordem no atributo. Com o mapa, só uma das duas
 * é escrita.
 */
const GROUP_SURFACE = {
  light: "bg-page ring-light-gray",
  dark: "bg-white/10 ring-white/20",
} as const;

type ActionSurface = keyof typeof GROUP_SURFACE;

/**
 * O formato do grupo chega aos botões dele: `<ActionGroup shape="pill">`
 * basta, sem repetir `shape` em cada `ActionButton`. Fora de um grupo, vale
 * o `shape` do próprio botão (ou `rounded`).
 */
const ShapeContext = createContext<ActionShape>("rounded");

export function ActionGroup({
  children,
  shape = "rounded",
  surface = "light",
  className = "",
}: {
  children: ReactNode;
  shape?: ActionShape;
  surface?: ActionSurface;
  className?: string;
}) {
  return (
    <ShapeContext.Provider value={shape}>
      <div
        className={`flex gap-1.5 p-1.5 ring-1 ${GROUP_SURFACE[surface]} ${GROUP_SHAPE[shape]} ${className}`}
      >
        {children}
      </div>
    </ShapeContext.Provider>
  );
}

type ActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  tone?: ActionTone;
  icon?: ReactNode;
  /** Ocupa o espaço que sobrar — a ação principal costuma ser a larga. */
  grow?: boolean;
  shape?: ActionShape;
  /**
   * Envia o formulário em volta (o "Salvar" de um `FormModal`), em vez de só
   * responder ao clique. É prop, e não `type` solto: botão de ação dentro de
   * um formulário vira submit sem querer, e o Enter num campo passa a disparar
   * o que estiver primeiro.
   */
  isSubmit?: boolean;
};

export function ActionButton({
  tone = "secondary",
  icon,
  grow = false,
  shape,
  isSubmit = false,
  className = "",
  children,
  ...props
}: ActionButtonProps) {
  const groupShape = useContext(ShapeContext);
  return (
    <button
      type={isSubmit ? "submit" : "button"}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap ${BUTTON_SHAPE[shape ?? groupShape]} ${PRESS} ${ACTION_TONE[tone]} ${grow ? "flex-1" : ""} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

const CHIP_TONE = {
  primary: "text-primary",
  secondary: "text-secondary",
  danger: "text-danger",
} as const;

export function ChipButton({
  tone = "secondary",
  icon,
  shape = "rounded",
  className = "",
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  tone?: keyof typeof CHIP_TONE;
  icon?: ReactNode;
  shape?: ActionShape;
}) {
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center gap-1.5 px-2.5 ${CHIP_SHAPE[shape]} py-1.5 text-xs font-medium ring-1 ring-light-gray hover:bg-page ${PRESS} ${CHIP_TONE[tone]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
