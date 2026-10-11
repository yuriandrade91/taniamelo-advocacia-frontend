"use client";

import type { ReactNode } from "react";
import { Skeleton, Tabs, Tooltip } from "@heroui/react";
import {
  TAB_CLASS,
  TAB_INDICATOR_CLASS,
  TAB_LIST_CLASS,
  TAB_LIST_CONTAINER_CLASS,
} from "./tabStyle";

/**
 * As abas da aplicação no desenho de `tabStyle` — a única porta para ele.
 *
 * - `SegmentedTabs`: o caso comum, abas e painéis a partir de uma lista. Com
 *   `hideSingle`, uma aba só não vira barra: aparece o conteúdo, sem uma
 *   "aba" que não tem de quem se distinguir.
 * - `TabBar` + `TabItem`: para quem monta os próprios painéis (o cadastro em
 *   seções, a agenda por mês) e precisa só da barra e das abas.
 * - `CountBadge`: o selo numérico à direita do nome da aba.
 * - `TabBarSkeleton`: a barra enquanto as abas ainda não chegaram.
 */

/** A barra: contêiner e lista, com ações à direita (o "Adicionar"). */
export function TabBar({
  label,
  actions,
  className = "",
  children,
}: {
  /** Nome acessível da lista. */
  label: string;
  /** Ações que não são aba — ficam na barra, fora da lista. */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const list = (
    <Tabs.List aria-label={label} className={TAB_LIST_CLASS}>
      {children}
    </Tabs.List>
  );

  if (!actions) {
    return (
      <Tabs.ListContainer className={`${TAB_LIST_CONTAINER_CLASS} ${className}`}>
        {list}
      </Tabs.ListContainer>
    );
  }

  // Com ações, a moldura passa para fora: o `ListContainer` é a área rolável
  // do HeroUI, e um botão dentro dele rolaria junto com as abas. Ele ocupa o
  // que sobra (`flex-1`) — estreito, o HeroUI esmaece a direita como se
  // houvesse mais abas escondidas.
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${TAB_LIST_CONTAINER_CLASS} ${className}`}
    >
      <Tabs.ListContainer className="min-w-0 flex-1 bg-transparent">
        {list}
      </Tabs.ListContainer>
      <div className="ml-auto flex shrink-0 items-center gap-2 pr-1.5">
        {actions}
      </div>
    </div>
  );
}

/** Uma aba: o conteúdo e o fundo azul de quando está ativa. */
export function TabItem({
  id,
  className = "",
  indicatorClassName = TAB_INDICATOR_CLASS,
  children,
}: {
  id: string;
  className?: string;
  indicatorClassName?: string;
  children: ReactNode;
}) {
  return (
    <Tabs.Tab id={id} className={`${TAB_CLASS} ${className}`}>
      {children}
      <Tabs.Indicator className={indicatorClassName} />
    </Tabs.Tab>
  );
}

const BADGE_TONE = {
  /** Quanto falta: dourado, firme também na aba ativa. */
  pending: "bg-secondary text-white",
  /** Quantos há: dourado, que se apaga no azul da aba ativa. */
  accent: "bg-secondary text-white group-data-[selected=true]:bg-white/20",
  /** Quantos há, discreto: cinza. */
  neutral:
    "bg-page text-gray-100 group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white",
} as const;

/**
 * O selo numérico da aba. O número sozinho não diz se é "quantos há" ou
 * "quantos faltam": `tip` explica — no tooltip para quem passa o mouse, e em
 * `sr-only` para o leitor de tela, porque o tooltip não é anunciado de dentro
 * de uma aba. Sem `tip`, só o selo: a aba já diz o número por extenso.
 */
export function CountBadge({
  count,
  tip,
  tone = "neutral",
}: {
  count: number;
  tip?: string;
  tone?: keyof typeof BADGE_TONE;
}) {
  if (count <= 0) return null;
  const badge = (
    <span
      aria-hidden="true"
      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${BADGE_TONE[tone]}`}
    >
      {count}
    </span>
  );
  if (!tip) return badge;

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex">
        {badge}
        <span className="sr-only"> ({tip})</span>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <p className="text-xs text-gray-100">{tip}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/** A barra enquanto as abas não chegaram: a moldura de verdade, abas em skeleton. */
export function TabBarSkeleton({
  count = 3,
  tabClassName = "h-9 w-20",
}: {
  count?: number;
  tabClassName?: string;
}) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-1.5 ${TAB_LIST_CONTAINER_CLASS}`}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`rounded-xl ${tabClassName}`} />
      ))}
    </div>
  );
}

type SegmentedTab = {
  id: string;
  /** O que vai na aba, além do indicador: nome, selo. */
  label: ReactNode;
  content: ReactNode;
};

export function SegmentedTabs({
  tabs,
  selectedKey,
  onSelectionChange,
  label,
  actions,
  hideSingle = false,
  className = "gap-5",
  panelClassName = "p-0",
}: {
  tabs: readonly SegmentedTab[];
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  /** Nome acessível da lista. */
  label: string;
  actions?: ReactNode;
  /** Uma aba só não vira barra: o conteúdo aparece direto, com as ações acima. */
  hideSingle?: boolean;
  className?: string;
  panelClassName?: string;
}) {
  if (hideSingle && tabs.length === 1) {
    return (
      <div className={`flex flex-col ${className}`}>
        {actions && <div className="flex justify-end gap-2">{actions}</div>}
        <div className={panelClassName}>{tabs[0].content}</div>
      </div>
    );
  }

  return (
    // `key` pela quantidade: o indicador do HeroUI é medido em JS e, com uma
    // aba nova nascendo já selecionada, ficava com a medida velha (por cima de
    // duas abas). Remontar mede de novo; o estado mora em quem chama.
    <Tabs
      key={tabs.length}
      selectedKey={selectedKey}
      onSelectionChange={(key) => onSelectionChange(String(key))}
      className={className}
    >
      <TabBar label={label} actions={actions}>
        {tabs.map((tab) => (
          <TabItem key={tab.id} id={tab.id}>
            {tab.label}
          </TabItem>
        ))}
      </TabBar>

      {tabs.map((tab) => (
        <Tabs.Panel key={tab.id} id={tab.id} className={panelClassName}>
          {tab.content}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
