"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { RowSkeletons } from "@/components/ui/feedback/Loading";
import { Segmented } from "@/components/ui/filters/FilterBar";
import { bucketOf, type PaymentBucket } from "@/components/payments/paymentBuckets";
import { BucketChip } from "@/components/wallet/WalletEntryList";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { FinanceSummary } from "@/interfaces/finance/Finance.interface";
import { formatBRL, formatDateBR, formatInstallment, plural } from "@/lib/format";
import { daysBetween, todayIso } from "@/lib/period";
import { pendingIntegration } from "@/services/pendingIntegration";
import { getOfficePaymentSummary, listOfficePayments } from "@/services/officePaymentService";
import { getOfficeRevenueSummary, listOfficeRevenues } from "@/services/officeRevenueService";
import { Notice } from "@/components/ui/feedback/Notice";

/**
 * O financeiro de um cliente — no painel lateral da lista (`ClientFinanceDrawer`)
 * e na seção Pagamentos da ficha.
 *
 * Dois dinheiros diferentes, em blocos separados e nunca somados:
 *
 * - **Benefício** — o que o INSS paga ao cliente: as mesmas rotas da tela de
 *   Pagamentos (`/api/v1/payments` e `/summary`), filtradas por `clientId`.
 * - **Honorários** — o que o cliente paga ao escritório: as rotas de receita
 *   da Carteira (`/api/v1/revenues` e `/summary`), filtradas por `clientId`.
 *
 * Somar os dois misturaria dinheiro do cliente com dinheiro do escritório —
 * o mesmo motivo de `officeRevenueService` existir separado.
 *
 * Os totais vêm do `/summary` de cada lado, e não da soma da lista: a lista
 * para em `PAGE_SIZE` (o máximo do backend), o resumo conta todos. Mesma regra
 * de balde das duas telas — cancelado fora. Se só o resumo falhar, o bloco
 * soma a lista e avisa que o total pode estar incompleto.
 *
 * Onde a rota está em pausa (`NEXT_PUBLIC_PENDING_INTEGRATIONS`), o bloco diz
 * isso, em vez de mostrar "nenhum lançamento" — vazio ali seria mentira.
 *
 * Só leitura. O desenho segue o painel de detalhe da Carteira (blocos em
 * `bg-page`, rótulos pequenos em caixa alta, pílulas de status), sem sombras:
 * quem é, uma aba por dinheiro, a composição numa barra em segmentos (no
 * lugar de rosquinha), o próximo vencimento e o último recebimento, e a
 * lista com filtro por status.
 */

const PAGE_SIZE = 100;

/** O mínimo de um lançamento para listar. */
type Entry = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  installment?: string;
  bucket: PaymentBucket;
};

/** Valor e quantidade de cada balde (cancelado fora, como no `/summary`). */
type Totals = Record<"paid" | "upcoming" | "overdue", { amount: number; count: number }>;

type Block =
  | { state: "paused" }
  | { state: "error" }
  | {
      state: "ok";
      entries: Entry[];
      /** Quantos existem no servidor (a lista pode ter vindo cortada). */
      total: number;
      totals: Totals;
      /** O resumo falhou e os totais são a soma da lista. */
      partialTotals: boolean;
    };

type Loaded = { clientId: string; benefit: Block; fees: Block };

/** Recebido, a receber (no prazo) e em atraso; cancelado não entra. */
function sumEntries(entries: Entry[]): Totals {
  const sum = (bucket: PaymentBucket) => {
    const inBucket = entries.filter((e) => e.bucket === bucket);
    return { amount: inBucket.reduce((acc, e) => acc + e.amount, 0), count: inBucket.length };
  };
  return { paid: sum("paid"), upcoming: sum("upcoming"), overdue: sum("overdue") };
}

