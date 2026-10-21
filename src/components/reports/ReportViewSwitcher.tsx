"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { Popover } from "@heroui/react";

import type { ReportView } from "./views";
import { Svg, type IconProps } from "@/components/ui/icons/Svg";
import { ChevronDownIcon } from "@/components/ui/icons/glyphs";

/** A opção escolhida pinta o próprio fundo só até o indicador medir. */
function optionClass(selected: boolean, hasThumb: boolean): string {
  if (!selected) return "text-gray-100 hover:bg-page hover:text-primary";
  return hasThumb ? "text-white" : "text-white bg-primary";
}

/**
 * Seletor das visões de Relatórios: controle segmentado na largura toda, com
 * o indicador que desliza até a visão escolhida.
 *
 * ## Por que segmentado, e não menu
 *
 * São cinco opções, e a graça é comparar: com todas à vista, trocar é um
 * clique e o usuário vê onde está sem abrir nada. Um menu esconderia as
 * outras quatro justamente de quem ainda não sabe que existem.
 *
 * ## O indicador é um só
 *
 * Em vez de cada botão pintar o próprio fundo, uma única pílula azul mede o
 * botão ativo e corre até ele — é o movimento que diz "trocou a visão, não a
 * página". Até a primeira medição (e no servidor) o botão ativo pinta o fundo
 * sozinho, para não aparecer um instante sem nada marcado.
 *
 * ## Teclado
 *
 * São rádios nativos (escondidos atrás do desenho): Tab entra só na opção
 * marcada e as setas trocam a visão — o navegador faz isso sozinho.
 *
 * ## A ordem é do usuário
 *
 * O botão no fim da barra abre "Ordem das abas", onde ele diz qual vem
 * primeiro e qual vem por último. A ordem em si (guardar, ler, restaurar) é
 * do `useReportViews`; aqui só se desenha e se pede a troca.
 */
