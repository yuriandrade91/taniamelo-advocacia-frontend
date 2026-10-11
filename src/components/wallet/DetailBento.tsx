"use client";

import { useState, type ReactNode } from "react";
import { ProgressBar, Skeleton } from "@heroui/react";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import {
  BUCKET_BADGE,
  type PaymentBucket,
} from "@/components/payments/paymentBuckets";
import { PencilIcon } from "@/components/ui/icons/actions";
import { formatBRL, formatDateBR, initials } from "@/lib/format";
import { todayIso } from "@/lib/period";
import {
  amountForClipboard,
  currentStep,
  dueLine,
  dueProgress,
  type TimelineStepId,
} from "./entryDetails";
import { PulseHalo, STATUS_DOT } from "./PulseHalo";

/**
 * Detalhe de um valor com vencimento em blocos ("bento") — o desenho escolhido
 * em 01/10/2026 entre cinco versões comparadas na tela real. Serve à Carteira
 * (entrada e saída, `EntryBentoView`) e a Pagamentos (parcela do cliente,
 * `PaymentBentoView`): as duas telas falam de "quanto, quando, com quem e em
 * que pé", e um desenho só é o que mantém as duas lendo igual.
 *
 * Cada bloco responde uma pergunta: quanto e em que pé (valor + status),
 * quando (prazo), com quem, como (fatos), por onde passou (percurso) e o que
 * foi anotado. Os neutros fazem o fundo dos blocos, para não competir com o
 * valor.
 *
 * - **Status em pílula** (ponto colorido + nome), o padrão vindo da versão
 *   "Noturno": mais leve que o selo cheio, e o ponto usa a mesma cor do
 *   status que a tabela.
 * - **Ações no fim do painel**, numa barra fixa ao rolar — também o padrão
 *   do "Noturno" —, com as cores do style guide: azul da marca na ação
 *   principal, dourado no "Editar" (o mesmo do lápis das tabelas).
 * - Interação onde ajuda: copiar o valor com um clique (vai para planilha,
 *   mensagem ao cliente) e blocos que levantam ao passar o mouse.
 *
 * O que muda de uma tela para a outra entra por props — rótulos, quem é a
 * outra parte, os três fatos —, nunca por `if` de tela aqui dentro.
 */

const RING: Record<PaymentBucket, string> = {
  overdue: "text-danger",
  upcoming: "text-previsto",
  paid: "text-success",
  cancelled: "text-light-gray",
};

/** Os campos que o bento lê — comuns a lançamento e parcela. */
type BentoEntry = {
  description: string;
  /** Parcela pode vir sem valor; aí mostra "—" e não oferece copiar. */
  amount?: number;
  status?: string;
  overdue?: boolean;
  dueDate: string;
  paidDate?: string;
  createdAt?: string;
  notes?: string;
};

export type DetailBentoProps = {
  entry: BentoEntry;
  /** Sobretítulo do bloco do valor: "Entrada", "Saída", "Parcela 2/10". */
  eyebrow: string;
  /** A outra parte: cliente ou fornecedor. */
  party: {
    label: string;
    name: string | null;
    /** Mostrado quando não há nome. */
    emptyText: string;
    /** Ação no bloco, ex. abrir a ficha do cliente. */
    action?: { label: string; onPress: () => void };
  };
  /** Os três blocos pequenos, na ordem em que aparecem. */
  facts: [BentoFact, BentoFact, BentoFact];
  /** Nome da última etapa quando liquidado: "Recebido" ou "Pago". */
  settledStep: string;
  /** Rótulo da ação principal: "Marcar como recebido" / "como pago". */
  settleLabel: string;
  onEdit?: () => void;
  onSettle?: () => void;
  /** Bloco extra logo abaixo do valor (ex.: o total do acordo da parcela). */
  summary?: ReactNode;
};

type BentoFact = { label: string; value: ReactNode };

