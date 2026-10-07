"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import { formatBRL } from "@/lib/format";
import {
  STAGES,
  activeAppointments,
  clock,
  dateParts,
  dayLabel,
  isOngoingAppt,
  localTime,
  longDate,
  money,
  plural,
  relativeTo,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import { normalizeText, openPayments } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 15 · Terminal — o Início como uma sessão de linha de comando.
 *
 * Fonte monoespaçada, prompt `$ inicio --hoje` e as respostas em linhas:
 * resumo com pontilhado, agenda em colunas, recebimentos, esteira em barras
 * de blocos e documentos. As ações são "comandos" clicáveis e há um prompt
 * de verdade no fim (digite `ajuda`).
 */

type Line = { text: string; tone?: "ok" | "warn" | "err" | "dim" };
type Run = { id: number; cmd: string; lines: Line[] };

const TONE_CLASS: Record<NonNullable<Line["tone"]> | "base", string> = {
  base: "text-slate-200",
  ok: "text-emerald-400",
  warn: "text-amber-300",
  err: "text-rose-400",
  dim: "text-slate-500",
};

const DOTS = ".".repeat(80);

function Prompt({ cmd, comment }: { cmd: string; comment?: string }) {
  return (
    <p className="mt-5 break-words first:mt-0">
      <span className="text-emerald-400">voce@escritorio</span>
      <span className="text-slate-500">:</span>
      <span className="text-sky-400">~/inicio</span>
      <span className="text-secondary"> $ </span>
      <span className="text-white">{cmd}</span>
      {comment && <span className="text-slate-500">{`  # ${comment}`}</span>}
    </p>
  );
}

function Cmd({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-sky-300 underline decoration-sky-300/40 decoration-dotted underline-offset-4 transition hover:text-white hover:decoration-solid focus-visible:outline-1 focus-visible:outline-secondary"
    >
      <span className="text-slate-500">→ </span>
      {children}
    </button>
  );
}

function Leader({
  label,
  value,
  tone = "base",
  cmd,
}: {
  label: string;
  value: ReactNode;
  tone?: keyof typeof TONE_CLASS;
  cmd?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-slate-300">{label}</span>
        <span aria-hidden="true" className="min-w-6 flex-1 overflow-hidden whitespace-nowrap text-slate-700">
          {DOTS}
        </span>
        <span className={`shrink-0 ${TONE_CLASS[tone]}`}>{value}</span>
      </span>
      {cmd && <span className="basis-full pl-4 sm:basis-56 sm:pl-0">{cmd}</span>}
    </div>
  );
}

const bar = (count: number, max: number, width = 14) => {
  const n = count === 0 ? 0 : Math.max(1, Math.round((count / max) * width));
  return { full: "█".repeat(n), empty: "░".repeat(width - n) };
};

export function TerminalModel(props: HomeModelProps) {
  const {
    pendingCount,
    stats,
    canSeeFinance,
    upcomingPayments,
    outflow,
    pendingDocuments,
    pipeline,
    upcomingAppointments,
    periodLabel,
    actions,
  } = props;
  const now = useNow(30_000);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [recall, setRecall] = useState(-1);
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);
  const critical = pendingDocuments.filter((d) => d.isCritical).length;

  const say = (run: () => void, text: string) => (): Line[] => {
    run();
    return [{ text, tone: "ok" }];
  };
  const COMMANDS: Record<string, { help: string; run: () => Line[] }> = {
    leads: { help: "abre os leads pendentes", run: say(actions.openLeads, "abrindo leads…") },
    agenda: { help: "vai para a agenda", run: say(actions.openAgenda, "abrindo agenda…") },
    clientes: { help: "lista os clientes", run: say(actions.openClients, "abrindo clientes…") },
    novo: { help: "cadastra um cliente", run: say(actions.newClient, "abrindo cadastro…") },
    pagamentos: { help: "vai para os pagamentos", run: say(actions.seeAllPayments, "abrindo pagamentos…") },
  };

  const exec = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    const word = normalizeText(cmd).split(/\s+/)[0] ?? "";
    if (word === "limpar" || word === "clear") {
      setRuns([]);
      return;
    }
    let lines: Line[];
    if (word === "ajuda" || word === "help") {
      lines = [
        ...Object.entries(COMMANDS).map(([name, c]) => ({ text: `  ${name.padEnd(11)} ${c.help}` })),
        { text: `  ${"limpar".padEnd(11)} limpa a tela`, tone: "dim" as const },
      ];
    } else if (COMMANDS[word]) {
      lines = COMMANDS[word].run();
    } else {
      lines = [
        { text: `zsh: comando não encontrado: ${word}`, tone: "err" },
        { text: "digite `ajuda` para ver os comandos", tone: "dim" },
      ];
    }
    setRuns((prev) => [...prev, { id: prev.length ? prev[prev.length - 1].id + 1 : 1, cmd, lines }].slice(-8));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    exec(value);
    setValue("");
    setRecall(-1);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const past = runs.map((r) => r.cmd);
    if (event.key === "ArrowUp" && past.length) {
      event.preventDefault();
      const next = recall < 0 ? past.length - 1 : Math.max(0, recall - 1);
      setRecall(next);
      setValue(past[next]);
    } else if (event.key === "ArrowDown" && recall >= 0) {
      event.preventDefault();
      const next = recall + 1;
      if (next >= past.length) {
        setRecall(-1);
        setValue("");
      } else {
        setRecall(next);
        setValue(past[next]);
      }
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-[#0b1020] font-mono text-[12.5px] leading-relaxed text-slate-200 shadow-2xl shadow-primary/30 ring-1 ring-white/10 sm:text-[13px]">
      {/* Barra da janela */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-[#141a2e] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="min-w-0 flex-1 truncate text-center text-[11px] text-slate-400">escritorio — inicio — zsh</span>
        <span className="hidden text-[11px] text-slate-500 tabular-nums sm:inline">{clock(now)}</span>
      </div>

      <div
        className="min-w-0 p-4 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.018)_0,rgba(255,255,255,0.018)_1px,transparent_1px,transparent_3px)] sm:p-6"
        onClick={(event) => {
          if (event.target === event.currentTarget) inputRef.current?.focus();
        }}
      >
        {/* Resumo */}
        <Prompt cmd="inicio --hoje" />
        <p className="text-emerald-400">
          [ok] <span className="text-slate-300">{longDate(now)} · {clock(now)} · competência {periodLabel.toLowerCase()}</span>
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          <Leader
            label="leads"
            value={pendingCount === null ? <span className="motion-safe:animate-pulse">contando…</span> : `${pendingCount} aguardando contato`}
            tone={pendingCount ? "warn" : "base"}
            cmd={<Cmd onClick={actions.openLeads}>leads --abrir</Cmd>}
          />
          <Leader
            label="agenda"
            value={
              upcomingAppointments === null ? (
                <span className="motion-safe:animate-pulse">carregando…</span>
              ) : (
                `${appts.length} ${plural(appts.length, "compromisso", "compromissos")} à frente`
              )
            }
            cmd={<Cmd onClick={actions.openAgenda}>agenda --abrir</Cmd>}
          />
          <Leader
            label="recebimentos"
            value={
              !canSeeFinance
                ? "permissão negada"
                : pay.overdue.count
                  ? `${pay.overdue.count} ${plural(pay.overdue.count, "atrasado", "atrasados")} · ${money(pay.overdue.amount)}`
                  : `${pay.upcoming.count} previstos · 0 atrasados`
            }
            tone={!canSeeFinance ? "dim" : pay.overdue.count ? "err" : "ok"}
            cmd={<Cmd onClick={actions.seeAllPayments}>pagamentos --listar</Cmd>}
          />
          <Leader
            label="esteira"
            value={`${total} ${plural(total, "cliente", "clientes")}`}
            cmd={<Cmd onClick={actions.openClients}>clientes --listar</Cmd>}
          />
          <Leader
            label="documentos"
            value={`${pendingDocuments.length} pendentes${critical ? ` (${critical} ${plural(critical, "crítico", "críticos")})` : ""}`}
            tone={critical ? "err" : "base"}
            cmd={<Cmd onClick={actions.openClients}>docs --cobrar</Cmd>}
          />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          <span className="text-slate-500">atalhos:</span>
          <Cmd onClick={actions.newClient}>novo --cliente</Cmd>
          <Cmd onClick={() => exec("ajuda")}>ajuda</Cmd>
        </p>

        {/* Agenda */}
        <Prompt cmd="agenda --proximos 5" />
        {upcomingAppointments === null ? (
          <p className="text-slate-500 motion-safe:animate-pulse">⠋ buscando compromissos…</p>
        ) : appts.length === 0 ? (
          <p className="text-slate-500">(vazio) nenhum compromisso à frente</p>
        ) : (
          <div className="mt-1">
            <p className="hidden text-slate-500 sm:flex sm:gap-3">
              <span className="w-12">HORA</span>
              <span className="w-24">DIA</span>
              <span className="w-24">TIPO</span>
              <span>TÍTULO · CLIENTE</span>
            </p>
            {appts.slice(0, 5).map((a) => {
              const live = isOngoingAppt(a, now);
              return (
                <p key={a.id} className="flex min-w-0 gap-3">
                  <span className={`w-12 shrink-0 ${live ? "text-emerald-400" : "text-white"}`}>{localTime(a.startAt)}</span>
                  <span className="hidden w-24 shrink-0 truncate text-slate-400 sm:inline">{dayLabel(a.startAt, now)}</span>
                  <span className="hidden w-24 shrink-0 truncate text-violet-300 sm:inline">{String(a.type)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {a.title}
                    {a.clientName ? <span className="text-slate-500"> · {a.clientName}</span> : null}
                  </span>
                  <span className={`hidden shrink-0 md:inline ${live ? "text-emerald-400" : "text-slate-500"}`}>
                    {live ? "● agora" : relativeTo(a.startAt, now)}
                  </span>
                </p>
              );
            })}
          </div>
        )}

        {/* Recebimentos */}
        <Prompt cmd="pagamentos --abertos" comment="o que o INSS paga aos clientes" />
        {!canSeeFinance ? (
          <p className="text-rose-400">erro: permissão negada — recebimentos só para administradores</p>
        ) : open.length === 0 ? (
          <p className="text-slate-500">(vazio) nenhum recebimento em aberto</p>
        ) : (
          <div className="mt-1">
            {open.slice(0, 5).map((p) => {
              const late = bucketOf(p) === "overdue";
              const d = dateParts(p.dueDate);
              return (
                <p key={p.id} className="flex min-w-0 gap-3">
                  <span className={`w-20 shrink-0 ${late ? "text-rose-400" : "text-amber-300"}`}>{late ? "✗ ATRASO" : "• PREVISTO"}</span>
                  <span className="hidden w-14 shrink-0 text-slate-400 sm:inline">{d.day} {d.month}</span>
                  <span className="min-w-0 flex-1 truncate">{p.clientName}</span>
                  <span className="shrink-0 text-white">{p.amount ? formatBRL(p.amount) : "—"}</span>
                </p>
              );
            })}
            <p className="mt-1 text-slate-500">
              total: {money(pay.overdue.amount + pay.upcoming.amount)} em {open.length} {plural(open.length, "parcela", "parcelas")}
            </p>
          </div>
        )}

        {/* Esteira */}
        <Prompt cmd="esteira --resumo" />
        {total === 0 ? (
          <p className="text-slate-500">(vazio) nenhum cliente na esteira</p>
        ) : (
          <div className="mt-1">
            {STAGES.map((s) => {
              const count = columns[s.key].length;
              const b = bar(count, max);
              return (
                <p key={s.key} className="flex min-w-0 gap-3">
                  <span className="w-24 shrink-0 truncate text-slate-300 sm:w-56">
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                  <span className="shrink-0 whitespace-pre" aria-hidden="true">
                    <span className="text-secondary">{b.full}</span>
                    <span className="text-slate-700">{b.empty}</span>
                  </span>
                  <span className="shrink-0 text-white tabular-nums">{count}</span>
                </p>
              );
            })}
          </div>
        )}

        {/* Documentos */}
        <Prompt cmd="docs --pendentes" comment="dados ilustrativos" />
        {pendingDocuments.length === 0 ? (
          <p className="text-slate-500">(vazio) nenhum documento pendente</p>
        ) : (
          <div className="mt-1">
            {pendingDocuments.slice(0, 5).map((d) => (
              <p key={d.id} className="flex min-w-0 gap-3">
                <span className={`shrink-0 ${d.isCritical ? "text-rose-400" : "text-slate-500"}`}>{d.isCritical ? "[!]" : "[ ]"}</span>
                <span className="min-w-0 truncate">
                  {d.name} <span className="text-slate-500">— {d.issue}</span>
                </span>
              </p>
            ))}
          </div>
        )}

        {/* Indicadores e saídas */}
        <Prompt cmd="stats && saidas --mes" comment="indicadores ilustrativos" />
        <div className="mt-1 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <div>
            {stats.length === 0 ? (
              <p className="text-slate-500">(vazio) sem indicadores</p>
            ) : (
              stats.map((s) => (
                <p key={s.title} className="flex min-w-0 gap-2">
                  <span className="min-w-0 flex-1 truncate text-slate-300">{s.title}</span>
                  <span className="shrink-0 text-white">
                    {s.value}
                    {s.total ? <span className="text-slate-500">/{s.total}</span> : null}
                  </span>
                </p>
              ))
            )}
          </div>
          <div>
            {!canSeeFinance ? (
              <p className="text-rose-400">erro: permissão negada — despesas</p>
            ) : outflow.slices.length === 0 ? (
              <p className="text-slate-500">(vazio) sem despesas pagas em {periodLabel.toLowerCase()}</p>
            ) : (
              <>
                {outflow.slices.map((s) => (
                  <p key={s.label} className="flex min-w-0 gap-2">
                    <span className="min-w-0 flex-1 truncate text-slate-300">{s.label}</span>
                    <span className="shrink-0 text-white">{String(s.percentage).padStart(3, " ")}%</span>
                  </p>
                ))}
                <p className="text-slate-500">total: {money(outflow.total)}</p>
              </>
            )}
          </div>
        </div>

        {/* Histórico do prompt */}
        {runs.map((r) => (
          <div key={r.id}>
            <Prompt cmd={r.cmd} />
            {r.lines.map((l, i) => (
              <p key={i} className={`whitespace-pre-wrap ${TONE_CLASS[l.tone ?? "base"]}`}>
                {l.text}
              </p>
            ))}
          </div>
        ))}

        {/* Prompt */}
        <form onSubmit={onSubmit} className="mt-5 flex min-w-0 items-baseline gap-0">
          <label htmlFor="terminal-input" className="shrink-0">
            <span className="text-emerald-400">voce@escritorio</span>
            <span className="text-slate-500">:</span>
            <span className="text-sky-400">~/inicio</span>
            <span className="text-secondary"> $&nbsp;</span>
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
            placeholder="digite ajuda"
            className="min-w-0 flex-1 bg-transparent text-white caret-secondary outline-none placeholder:text-slate-600"
          />
        </form>
      </div>
    </section>
  );
}