export function ReportViewSwitcher({
  views,
  value,
  onChange,
  onMove,
  onResetOrder,
  isCustomOrder,
}: Readonly<{
  /** As visões já na ordem do usuário. */
  views: readonly ReportView[];
  value: string;
  onChange: (id: string) => void;
  /** Leva a visão `id` para a posição `to` (0 = primeira). */
  onMove: (id: string, to: number) => void;
  onResetOrder: () => void;
  isCustomOrder: boolean;
}>) {
  const listRef = useRef<HTMLDivElement>(null);
  const name = useId();
  const optionRefs = useRef(new Map<string, HTMLLabelElement>());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(
    null,
  );
  /** Liga a transição só depois da primeira posição — senão ela entra deslizando do canto. */
  const [animate, setAnimate] = useState(false);

  const measure = useCallback(() => {
    const button = optionRefs.current.get(value);
    if (!button) return;
    setThumb({ left: button.offsetLeft, width: button.offsetWidth });
  }, [value]);

  /** Muda quando a ordem muda: o botão ativo troca de lugar sem trocar de visão. */
  const orderKey = views.map((v) => v.id).join("|");

  useLayoutEffect(() => {
    measure();
    // Na fita rolável do celular, a visão escolhida não pode ficar fora da tela.
    optionRefs.current
      .get(value)
      ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [measure, value, orderKey]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    // A largura dos botões muda quando a fonte carrega e quando a tela muda.
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    if (!thumb || animate) return;
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [thumb, animate]);

  const active = views.find((v) => v.id === value) ?? views[0];

  return (
    <div className="flex w-full items-center gap-1 rounded-2xl bg-white p-1.5">
      <div
        ref={listRef}
        role="radiogroup"
        aria-label="Visão do relatório"
        className="relative flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]"
      >
        {thumb && (
          <span
            aria-hidden="true"
            className={`absolute top-0 bottom-0 left-0 rounded-xl bg-primary ${
              animate
                ? "transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
                : ""
            }`}
            style={{
              width: thumb.width,
              transform: `translateX(${thumb.left}px)`,
            }}
          />
        )}

        {views.map((view) => {
          const Icon = view.icon;
          const selected = view.id === active.id;
          return (
            <label
              key={view.id}
              ref={(node) => {
                if (node) optionRefs.current.set(view.id, node);
                else optionRefs.current.delete(view.id);
              }}
              className={`relative flex flex-1 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-secondary ${
                optionClass(selected, Boolean(thumb))
              }`}
            >
              <input
                type="radio"
                name={name}
                value={view.id}
                aria-label={view.label}
                checked={selected}
                onChange={() => onChange(view.id)}
                className="sr-only"
              />
              {/* Sem cor própria: herda a do rótulo, branca quando selecionado. */}
              <Icon className="h-4 w-4" />
              {view.label}
            </label>
          );
        })}
      </div>

      <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-black/10" />

      <OrderPopover
        views={views}
        onMove={onMove}
        onReset={onResetOrder}
        isCustom={isCustomOrder}
      />
    </div>
  );
}

/**
 * "Ordem das abas": a lista das visões, da primeira à última.
 *
 * Arrastar pela alça reordena ao vivo — a lista abre espaço enquanto o item
 * passa, em vez de só trocar no fim. As setas fazem o mesmo de um em um: é o
 * caminho do teclado e do celular, onde o arrastar nativo não funciona.
 * Cada mudança já vale e já fica guardada; não há "salvar".
 */
function OrderPopover({
  views,
  onMove,
  onReset,
  isCustom,
}: Readonly<{
  views: readonly ReportView[];
  onMove: (id: string, to: number) => void;
  onReset: () => void;
  isCustom: boolean;
}>) {
  const [dragging, setDragging] = useState<string | null>(null);

  const onDragOver = (event: DragEvent<HTMLLIElement>, index: number) => {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (views[index]?.id !== dragging) onMove(dragging, index);
  };

  return (
    <Popover>
      <Popover.Trigger
        aria-label="Ordenar as abas"
        className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl text-gray-100 transition-colors outline-none hover:bg-page hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <ReorderIcon className="h-4 w-4" />
      </Popover.Trigger>

      <Popover.Content placement="bottom end" className="w-80">
        <Popover.Dialog aria-label="Ordem das abas">
          <p className="text-sm font-semibold text-primary">Ordem das abas</p>
          <p className="mt-0.5 text-xs text-gray-100">
            Arraste ou use as setas. A primeira é a que abre por padrão.
          </p>

          <ol className="mt-3 flex flex-col gap-1">
            {views.map((view, index) => {
              const Icon = view.icon;
              const isDragging = dragging === view.id;
              return (
                // Arrastar é atalho do mouse; o teclado reordena pelas setas (MoveButton).
                <li // NOSONAR
                  key={view.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", view.id);
                    setDragging(view.id);
                  }}
                  onDragOver={(event) => onDragOver(event, index)}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={() => setDragging(null)}
                  className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors ${
                    isDragging ? "bg-primary/10" : "hover:bg-page"
                  }`}
                >
                  <GripIcon className="h-4 w-4 shrink-0 cursor-grab text-gray-100/60 active:cursor-grabbing" />
                  <span className="w-4 shrink-0 text-right text-xs text-gray-100 tabular-nums">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-primary">{view.label}</span>
                  <MoveButton
                    label={`Subir ${view.label}`}
                    disabled={index === 0}
                    onPress={() => onMove(view.id, index - 1)}
                  >
                    <ChevronDownIcon className="h-3.5 w-3.5 rotate-180" />
                  </MoveButton>
                  <MoveButton
                    label={`Descer ${view.label}`}
                    disabled={index === views.length - 1}
                    onPress={() => onMove(view.id, index + 1)}
                  >
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </MoveButton>
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={onReset}
            disabled={!isCustom}
            className="mt-3 text-xs font-medium text-secondary transition-colors hover:text-primary disabled:cursor-default disabled:text-gray-100/50"
          >
            Restaurar ordem padrão
          </button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function MoveButton({
  label,
  disabled,
  onPress,
  children,
}: Readonly<{
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-gray-100 transition-colors hover:bg-white hover:text-primary disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Duas setas opostas: "trocar de lugar". */
const ReorderIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
  </Svg>
);

const GripIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    {[6, 12, 18].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.5} />))}
  </svg>
);