export function DetailBento({
  entry,
  eyebrow,
  party,
  facts,
  settledStep,
  settleLabel,
  onEdit,
  onSettle,
  summary,
}: DetailBentoProps) {
  const today = todayIso();
  const due = dueLine(entry, today);
  const progress = dueProgress(entry, today);
  const badge = BUCKET_BADGE[due.bucket];
  const isOpen = due.bucket === "overdue" || due.bucket === "upcoming";

  return (
    <div className="flex min-h-full flex-col gap-3">
      <div className="grid grid-cols-6 gap-3">
        {/* ── valor + status ── */}
        <Tile className="col-span-6 bg-white p-5 ring-1 ring-light-gray">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-gray-100/60 uppercase">
                {eyebrow}
              </p>
              <p className="mt-1 truncate text-sm font-medium text-primary">
                {entry.description}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/10">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[due.bucket]}`}
              />
              {badge.label}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <p
              className={`text-[2.5rem] leading-none font-semibold tracking-tight tabular-nums text-primary ${
                due.bucket === "cancelled"
                  ? "line-through decoration-1 opacity-50"
                  : ""
              }`}
            >
              {entry.amount === undefined ? "—" : formatBRL(entry.amount)}
            </p>
            {entry.amount !== undefined && <CopyAmount amount={entry.amount} />}
          </div>
        </Tile>

        {summary && <Tile className="col-span-6 p-4">{summary}</Tile>}

        {/* ── quem ── linha inteira: nome de cliente é longo ("Fernanda
            Rodrigues Nascimento") e cortado em meia linha não identificava
            ninguém. A ação (ex. "Ver ficha") vai à direita, no espaço que
            sobra. */}
        <Tile className="col-span-6 flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-sm font-semibold text-primary">
            {party.name ? initials(party.name) : "—"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-wide text-gray-100/60 uppercase">
              {party.label}
            </p>
            <p className="text-sm font-medium break-words text-gray-100">
              {party.name ?? party.emptyText}
            </p>
          </div>
          {party.action && (
            <button
              type="button"
              onClick={party.action.onPress}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-secondary ring-1 ring-light-gray transition hover:bg-white"
            >
              {party.action.label}
            </button>
          )}
        </Tile>

        {/* ── prazo ── */}
        <Tile className="col-span-6 flex items-center gap-4 p-4">
          <Ring
            fraction={progress.fraction}
            bucket={due.bucket}
            center={progress.center}
          />
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide text-gray-100/60 uppercase">
              Prazo
            </p>
            <p className="text-sm font-medium text-gray-100">{due.text}</p>
          </div>
        </Tile>

        {/* ── fatos ── */}
        {facts.map((fact) => (
          <Mini key={fact.label} label={fact.label} value={fact.value} />
        ))}

        {/* ── percurso ── */}
        <Tile className="col-span-6 p-4">
          <Track entry={entry} bucket={due.bucket} settledStep={settledStep} />
        </Tile>

        {/* ── observações ── */}
        <Tile className="col-span-6 p-4">
          <p className="text-[11px] tracking-wide text-gray-100/60 uppercase">
            Observações
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-gray-100">
            {entry.notes?.trim() || "Nada anotado."}
          </p>
        </Tile>
      </div>

      {/* ── ações: no fim do painel, fixas ao rolar ── */}
      {(onEdit || onSettle) && (
        <div className="sticky bottom-0 mt-auto bg-white pt-3">
          <div className="flex gap-2 rounded-2xl bg-page p-1.5 ring-1 ring-light-gray">
            {onSettle && isOpen && (
              <button
                type="button"
                onClick={onSettle}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-[0.98] motion-reduce:active:scale-100"
              >
                {settleLabel}
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-secondary transition hover:bg-white active:scale-[0.98] motion-reduce:active:scale-100 ${
                  onSettle && isOpen ? "" : "flex-1"
                }`}
              >
                <PencilIcon />
                Editar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── partes ───────────────────────── */

function Tile({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl bg-page/80 ring-1 ring-light-gray/70 transition duration-200 hover:-translate-y-0.5 hover:ring-secondary/40 motion-reduce:hover:translate-y-0 ${className}`}
    >
      {children}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Tile className="col-span-2 p-3">
      <p className="text-[10px] tracking-wide text-gray-100/60 uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-gray-100 tabular-nums">
        {value}
      </p>
    </Tile>
  );
}

/** Copia o valor no formato que cola em planilha: "599,16". */
function CopyAmount({ amount }: { amount: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(amountForClipboard(amount));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sem permissão de área de transferência: o botão simplesmente não confirma.
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label="Copiar valor"
      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary ring-1 ring-light-gray transition hover:bg-page"
    >
      {copied ? "Copiado ✓" : "Copiar"}
    </button>
  );
}

function Ring({
  fraction,
  bucket,
  center,
}: {
  fraction: number;
  bucket: PaymentBucket;
  center: string;
}) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 48 48" className="h-full w-full -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="5"
          className="stroke-light-gray"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke="currentColor"
          className={`${RING[bucket]} transition-[stroke-dashoffset] duration-700 ease-out`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary">
        {center}
      </span>
    </div>
  );
}

/**
 * Cor do preenchimento da barra da etapa **atual** — a do status, como no
 * selo da tabela. Etapa que já passou é verde (`PAST_FILL`): ela aconteceu, e
 * pintá-la de vermelho num atrasado dizia que o lançamento em si deu errado. O
 * `ProgressBar` do HeroUI lê a cor da variável `--progress-bar-fill`; as
 * classes são literais para o Tailwind gerar todas.
 */
const PROGRESS_FILL: Record<PaymentBucket, string> = {
  overdue: "[--progress-bar-fill:var(--color-danger)]",
  upcoming: "[--progress-bar-fill:var(--color-previsto)]",
  paid: "[--progress-bar-fill:var(--color-success)]",
  cancelled: "[--progress-bar-fill:var(--color-gray-100)]",
};

/** Etapa já percorrida: sempre a cor positiva, qualquer que seja o status. */
const PAST_FILL = "[--progress-bar-fill:var(--color-success)]";

/**
 * Etapas em segmentos — o estilo de exibição de status da versão "Noturno",
 * trazido para o fundo claro: uma barra por etapa, o nome e a data embaixo, e
 * o halo só na etapa atual.
 *
 * Cada barra é um `ProgressBar` do HeroUI, sem rótulo nem percentual
 * visíveis (o nome da etapa embaixo já diz o que é; o `aria-label` diz ao
 * leitor de tela). Cheia quando a etapa já aconteceu, vazia quando ainda não,
 * e **indeterminada** na etapa atual de um lançamento em aberto — a faixa que
 * corre é o "está em andamento". Pago e cancelado não têm nada andando, então
 * não há barra indeterminada neles. Sem movimento para quem pede
 * `prefers-reduced-motion` (o próprio componente respeita).
 */
function Track({
  entry: data,
  bucket,
  settledStep,
}: {
  entry: BentoEntry;
  bucket: PaymentBucket;
  settledStep: string;
}) {
  const now = currentStep(bucket);
  const isOpenEntry = bucket === "upcoming" || bucket === "overdue";
  const marks: {
    id: TimelineStepId;
    label: string;
    date: string;
    reached: boolean;
  }[] = [
    {
      id: "created",
      label: "Lançado",
      date: formatDateBR(data.createdAt),
      reached: true,
    },
    {
      id: "due",
      label: "Vencimento",
      date: formatDateBR(data.dueDate),
      reached: bucket === "overdue" || bucket === "paid",
    },
    {
      id: "paid",
      label: bucket === "cancelled" ? "Cancelado" : settledStep,
      date: data.paidDate ? formatDateBR(data.paidDate) : "—",
      reached: bucket === "paid",
    },
  ];

  return (
    <ol className="grid grid-cols-3 gap-2">
      {marks.map((mark) => {
        const isCurrent = mark.id === now;
        const isLive = isCurrent && isOpenEntry;
        return (
          <li key={mark.id} aria-current={isCurrent ? "step" : undefined}>
            <ProgressBar
              aria-label={`${mark.label}: ${
                isLive
                  ? "em andamento"
                  : mark.reached
                    ? "concluída"
                    : "pendente"
              }`}
              isIndeterminate={isLive}
              value={isLive ? undefined : mark.reached ? 100 : 0}
              className={`gap-0 ${isCurrent ? PROGRESS_FILL[bucket] : PAST_FILL}`}
            >
              <ProgressBar.Track className="h-1 rounded-full bg-light-gray">
                <ProgressBar.Fill className="rounded-full" />
              </ProgressBar.Track>
            </ProgressBar>
            <span
              className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                isCurrent ? "text-primary" : "text-gray-100/70"
              }`}
            >
              {isCurrent && (
                <span
                  className={`relative h-1.5 w-1.5 rounded-full ${STATUS_DOT[bucket]}`}
                >
                  <PulseHalo bucket={bucket} />
                </span>
              )}
              {mark.label}
            </span>
            <span className="text-[11px] text-gray-100/60 tabular-nums">
              {mark.date}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * O painel carregando, na mesma grade de blocos: os rótulos (que já se sabe
 * quais são) aparecem de verdade; o que vem do servidor é skeleton na largura
 * do dado; a situação é um círculo — o painel não "pula" quando chega.
 */
export function DetailBentoSkeleton({
  eyebrow,
  partyLabel,
  factLabels,
}: {
  eyebrow: string;
  partyLabel: string;
  factLabels: [string, string, string];
}) {
  const label = "text-[11px] tracking-wide text-gray-100/60 uppercase";
  return (
    <div role="status" aria-label="Carregando o detalhe" className="grid grid-cols-6 gap-3">
      <Tile className="col-span-6 bg-white p-5 ring-1 ring-light-gray">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className={`${label} font-medium`}>{eyebrow}</p>
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>
          <span className="inline-flex h-[26px] w-24 items-center justify-center rounded-full bg-primary/5 ring-1 ring-primary/10">
            <LoadingCircle />
          </span>
        </div>
        <Skeleton className="mt-4 h-10 w-48 rounded-lg" />
      </Tile>
      <Tile className="col-span-6 flex items-center gap-3 p-4">
        <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className={label}>{partyLabel}</p>
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
      </Tile>
      <Tile className="col-span-6 flex items-center gap-4 p-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className={label}>Prazo</p>
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </Tile>
      {factLabels.map((fact) => (
        <Tile key={fact} className="col-span-2 p-3">
          <p className="text-[10px] tracking-wide text-gray-100/60 uppercase">{fact}</p>
          <Skeleton className="mt-1.5 h-4 w-16 rounded-md" />
        </Tile>
      ))}
      <Tile className="col-span-6 flex gap-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </Tile>
      <Tile className="col-span-6 p-4">
        <p className={label}>Observações</p>
        <Skeleton className="mt-1.5 h-4 w-3/4 rounded-md" />
      </Tile>
    </div>
  );
}
