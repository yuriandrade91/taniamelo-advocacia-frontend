"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Skeleton } from "@heroui/react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import {
  CalendarIcon,
  DocumentIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/ui/icons/glyphs";
import { TONE_SOFT, type Tone } from "@/components/ui/models/viz";
import {
  ApptTile,
  BUCKET_TONE,
  IconTile,
  Illustrative,
  Kicker,
  PlusIcon,
  STAGES,
  activeAppointments,
  bucketLabel,
  dayLabel,
  dueLabel,
  leadsValue,
  localTime,
  money,
  nextStageOf,
  stageOf,
  usePipeline,
  useNow,
} from "./homeKit";
import { financeEmptyText, isTypingTarget, normalizeText, openPayments } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 11 · Paleta de comandos — o Início começa por uma busca.
 *
 * Um campo grande no estilo ⌘K filtra, sem ir ao servidor, tudo o que a home
 * já tem: atalhos, clientes da esteira, recebimentos, compromissos e
 * documentos. ↑ ↓ escolhe, ↵ abre, ⇧↵ avança o cliente para a próxima etapa.
 * ⌘K, Ctrl+K ou "/" trazem o foco de volta ao campo.
 */

type GroupKey = "acoes" | "clientes" | "recebimentos" | "agenda" | "documentos";

type Entry = {
  id: string;
  group: GroupKey;
  title: string;
  detail: string;
  hint?: string;
  hintTone?: Tone;
  leading: ReactNode;
  run: () => void;
  /** Ação secundária (⇧↵). */
  alt?: { label: string; run: () => void };
  haystack: string;
};

const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "acoes", label: "Ações" },
  { key: "clientes", label: "Clientes" },
  { key: "recebimentos", label: "Recebimentos" },
  { key: "agenda", label: "Agenda" },
  { key: "documentos", label: "Documentos" },
];

const SUGGESTIONS = ["hoje", "atrasado", "audiência", "análise", "crítico"];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded-md border border-black/10 bg-page px-1.5 py-0.5 font-sans text-[10px] font-medium text-primary shadow-[0_1px_0_rgba(0,0,0,0.08)]">
      {children}
    </kbd>
  );
}

