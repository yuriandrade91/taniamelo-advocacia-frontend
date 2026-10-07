"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import { TONE_BG } from "@/components/ui/models/viz";
import {
  ApptTile,
  BucketPill,
  LiveDot,
  STAGES,
  activeAppointments,
  clock,
  dayLabel,
  dueLabel,
  firstName,
  greeting,
  isPriorityLoading,
  joinPt,
  leadsValue,
  localTime,
  longDate,
  money,
  plural,
  relativeTo,
  summarizePayments,
  usePipeline,
  useNow,
} from "./homeKit";
import { SendIcon, financeEmptyText, normalizeText, openPayments, useReducedMotion } from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * 19 · Conversa — o resumo do dia contado por um assistente.
 *
 * Balões de mensagem com cartões ricos (agenda, recebimentos, esteira) e
 * fichas de ação ("Ver leads", "Abrir agenda"). Dá para perguntar de volta:
 * o campo no rodapé entende leads, agenda, recebimentos, esteira e
 * documentos — tudo respondido com os dados já carregados, sem servidor.
 */

type Topic = "leads" | "agenda" | "recebimentos" | "esteira" | "documentos" | "ajuda";
type Turn = { id: number; question: string; topic: Topic; at: number };
type Chip = { label: string; run: () => void };

const TOPIC_WORDS: [Topic, string[]][] = [
  ["leads", ["lead", "formulario", "contato", "esperando", "aguardando"]],
  ["agenda", ["agenda", "compromisso", "audiencia", "pericia", "reuniao", "prazo", "horario", "hoje"]],
  ["recebimentos", ["pagamento", "recebimento", "receber", "atrasad", "inss", "parcela", "financeiro", "dinheiro"]],
  ["documentos", ["documento", "docs", "rg", "cnis", "pendencia"]],
  ["esteira", ["esteira", "etapa", "cliente", "processo", "beneficio"]],
];

const SUGGESTED: { label: string; topic: Topic }[] = [
  { label: "Quem está esperando contato?", topic: "leads" },
  { label: "O que tenho na agenda?", topic: "agenda" },
  { label: "Tem recebimento atrasado?", topic: "recebimentos" },
  { label: "Como está a esteira?", topic: "esteira" },
  { label: "Algum documento pendente?", topic: "documentos" },
];

function topicOf(text: string): Topic {
  const t = normalizeText(text);
  return TOPIC_WORDS.find(([, words]) => words.some((w) => t.includes(w)))?.[0] ?? "ajuda";
}

function Avatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#f3d79c] via-secondary to-[#6b4a17] text-[11px] font-semibold text-white shadow-md shadow-secondary/30">
      TM
    </span>
  );
}

