"use client";

import { Skeleton } from "@heroui/react";
import { formatBRLCompact } from "@/lib/format";
import type { OfficePaymentSummary } from "@/interfaces/payment/OfficePayment.interface";

/**
 * Faixa de indicadores dos valores a receber do INSS no período.
 *
 * Card próprio em vez do `StatCard` da home: lá `total` renderiza "20 / 30"
 * (denominador) e `delta` é variação. Aqui o segundo número é **contagem de
 * pagamentos**, que não é denominador de nada — reaproveitar o componente
 * torceria a semântica dele para caber, e é assim que um componente
 * compartilhado vira um com cinco flags.
 *
 * Os três baldes são disjuntos (vencido / a vencer / recebido) e somam o
 * total. Se a soma não fechar, a regra divergiu entre front e backend — por
 * isso o total é exibido, e não só os três.
 */

type Tone = "danger" | "neutral" | "success";

const TONE_CLASSES: Record<Tone, { value: string; rule: string }> = {
  danger: { value: "text-danger", rule: "bg-danger/60" },
  neutral: { value: "text-primary", rule: "bg-secondary/70" },
  success: { value: "text-[#238C26]", rule: "bg-success/60" },
};

function SummaryCard({
  title,
  amount,
  count,
  tone,
  isLoading,
}: {
  title: string;
  amount: number;
  count: number;
  tone: Tone;
  isLoading: boolean;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5">
      <span className="inline-flex flex-col gap-1">
        <span className="text-[13px] font-medium text-primary">{title}</span>
        <span className={`h-[2px] w-8 rounded-full ${classes.rule}`} />
      </span>

      {isLoading ? (
        <Skeleton className="h-9 w-32 rounded-lg" />
      ) : (
        <p className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-semibold leading-none ${classes.value}`}
          >
            {formatBRLCompact(amount)}
          </span>
          <span className="text-xs text-gray-100/60">
            {count} {count === 1 ? "pagamento" : "pagamentos"}
          </span>
        </p>
      )}
    </div>
  );
}

export type PaymentsSummaryProps = {
  summary: OfficePaymentSummary | null;
  isLoading: boolean;
};

const EMPTY: OfficePaymentSummary = {
  overdueAmount: 0,
  overdueCount: 0,
  upcomingAmount: 0,
  upcomingCount: 0,
  paidAmount: 0,
  paidCount: 0,
  totalAmount: 0,
};

export function PaymentsSummary({ summary, isLoading }: PaymentsSummaryProps) {
  const data = summary ?? EMPTY;

  return (
    <section aria-label="Resumo dos valores a receber">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Atrasado"
          amount={data.overdueAmount}
          count={data.overdueCount}
          tone="danger"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Previsto"
          amount={data.upcomingAmount}
          count={data.upcomingCount}
          tone="neutral"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Recebido"
          amount={data.paidAmount}
          count={data.paidCount}
          tone="success"
          isLoading={isLoading}
        />
        <SummaryCard
          title="Total no período"
          amount={data.totalAmount}
          count={data.overdueCount + data.upcomingCount + data.paidCount}
          tone="neutral"
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