async function loadBlock<T>(
  group: string,
  list: () => Promise<ApiEnvelope<T[]>>,
  summary: () => Promise<ApiEnvelope<FinanceSummary>>,
  toEntry: (item: T) => Entry,
): Promise<Block> {
  if (pendingIntegration(group)) return { state: "paused" };
  const [listed, summed] = await Promise.allSettled([list(), summary()]);
  if (listed.status === "rejected") return { state: "error" };

  const entries = (listed.value.data ?? []).map(toEntry);
  const fromServer = summed.status === "fulfilled" ? summed.value.data : undefined;
  return {
    state: "ok",
    entries,
    total: listed.value.pagination?.totalRecords ?? entries.length,
    totals: fromServer
      ? {
          paid: { amount: fromServer.paidAmount, count: fromServer.paidCount },
          upcoming: { amount: fromServer.upcomingAmount, count: fromServer.upcomingCount },
          overdue: { amount: fromServer.overdueAmount, count: fromServer.overdueCount },
        }
      : sumEntries(entries),
    partialTotals: !fromServer,
  };
}

async function loadFinance(clientId: string): Promise<Loaded> {
  const page = { clientId, pageNumber: 1, pageSize: PAGE_SIZE };
  const [benefit, fees] = await Promise.all([
    loadBlock(
      "payments",
      () => listOfficePayments(page),
      () => getOfficePaymentSummary({ clientId }),
      (item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount ?? 0,
        dueDate: item.dueDate,
        paidDate: item.paidDate,
        installment: item.installmentNumber
          ? formatInstallment(item.installmentNumber, item.installmentTotal)
          : undefined,
        bucket: bucketOf(item),
      }),
    ),
    loadBlock(
      "revenues",
      () => listOfficeRevenues(page),
      () => getOfficeRevenueSummary({ clientId }),
      (item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
        dueDate: item.dueDate,
        paidDate: item.paidDate,
        bucket: bucketOf(item),
      }),
    ),
  ]);
  return { clientId, benefit, fees };
}

/**
 * O financeiro de um cliente, com uma aba por dinheiro. Busca ao montar: quem
 * o usa só o monta quando ele vai aparecer (o drawer ao abrir, a ficha ao
 * expandir a seção).
 */