function Bot({ children, chips, time }: { children: ReactNode; chips?: Chip[]; time?: string }) {
  return (
    <div className="flex items-end gap-2.5">
      <Avatar />
      <div className="min-w-0 max-w-[88%] sm:max-w-[80%]">
        <div className="rounded-3xl rounded-bl-lg bg-white px-4 py-3 text-sm leading-relaxed text-primary shadow-sm ring-1 ring-black/5">
          {children}
        </div>
        {chips && chips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={c.run}
                className="rounded-full bg-secondary/15 px-3 py-1.5 text-xs font-medium text-secondary transition hover:bg-secondary hover:text-white active:scale-95 motion-reduce:transform-none"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {time && <p className="mt-1 pl-2 text-[10px] text-gray-100/60">{time}</p>}
      </div>
    </div>
  );
}

function Me({ children, time }: { children: ReactNode; time: string }) {
  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-sm text-white shadow-md shadow-primary/20">
        {children}
      </div>
      <p className="mt-1 pr-2 text-[10px] text-gray-100/60">{time} · lida</p>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-end gap-2.5" aria-label="Digitando" aria-busy="true">
      <Avatar />
      <span className="inline-flex items-center gap-1 rounded-3xl rounded-bl-lg bg-white px-4 py-3.5 ring-1 ring-black/5">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-100/60 motion-safe:animate-bounce motion-safe:[animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-100/60 motion-safe:animate-bounce motion-safe:[animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gray-100/60 motion-safe:animate-bounce" />
      </span>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="mt-3 rounded-2xl bg-page p-3 ring-1 ring-black/5">{children}</div>;
}

export function ChatModel(props: HomeModelProps) {
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
  const reduced = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const loading = isPriorityLoading(props);
  const appts = activeAppointments(upcomingAppointments);
  const pay = summarizePayments(upcomingPayments);
  const open = openPayments(upcomingPayments);
  const { columns, total, max } = usePipeline(pipeline, actions.moveCard);
  const critical = pendingDocuments.filter((d) => d.isCritical);

  const chip = {
    leads: { label: "Ver leads", run: actions.openLeads },
    agenda: { label: "Abrir agenda", run: actions.openAgenda },
    pagamentos: { label: "Ver pagamentos", run: actions.seeAllPayments },
    clientes: { label: "Ver clientes", run: actions.openClients },
    novo: { label: "Novo cliente", run: actions.newClient },
  };

  const ask = (question: string, topic: Topic = topicOf(question)) => {
    const text = question.trim();
    if (!text) return;
    setTurns((prev) => [...prev, { id: (prev[prev.length - 1]?.id ?? 0) + 1, question: text, topic, at: Date.now() }].slice(-10));
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(draft);
    setDraft("");
  };

  // ── Respostas (as mesmas do resumo e das perguntas) ──
  const reply: Record<Topic, { body: ReactNode; chips: Chip[] }> = {
    leads: {
      body:
        pendingCount === null ? (
          <p>Ainda estou contando os formulários…</p>
        ) : pendingCount === 0 ? (
          <p>Nenhum lead esperando — todo formulário já virou cliente.</p>
        ) : (
          <p>
            Você tem <strong className="font-semibold">{leadsValue(pendingCount)} {plural(pendingCount, "lead", "leads")}</strong>{" "}
            esperando contato. São pessoas que preencheram o formulário e ainda não viraram clientes.
          </p>
        ),
      chips: [chip.leads],
    },
    agenda: {
      body:
        upcomingAppointments === null ? (
          <p>Estou abrindo a agenda…</p>
        ) : appts.length === 0 ? (
          <p>Sua agenda está livre — nenhum compromisso à frente.</p>
        ) : (
          <>
            <p>
              {appts.length} {plural(appts.length, "compromisso", "compromissos")} pela frente. O próximo é{" "}
              <strong className="font-semibold">{relativeTo(appts[0].startAt, now)}</strong>:
            </p>
            <Card>
              <ul className="flex flex-col gap-2.5">
                {appts.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <ApptTile type={String(a.type)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.title}</span>
                      <span className="block truncate text-xs text-gray-100">
                        {[String(a.type), a.clientName?.trim()].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className="block font-semibold tabular-nums">{localTime(a.startAt)}</span>
                      <span className="block text-gray-100">{dayLabel(a.startAt, now)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ),
      chips: [chip.agenda],
    },
    recebimentos: {
      body:
        !canSeeFinance || open.length === 0 ? (
          <p>{financeEmptyText(canSeeFinance)}</p>
        ) : (
          <>
            <p>
              {pay.overdue.count > 0 ? (
                <>
                  Atenção: <strong className="font-semibold text-danger">{pay.overdue.count} {plural(pay.overdue.count, "recebimento atrasado", "recebimentos atrasados")}</strong>{" "}
                  ({money(pay.overdue.amount)}).{" "}
                </>
              ) : (
                <>Nenhum recebimento atrasado. </>
              )}
              Há {pay.upcoming.count} {plural(pay.upcoming.count, "previsto", "previstos")}, somando {money(pay.upcoming.amount)}.
            </p>
            <Card>
              <ul className="flex flex-col gap-2">
                {open.slice(0, 3).map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${bucketOf(p) === "overdue" ? "bg-danger" : "bg-previsto"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{firstName(p.clientName)}</span>
                      <span className="block text-xs text-gray-100">{dueLabel(p.dueDate, now)}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{p.amount ? money(p.amount) : "—"}</span>
                    <span className="hidden sm:inline-flex"><BucketPill payment={p} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ),
      chips: [chip.pagamentos],
    },
    esteira: {
      body:
        total === 0 ? (
          <p>A esteira está vazia por enquanto. Que tal cadastrar o primeiro cliente?</p>
        ) : (
          <>
            <p>
              São <strong className="font-semibold">{total} {plural(total, "cliente", "clientes")}</strong> na esteira,{" "}
              {columns.BENEFICIO_CONCLUIDO.length} com benefício concluído.
            </p>
            <Card>
              <ul className="flex flex-col gap-1.5">
                {STAGES.map((s) => {
                  const count = columns[s.key].length;
                  return (
                    <li key={s.key} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-xs">
                      <span className="truncate text-gray-100">{s.short}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-white">
                        <span className={`block h-full rounded-full ${TONE_BG[s.tone]}`} style={{ width: `${(count / max) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right font-semibold tabular-nums">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        ),
      chips: total === 0 ? [chip.novo] : [chip.clientes, chip.novo],
    },
    documentos: {
      body:
        pendingDocuments.length === 0 ? (
          <p>Nenhum documento pendente. Tudo em dia!</p>
        ) : (
          <>
            <p>
              {pendingDocuments.length} {plural(pendingDocuments.length, "documento pendente", "documentos pendentes")}
              {critical.length > 0 && (
                <>
                  {" "}— {plural(critical.length, "o crítico é de", "os críticos são de")}{" "}
                  <strong className="font-semibold">{joinPt(critical.slice(0, 3).map((d) => firstName(d.name)))}</strong>
                </>
              )}
              .
            </p>
            <p className="mt-2 text-[10px] tracking-widest text-gray-100/70 uppercase">dados ilustrativos</p>
          </>
        ),
      chips: [chip.clientes],
    },
    ajuda: {
      body: (
        <p>
          Ainda não sei responder isso. Posso falar de <strong className="font-semibold">leads</strong>,{" "}
          <strong className="font-semibold">agenda</strong>, <strong className="font-semibold">recebimentos</strong>,{" "}
          <strong className="font-semibold">esteira</strong> e <strong className="font-semibold">documentos</strong>.
        </p>
      ),
      chips: [],
    },
  };

  const briefing: Topic[] = ["leads", "agenda", "recebimentos", "esteira", "documentos"];

  return (
    <section className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-page ring-1 ring-black/5">
      {/* Cabeçalho da conversa */}
      <header className="flex items-center gap-3 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-primary">Assistente do escritório</p>
          <p className="flex items-center gap-1.5 text-[11px] text-gray-100">
            <LiveDot /> online · resumo de {periodLabel.toLowerCase()}
          </p>
        </div>
        <span className="hidden text-xs text-gray-100 sm:inline">{longDate(now)}</span>
      </header>

      {/* Mensagens */}
      <div className="flex flex-col gap-4 bg-[radial-gradient(rgba(9,13,76,0.05)_1px,transparent_1px)] [background-size:18px_18px] px-3 py-6 sm:px-6" aria-live="polite">
        <p className="mx-auto rounded-full bg-white px-3 py-1 text-[11px] text-gray-100 ring-1 ring-black/5">Hoje</p>

        <Bot time={clock(now)}>
          <p>
            {greeting(now)}! Aqui vai o resumo de hoje, {longDate(now)}.
          </p>
        </Bot>

        {loading ? (
          <Typing />
        ) : (
          briefing.map((topic) => (
            <Bot key={topic} chips={reply[topic].chips}>
              {reply[topic].body}
            </Bot>
          ))
        )}

        {turns.map((t) => (
          <div key={t.id} className="flex flex-col gap-4">
            <Me time={clock(t.at)}>{t.question}</Me>
            <Bot chips={reply[t.topic].chips} time={clock(t.at)}>
              {reply[t.topic].body}
              {t.topic === "ajuda" && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => ask(s.label, s.topic)}
                      className="rounded-full bg-page px-3 py-1 text-xs text-primary ring-1 ring-black/5 hover:ring-secondary/40"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </Bot>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Compositor */}
      <footer className="border-t border-black/5 bg-white px-3 pt-3 pb-4 sm:px-6">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => ask(s.label, s.topic)}
              className="rounded-full bg-page px-3 py-1.5 text-xs text-primary ring-1 ring-black/5 transition hover:ring-secondary/40"
            >
              {s.label}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="mt-3 flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Pergunte sobre leads, agenda, recebimentos…"
            aria-label="Mensagem"
            className="min-w-0 flex-1 rounded-full bg-page px-4 py-2.5 text-sm text-primary ring-1 ring-black/5 outline-none placeholder:text-gray-100/50 focus:ring-2 focus:ring-secondary/40"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Enviar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-40"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </footer>
    </section>
  );
}
