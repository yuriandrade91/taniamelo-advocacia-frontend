"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Tooltip } from "@heroui/react";
import { CheckIcon } from "@/components/ui/icons/glyphs";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import { ProgressRing } from "../form/ProgressRing";

/**
 * As peças da ficha do cliente: o painel lateral, o cartão de uma seção, a
 * fita de seções do celular e a ancoragem entre eles.
 *
 * A identidade fica presa à esquerda enquanto a ficha corre à direita: nome,
 * benefício, o quanto do cadastro está preenchido e por onde andar.
 *
 * Só isso. Nascimento, idade, etapa, telefones e e-mail saíram do painel:
 * todos aparecem inteiros nos cartões ao lado, e repetidos aqui ele virava uma
 * segunda ficha — mais estreita, e que começa a discordar do campo ao lado no
 * instante em que alguém digita nele.
 *
 * O anel é o `ProgressRing` do cadastro, verde sobre o gradiente da marca.
 *
 * Tudo aqui é apresentação: nada conhece cliente, service nem formulário. Quem
 * usa monta as seções e as ações.
 */

export type SheetNavItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  /** À direita do nome: "5/7", "3 arquivos". Nada quando não há o que contar. */
  badge?: string;
  /** Seção inteira preenchida — vira o ✓ verde, no lugar da contagem. */
  isComplete?: boolean;
};

export type SheetSidebarProps = {
  name: string;
  benefit: string;
  /** 0–100. */
  progress: number;
  /** Carregando: o anel em espera; o resto da moldura aparece de verdade. */
  isLoading?: boolean;
  items: readonly SheetNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /** As ações, no pé do painel — sempre à vista, sem depender da rolagem. */
  actions: ReactNode;
  /** Faixa de erro acima das ações (o erro do último salvamento). */
  error?: ReactNode;
};