export function ClientFinancePanel({ clientId }: { clientId: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [tab, setTab] = useState<TabId>("benefit");

  useEffect(() => {
    let active = true;
    loadFinance(clientId).then((result) => {
      if (active) setLoaded(result);
    });
    return () => {
      active = false;
    };
  }, [clientId]);

  /** Carregando = ainda não chegou a resposta deste cliente. */
  const data = loaded?.clientId === clientId ? loaded : null;
  const meta = TABS[tab];

  return (
    <div className="flex flex-col gap-4">
      <TabSwitch value={tab} onChange={setTab} data={data} />
      <p className="-mt-1 text-xs text-gray-100/70">{meta.hint}</p>
      <TabBody key={tab} block={data?.[tab] ?? null} meta={meta} />
    </div>
  );
}

// ── Abas ──

type TabId = "benefit" | "fees";

type TabMeta = {
  label: string;
  hint: string;
  empty: string;
  /** Quem recebe: "o cliente recebeu" / "o escritório recebeu". */
  receivedLabel: string;
};

const TABS: Record<TabId, TabMeta> = {
  benefit: {
    label: "Benefício",
    hint: "O que o INSS paga ao cliente — atrasados, benefício, parcelas de acordo.",
    empty: "Nenhuma parcela de benefício lançada para este cliente.",
    receivedLabel: "Recebido pelo cliente",
  },
  fees: {
    label: "Honorários",
    hint: "O que o cliente paga ao escritório.",
    empty: "Nenhum honorário lançado para este cliente.",
    receivedLabel: "Recebido pelo escritório",
  },
};

/**
 * As abas: o `Segmented` das listas, com o total de cada lado no selo. Sem
 * selo onde não há número (rota em pausa, erro); carregando, o círculo no
 * lugar dele.
 */
function TabSwitch({
  value,
  onChange,
  data,
}: {
  value: TabId;
  onChange: (tab: TabId) => void;
  data: Loaded | null;
}) {
  return (
    <Segmented
      label="Financeiro do cliente"
      mode="tab"
      grow
      onPress={(id) => onChange(id as TabId)}
      segments={(Object.keys(TABS) as TabId[]).map((id) => {
        const block = data?.[id];
        return {
          id,
          label: TABS[id].label,
          active: id === value,
          count: !block ? null : block.state === "ok" ? block.total : undefined,
        };
      })}
    />
  );
}

// ── Corpo de uma aba ──

export const EYEBROW = "text-[11px] font-medium tracking-wide text-gray-100/60 uppercase";

function TabBody({ block, meta }: { block: Block | null; meta: TabMeta }) {
  if (!block) return <TabBodySkeleton receivedLabel={meta.receivedLabel} />;
  if (block.state === "paused") {
    return <Notice>Esta parte ainda não está no ar neste ambiente.</Notice>;
  }
  if (block.state === "error") {
    return <Notice tone="danger">Não foi possível carregar. Feche e abra de novo.</Notice>;
  }
  return (
    <div className="flex flex-col gap-3">
      <Composition totals={block.totals} receivedLabel={meta.receivedLabel} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NextDue entries={block.entries} />
        <LastReceived entries={block.entries} />
      </div>
      <EntryList block={block} empty={meta.empty} />
    </div>
  );
}

/**
 * A aba carregando, nos mesmos blocos: rótulos fixos de verdade, skeleton só
 * nos valores (na largura deles) e nas linhas da lista — nada salta quando o
 * financeiro chega.
 */
function TabBodySkeleton({ receivedLabel }: { receivedLabel: string }) {
  const value = (width: string, height = "h-4") => <Skeleton className={`${height} ${width} rounded-md`} />;
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Carregando financeiro">
      <Tile className="p-5">
        <p className={EYEBROW}>Total lançado</p>
        <div className="mt-2">{value("w-44", "h-9")}</div>
        <Skeleton className="mt-5 h-2.5 w-full rounded-full" />
        <dl className="mt-4 grid grid-cols-3 gap-3">
          {[receivedLabel, "A receber", "Em atraso"].map((label, i) => (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] text-gray-100/70">
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${PARTS[i].dot}`} />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="mt-1 flex flex-col gap-1">
                {value("w-20")}
                {value("w-24", "h-3")}
              </dd>
            </div>
          ))}
        </dl>
      </Tile>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ["Próximo vencimento", "bg-sky-400"],
          ["Último recebimento", "bg-success"],
        ].map(([label, dot]) => (
          <Tile key={label} className="flex items-center gap-3 p-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className={`flex items-center gap-1.5 ${EYEBROW}`}>
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </p>
              {value("w-24", "h-5")}
              {value("w-28", "h-3")}
            </div>
          </Tile>
        ))}
      </div>
      <Tile className="p-4">
        <p className={EYEBROW}>Lançamentos</p>
        <RowSkeletons
          count={5}
          className="mt-3 flex flex-col gap-3 rounded-xl bg-white p-3 ring-1 ring-light-gray/70"
        />
      </Tile>
    </div>
  );
}

// ── Composição: total + barra em segmentos ──

const PARTS = [
  { key: "paid", dot: "bg-success" },
  { key: "upcoming", dot: "bg-sky-400" },
  { key: "overdue", dot: "bg-danger" },
] as const;

function Composition({ totals, receivedLabel }: { totals: Totals; receivedLabel: string }) {
  const sum = totals.paid.amount + totals.upcoming.amount + totals.overdue.amount;
  const label = { paid: receivedLabel, upcoming: "A receber", overdue: "Em atraso" };
  const share = (amount: number) => (sum > 0 ? amount / sum : 0);

  return (
    <Tile className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={EYEBROW}>Total lançado</p>
          <p className="mt-2 text-[2.25rem] leading-none font-semibold tracking-tight text-primary tabular-nums">
            {formatBRL(sum)}
          </p>
        </div>
        {totals.overdue.count > 0 && (
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-danger/5 px-3 py-1 text-xs font-medium text-danger ring-1 ring-danger/15">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-danger" />
            {totals.overdue.count} em atraso
          </span>
        )}
      </div>

      {/* A composição em segmentos, na proporção do valor — sem rosquinha. */}
      <div
        role="img"
        aria-label={PARTS.map((p) => `${label[p.key]}: ${Math.round(share(totals[p.key].amount) * 100)}%`).join(", ")}
        className="mt-5 flex h-2.5 gap-1 overflow-hidden rounded-full bg-light-gray/60"
      >
        {sum > 0 &&
          PARTS.filter((p) => totals[p.key].amount > 0).map((p) => (
            <span
              key={p.key}
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${p.dot}`}
              style={{ width: `${share(totals[p.key].amount) * 100}%` }}
            />
          ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {PARTS.map((p) => (
          <div key={p.key} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] text-gray-100/70">
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`} />
              <span className="truncate">{label[p.key]}</span>
            </dt>
            <dd className="mt-1">
              <span
                className={`block text-sm font-semibold tabular-nums ${
                  p.key === "overdue" && totals.overdue.amount > 0 ? "text-danger" : "text-gray-100"
                }`}
              >
                {formatBRL(totals[p.key].amount)}
              </span>
              <span className="text-[11px] text-gray-100/60 tabular-nums">
                {Math.round(share(totals[p.key].amount) * 100)}% · {countLabel(totals[p.key].count)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </Tile>
  );
}

const countLabel = (count: number) => plural(count, "lançamento", "lançamentos");

// ── Destaques ──

function inDays(days: number): string {
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `em ${days} dias`;
}

function NextDue({ entries }: { entries: Entry[] }) {
  const next = entries
    .filter((e) => e.bucket === "upcoming")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return (
    <Highlight
      label="Próximo vencimento"
      dot="bg-sky-400"
      entry={next}
      date={next?.dueDate}
      note={next ? inDays(Math.max(0, daysBetween(todayIso(), next.dueDate))) : "Nada a vencer"}
    />
  );
}

function LastReceived({ entries }: { entries: Entry[] }) {
  const last = entries
    .filter((e) => e.bucket === "paid" && e.paidDate)
    .sort((a, b) => (b.paidDate ?? "").localeCompare(a.paidDate ?? ""))[0];
  return (
    <Highlight
      label="Último recebimento"
      dot="bg-success"
      entry={last}
      date={last?.paidDate}
      note={last ? last.description : "Nada recebido ainda"}
    />
  );
}

function Highlight({
  label,
  dot,
  entry,
  date,
  note,
}: {
  label: string;
  dot: string;
  entry?: Entry;
  date?: string;
  note: string;
}) {
  return (
    <Tile className="flex items-center gap-3 p-4">
      {date ? <DateBlock iso={date} /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-gray-100/40 ring-1 ring-light-gray">—</span>}
      <div className="min-w-0">
        <p className={`flex items-center gap-1.5 ${EYEBROW}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {label}
        </p>
        {entry && <p className="mt-1 text-base font-semibold text-gray-100 tabular-nums">{formatBRL(entry.amount)}</p>}
        <p className="truncate text-xs text-gray-100/70" title={note}>
          {note}
        </p>
      </div>
    </Tile>
  );
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** A data como folhinha de calendário: dia grande, mês e ano pequenos. */
function DateBlock({ iso, muted = false }: { iso: string; muted?: boolean }) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return (
    <span
      aria-label={formatDateBR(iso)}
      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white ring-1 ring-light-gray ${
        muted ? "opacity-60" : ""
      }`}
    >
      <span className="text-base leading-none font-semibold text-primary tabular-nums">{d}</span>
      <span className="mt-0.5 text-[10px] leading-none text-gray-100/70 uppercase">
        {MONTHS[Number(m) - 1]} {y.slice(2)}
      </span>
    </span>
  );
}

// ── Lista ──

type Filter = "all" | PaymentBucket;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "overdue", label: "Em atraso" },
  { id: "upcoming", label: "A receber" },
  { id: "paid", label: "Recebidos" },
  { id: "cancelled", label: "Cancelados" },
];

/** Atrasado primeiro (pede ação), depois o que vence, recebido e cancelado. */
const BUCKET_ORDER: Record<PaymentBucket, number> = { overdue: 0, upcoming: 1, paid: 2, cancelled: 3 };

function EntryList({ block, empty }: { block: Extract<Block, { state: "ok" }>; empty: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = (id: Filter) => (id === "all" ? block.entries.length : block.entries.filter((e) => e.bucket === id).length);
  const shown = block.entries
    .filter((e) => filter === "all" || e.bucket === filter)
    .sort((a, b) => BUCKET_ORDER[a.bucket] - BUCKET_ORDER[b.bucket] || a.dueDate.localeCompare(b.dueDate));
  const hidden = block.total - block.entries.length;

  return (
    <Tile className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={EYEBROW}>Lançamentos</p>
        {block.entries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.filter((f) => f.id === "all" || count(f.id) > 0).map((f) => {
              const active = f.id === filter;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active ? "bg-primary text-white" : "bg-white text-gray-100 ring-1 ring-light-gray hover:text-primary"
                  }`}
                >
                  {f.label}
                  <span className={`ml-1.5 tabular-nums ${active ? "text-white/70" : "text-gray-100/50"}`}>{count(f.id)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {block.entries.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-sm text-gray-100/80">
          {empty}
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-xl bg-white ring-1 ring-light-gray/70">
          {shown.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      {(hidden > 0 || block.partialTotals) && (
        <p className="mt-2 text-xs text-gray-100/70">
          {hidden > 0 && `Mostrando ${block.entries.length} de ${block.total}. `}
          {block.partialTotals && "Os totais não carregaram; somam só os lançamentos mostrados."}
        </p>
      )}
    </Tile>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const cancelled = entry.bucket === "cancelled";
  const overdue = entry.bucket === "overdue";
  const late = overdue ? daysBetween(entry.dueDate, todayIso()) : 0;
  return (
    <li className="flex items-center gap-3 border-b border-black/5 px-3 py-3 text-sm text-gray-100 transition-colors last:border-b-0 hover:bg-secondary/5">
      <DateBlock iso={entry.dueDate} muted={cancelled} />
      <div className={`min-w-0 flex-1 ${cancelled ? "opacity-60 grayscale" : ""}`}>
        <p title={entry.description} className={`truncate font-medium ${cancelled ? "line-through" : ""}`}>
          {entry.description}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-100/70">
          {entry.installment && <span>Parcela {entry.installment}</span>}
          {entry.paidDate ? (
            <span>Recebido em {formatDateBR(entry.paidDate)}</span>
          ) : overdue ? (
            <span className="text-danger">{late === 1 ? "1 dia de atraso" : `${late} dias de atraso`}</span>
          ) : (
            <span>Vence em {formatDateBR(entry.dueDate)}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className={`font-semibold tabular-nums ${cancelled ? "text-gray-100/50" : "text-gray-100"}`}>
          {formatBRL(entry.amount)}
        </span>
        <BucketChip kind="income" bucket={entry.bucket} />
      </div>
    </li>
  );
}

/** Bloco do painel: o mesmo fundo do bento da Carteira, sem sombra. */
export function Tile({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-2xl bg-page/80 ring-1 ring-light-gray/70 ${className}`}>{children}</section>;
}