export function PaletteModel(props: HomeModelProps) {
  const {
    pendingCount,
    canSeeFinance,
    upcomingPayments,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow();
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<GroupKey | "tudo">("tudo");
  const [active, setActive] = useState(0);
  const { columns, move } = usePipeline(pipeline, actions.moveCard);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !isTypingTarget(event.target);
      if (!combo && !slash) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Tudo o que a paleta sabe achar ──
  const entries: Entry[] = [
    {
      id: "a-novo",
      group: "acoes",
      title: "Novo cliente",
      detail: "Abrir o cadastro em branco",
      leading: <IconTile icon={PlusIcon} tone="primary" size="sm" />,
      run: actions.newClient,
      haystack: "novo cliente cadastro criar adicionar",
    },
    {
      id: "a-leads",
      group: "acoes",
      title: "Ver leads",
      detail: "Formulários que ainda não viraram clientes",
      hint: `${leadsValue(pendingCount)} aguardando`,
      hintTone: "secondary",
      leading: <IconTile icon={UsersIcon} tone="secondary" size="sm" />,
      run: actions.openLeads,
      haystack: "leads formularios pendentes contato aguardando",
    },
    {
      id: "a-clientes",
      group: "acoes",
      title: "Abrir clientes",
      detail: "Lista completa do escritório",
      leading: <IconTile icon={UserIcon} tone="sky" size="sm" />,
      run: actions.openClients,
      haystack: "clientes lista todos",
    },
    {
      id: "a-agenda",
      group: "acoes",
      title: "Abrir agenda",
      detail: "Audiências, perícias, prazos e reuniões",
      leading: <IconTile icon={CalendarIcon} tone="violet" size="sm" />,
      run: actions.openAgenda,
      haystack: "agenda compromissos audiencia pericia prazo reuniao",
    },
    {
      id: "a-pagamentos",
      group: "acoes",
      title: "Ver pagamentos",
      detail: "Recebimentos dos clientes",
      leading: <IconTile icon={WalletIcon} tone="success" size="sm" />,
      run: actions.seeAllPayments,
      haystack: "pagamentos recebimentos financeiro parcelas",
    },
  ];

  for (const stage of STAGES) {
    for (const card of columns[stage.key]) {
      const current = stageOf(card.situation);
      const next = nextStageOf(card.situation);
      entries.push({
        id: `c-${card.id}`,
        group: "clientes",
        title: card.name,
        detail: `Desde ${card.date}`,
        hint: current.short,
        hintTone: current.tone,
        leading: (
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-semibold ${TONE_SOFT[current.tone]}`}
          >
            {card.name.trim().slice(0, 1).toUpperCase() || "?"}
          </span>
        ),
        run: actions.openClients,
        alt: next ? { label: `Avançar para ${next.short}`, run: () => move(card.id, next.key) } : undefined,
        haystack: `${card.name} ${current.label} ${current.short} cliente`,
      });
    }
  }

  for (const p of canSeeFinance ? openPayments(upcomingPayments) : []) {
    const bucket = bucketOf(p);
    entries.push({
      id: `p-${p.id}`,
      group: "recebimentos",
      title: p.clientName,
      detail: `${p.description || "Parcela"} · ${dueLabel(p.dueDate, now)}`,
      hint: p.amount ? money(p.amount) : bucketLabel(bucket),
      hintTone: BUCKET_TONE[bucket],
      leading: <IconTile icon={WalletIcon} tone={BUCKET_TONE[bucket]} size="sm" />,
      run: actions.seeAllPayments,
      haystack: `${p.clientName} ${p.description} ${bucketLabel(bucket)} recebimento pagamento`,
    });
  }

  for (const a of activeAppointments(upcomingAppointments)) {
    const when = dayLabel(a.startAt, now);
    entries.push({
      id: `g-${a.id}`,
      group: "agenda",
      title: a.title,
      detail: [String(a.type), a.clientName?.trim()].filter(Boolean).join(" · "),
      hint: `${when} · ${localTime(a.startAt)}`,
      hintTone: "violet",
      leading: <ApptTile type={String(a.type)} size="sm" />,
      run: actions.openAgenda,
      haystack: `${a.title} ${a.type} ${a.clientName ?? ""} ${a.modality ?? ""} ${when} compromisso`,
    });
  }

  for (const d of pendingDocuments) {
    entries.push({
      id: `d-${d.id}`,
      group: "documentos",
      title: d.name,
      detail: d.issue,
      hint: d.isCritical ? "Crítico" : "Pendente",
      hintTone: d.isCritical ? "danger" : "gray",
      leading: <IconTile icon={DocumentIcon} tone={d.isCritical ? "danger" : "gray"} size="sm" />,
      run: actions.openClients,
      haystack: `${d.name} ${d.issue} ${d.isCritical ? "critico" : "pendente"} documento`,
    });
  }

  // ── Filtro ──
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  const searching = tokens.length > 0;
  const matches = entries.filter((e) => {
    if (scope !== "tudo" && e.group !== scope) return false;
    const hay = normalizeText(`${e.title} ${e.detail} ${e.haystack}`);
    return tokens.every((t) => hay.includes(t));
  });
  const cap = scope !== "tudo" ? 50 : searching ? 8 : 4;
  const grouped = GROUPS.filter((g) => scope === "tudo" || g.key === scope).map((g) => {
    const all = matches.filter((e) => e.group === g.key);
    const limit = g.key === "acoes" ? 5 : cap;
    return { ...g, items: all.slice(0, limit), hidden: Math.max(0, all.length - limit) };
  });
  const visibleGroups = grouped.map((g, i) => ({
    ...g,
    start: grouped.slice(0, i).reduce((sum, prev) => sum + prev.items.length, 0),
  }));
  const flat = visibleGroups.flatMap((g) => g.items);
  const activeIndex = flat.length ? Math.min(active, flat.length - 1) : -1;
  const activeEntry = activeIndex >= 0 ? flat[activeIndex] : undefined;
  const optionId = (index: number) => `${baseId}-opt-${index}`;
  const countOf = (key: GroupKey) => entries.filter((e) => e.group === key).length;

  const focusOption = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && flat.length) {
      event.preventDefault();
      focusOption((activeIndex + 1) % flat.length);
    } else if (event.key === "ArrowUp" && flat.length) {
      event.preventDefault();
      focusOption((activeIndex - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter" && activeEntry) {
      event.preventDefault();
      if (event.shiftKey && activeEntry.alt) activeEntry.alt.run();
      else activeEntry.run();
    } else if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
        setActive(0);
      } else {
        inputRef.current?.blur();
      }
    }
  };

  const fill = (text: string) => {
    setQuery(text);
    setActive(0);
    inputRef.current?.focus();
  };

  const emptyLine = (key: GroupKey): ReactNode => {
    if (key === "agenda" && upcomingAppointments === null)
      return (
        <div className="flex flex-col gap-1.5 px-3 py-1" aria-busy="true" aria-label="Carregando">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      );
    const text: Record<GroupKey, string> = {
      acoes: "",
      clientes: "Nenhum cliente na esteira ainda.",
      recebimentos: financeEmptyText(canSeeFinance),
      agenda: "Agenda livre — nenhum compromisso à frente.",
      documentos: "Nenhum documento pendente.",
    };
    return <p className="px-3 py-2 text-xs text-gray-100/70">{text[key]}</p>;
  };

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-white px-4 py-8 ring-1 ring-black/5 sm:px-10 sm:py-14">
      <span className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgba(9,13,76,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(9,13,76,0.05)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <span className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-80 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-secondary/20 blur-[100px]" />

      <header className="mx-auto max-w-3xl text-center">
        <Kicker className="text-secondary">Paleta de comandos · {periodLabel}</Kicker>
        <h1 className="mt-3 text-3xl font-light tracking-tight text-primary sm:text-5xl">
          O que você quer fazer agora?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-gray-100">
          Busque um cliente, um recebimento ou um compromisso — ou dispare uma ação. Tudo sem sair do Início.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl bg-white/90 shadow-[0_30px_80px_-24px_rgba(9,13,76,0.4)] ring-1 ring-primary/10 backdrop-blur">
        {/* Campo */}
        <div className="flex items-center gap-3 border-b border-black/5 px-4 py-4 sm:px-5">
          <SearchIcon className="h-5 w-5 shrink-0 text-secondary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar clientes, pagamentos, agenda…"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-label="Buscar no Início"
            className="min-w-0 flex-1 bg-transparent text-lg text-primary outline-none placeholder:text-gray-100/50 sm:text-xl"
          />
          {query ? (
            <button
              type="button"
              onClick={() => fill("")}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-gray-100 transition hover:bg-page hover:text-primary"
            >
              Limpar
            </button>
          ) : (
            <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          )}
        </div>

        {/* Escopo */}
        <div className="flex flex-wrap gap-1.5 border-b border-black/5 px-3 py-2.5 sm:px-4" role="group" aria-label="Filtrar por tipo">
          {[{ key: "tudo" as const, label: "Tudo" }, ...GROUPS].map((g) => {
            const on = scope === g.key;
            return (
              <button
                key={g.key}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setScope(g.key);
                  setActive(0);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  on ? "bg-primary text-white" : "bg-page text-gray-100 hover:text-primary"
                }`}
              >
                {g.label}
                {g.key !== "tudo" && (
                  <span className={`tabular-nums ${on ? "text-white/60" : "text-gray-100/60"}`}>{countOf(g.key)}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Resultados */}
        <ul id={`${baseId}-list`} role="listbox" aria-label="Resultados" className="max-h-[30rem] overflow-y-auto p-2">
          {searching && flat.length === 0 && (
            <li role="presentation" className="px-3 py-10 text-center text-sm text-gray-100">
              Nada encontrado para “{query.trim()}”.
              <span className="mt-1 block text-xs text-gray-100/70">Tente o nome do cliente, a etapa ou o tipo do compromisso.</span>
            </li>
          )}
          {visibleGroups.map((g) => {
            if (searching && g.items.length === 0) return null;
            return (
              <li key={g.key} role="presentation" className="pb-1">
                <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                  <span className="text-[11px] font-medium tracking-[0.18em] text-gray-100/70 uppercase">{g.label}</span>
                  {g.key === "documentos" && <Illustrative />}
                  {g.hidden > 0 && <span className="ml-auto text-[11px] text-gray-100/60">+{g.hidden}</span>}
                </div>
                {g.items.length === 0 ? (
                  emptyLine(g.key)
                ) : (
                  <ul role="presentation" className="flex flex-col gap-0.5">
                    {g.items.map((e, i) => {
                      const index = g.start + i;
                      const on = index === activeIndex;
                      return (
                        <li
                          key={e.id}
                          id={optionId(index)}
                          role="option"
                          aria-selected={on}
                          onMouseMove={() => {
                            if (!on) setActive(index);
                          }}
                          onClick={e.run}
                          className={`group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                            on ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-primary"
                          }`}
                        >
                          {e.leading}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{e.title}</span>
                            <span className={`block truncate text-xs ${on ? "text-white/60" : "text-gray-100"}`}>{e.detail}</span>
                          </span>
                          {on && e.alt && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                e.alt?.run();
                              }}
                              className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:inline-flex"
                            >
                              <span className="text-white/60">⇧↵</span> {e.alt.label}
                            </button>
                          )}
                          {e.hint && (
                            <span
                              className={`max-w-[40%] shrink-0 truncate rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                                on ? "bg-white/10 text-white" : TONE_SOFT[e.hintTone ?? "gray"]
                              }`}
                            >
                              {e.hint}
                            </span>
                          )}
                          <span className={`hidden shrink-0 text-xs sm:inline ${on ? "text-secondary" : "invisible"}`}>↵</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-page/60 px-4 py-2.5 text-[11px] text-gray-100">
          <span className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
            <span className="inline-flex items-center gap-1"><Kbd>↵</Kbd> abrir</span>
            <span className="hidden items-center gap-1 sm:inline-flex"><Kbd>⇧↵</Kbd> avançar etapa</span>
            <span className="hidden items-center gap-1 sm:inline-flex"><Kbd>esc</Kbd> limpar</span>
          </span>
          <span className="tabular-nums">
            {flat.length} {flat.length === 1 ? "resultado" : "resultados"}
          </span>
        </div>
      </div>

      {/* Sugestões */}
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-gray-100/70">Experimente:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => fill(s)}
            className="rounded-full bg-white px-3 py-1 text-primary ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-secondary/40 motion-reduce:transform-none"
          >
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