export function SheetSidebar({
  name,
  benefit,
  progress,
  isLoading = false,
  items,
  activeId,
  onSelect,
  actions,
  error,
}: SheetSidebarProps) {
  return (
    <aside className="flex shrink-0 flex-col gap-5 rounded-2xl bg-gradient-brand p-5 text-white md:w-72 md:overflow-y-auto lg:w-80">
      {/* No celular o painel vira uma faixa: nome de um lado, anel pequeno do
          outro. No `md` ele é coluna, e o anel grande vai para o meio. */}
      <div className="flex items-center gap-4 md:flex-col md:items-stretch">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold md:whitespace-normal md:text-2xl" title={name}>
            {name}
          </h2>
          <p className="text-sm text-white/70">{benefit || "Benefício a definir"}</p>
        </div>

        <div className="hidden md:flex md:justify-center md:py-2">
          {isLoading ? (
            <span className="grid h-32 w-32 place-items-center">
              <LoadingCircle size={112} label="Carregando a ficha" />
            </span>
          ) : (
            <ProgressRing value={progress} size={128} caption="completo" label="Preenchimento do cadastro" />
          )}
        </div>
        <div className="md:hidden">
          {isLoading ? (
            <LoadingCircle size={44} label="Carregando a ficha" />
          ) : (
            <ProgressRing value={progress} size={44} label="Preenchimento do cadastro" />
          )}
        </div>
      </div>

      {/*
        A navegação não esconde seção nenhuma: leva até ela
        (`useSectionAnchors`) e acende sozinha conforme a leitura passa. Só
        existe no `md` para cima — no celular as seções viram a fita de
        pílulas acima do conteúdo (`SheetSectionTabs`), porque uma lista de nove
        itens empurraria a ficha para fora da primeira tela.
      */}
      <nav aria-label="Seções da ficha" className="hidden md:block">
        <ol className="flex flex-col gap-0.5">
          {items.map((item) => {
            const on = item.id === activeId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={on ? "location" : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-secondary motion-reduce:transition-none ${
                    on ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {on && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-secondary" />}
                  {item.icon}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.isComplete ? (
                    <CheckIcon className="h-4 w-4 shrink-0 text-success" />
                  ) : item.badge ? (
                    <span className="shrink-0 text-xs tabular-nums text-white/60">{item.badge}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-col gap-2 md:mt-auto">
        {error}
        {actions}
      </div>
    </aside>
  );
}

/**
 * O cartão de uma seção, à direita do painel.
 *
 * O cabeçalho é o do cadastro: faixa creme (`bg-floral`) com filete embaixo,
 * ícone no quadro dourado-claro, título e a frase da seção — a mesma moldura
 * que separa as seções lá, agora separando estas.
 *
 * `data-spy` é o que a ancoragem observa (`useSectionAnchors`).
 */
export function SheetSectionCard({
  id,
  label,
  blurb,
  icon,
  badge,
  children,
}: {
  id: string;
  label: string;
  blurb?: string;
  icon?: ReactNode;
  /** "5/7", "3 arquivos" — nada nas seções que não contam campos. */
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section
      data-spy={id}
      aria-label={label}
      className="scroll-mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
    >
      <header className="flex items-center gap-3 border-b border-light-gray/70 bg-floral px-5 py-4 sm:px-6">
        {icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-light-secondary text-secondary">
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary">{label}</h3>
          {blurb && <p className="text-sm text-gray-100">{blurb}</p>}
        </div>
        {badge && (
          <span className="hidden shrink-0 rounded-full bg-page px-2.5 py-1 text-xs text-gray-100 tabular-nums sm:inline">
            {badge}
          </span>
        )}
      </header>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

/** A fita de seções do celular — a navegação do painel, deitada. */
export function SheetSectionTabs({
  items,
  activeId,
  onSelect,
}: {
  items: readonly SheetNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Seções da ficha" className="md:hidden">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {items.map((item) => {
          const on = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={on ? "location" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                  on ? "bg-primary text-white" : "bg-white text-gray-100 ring-1 ring-light-gray hover:text-primary"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A ancoragem das seções: a coluna que rola, a seção que está sendo lida e o
 * "me leve até esta".
 *
 * `key` precisa mudar sempre que as seções mudarem **ou passarem a existir no
 * DOM**: quando aparece "Deficiência", e quando a ficha sai do estado de carga
 * (antes disso a coluna ainda não tem seção nenhuma, e o observador assinaria
 * o vazio — o item aceso nunca mais acompanharia a rolagem).
 *
 * A faixa de interesse é o terço de cima da coluna (`rootMargin` corta 60% de
 * baixo): sem isso, uma seção curta no fim nunca seria "a mais alta visível" e
 * o painel apontaria para a anterior.
 *
 * `seen` é outra pergunta: quais seções **já apareceram** na coluna, em
 * qualquer altura. É o que destrava a seção que carrega sob demanda
 * (Pagamentos). Usar a seção acesa para isso deixava Pagamentos em skeleton
 * para sempre: curta e perto do fim, ela pode nunca chegar ao terço de cima —
 * a seção anterior continua lá até a rolagem acabar. Só cresce: o que já
 * carregou não desmonta ao sair de vista.
 */
export function useSectionAnchors(initial: string, key: string) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initial);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set([initial]));

  const markSeen = useCallback(
    (ids: readonly string[]) =>
      setSeen((current) => (ids.every((id) => current.has(id)) ? current : new Set([...current, ...ids]))),
    [],
  );

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-spy]"));
    const appeared = new IntersectionObserver(
      (entries) =>
        markSeen(
          entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => (entry.target as HTMLElement).dataset.spy ?? ""),
        ),
      { root, threshold: 0 },
    );
    sections.forEach((section) => appeared.observe(section));
    return () => appeared.disconnect();
  }, [key, markSeen]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-spy]"));
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.spy ?? "";
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = sections.find((s) => visible.has(s.dataset.spy ?? ""));
        if (first?.dataset.spy) setActive(first.dataset.spy);
      },
      { root, rootMargin: "0px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [key]);

  const goTo = (id: string) => {
    setActive(id);
    markSeen([id]);
    const target = scrollerRef.current?.querySelector<HTMLElement>(`[data-spy="${id}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return { scrollerRef, active, seen, goTo };
}

/**
 * Ação só de ícone, com dica.
 *
 * O gatilho é o `Button` do HeroUI de propósito: o `TooltipTrigger` do React
 * Aria injeta os handlers de hover e foco por contexto, e um `<button>` nativo
 * — o do `ActionButton` — nunca os recebe, então a dica não abriria. É a mesma
 * conclusão de `ui/table/ActionButton.tsx`, aqui no tom do fundo escuro.
 */
export function SidebarTipButton({
  label,
  onPress,
  isDisabled,
  children,
}: {
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip delay={0}>
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <p>{label}</p>
      </Tooltip.Content>
      <Button
        type="button"
        variant="ghost"
        aria-label={label}
        onPress={onPress}
        isDisabled={isDisabled}
        className="flex h-10 w-10 min-w-10 items-center justify-center rounded-xl bg-white/15 p-0 text-white hover:bg-white/25 disabled:opacity-50"
      >
        {children}
      </Button>
    </Tooltip>
  );
}
