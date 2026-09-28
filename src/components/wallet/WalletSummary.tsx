"use client";

import { Skeleton } from "@heroui/react";
import { formatBRLCompact } from "@/lib/format";
import type { WalletOverview } from "@/interfaces/finance/OfficeExpense.interface";

/**
 * Entradas, saídas e saldo do mês — **regime de caixa**.
 *
 * Os três números vêm do que foi efetivamente pago no período, não do que
 * venceu. É a diferença entre esta tela e a de Pagamentos, e é o que impede o
 * saldo de contar dinheiro que ainda não chegou.
 */

export type WalletSummaryProps = {
  overview: WalletOverview;
  isLoading: boolean;
};

function Card({
  title,
  amount,
  count,
  accent,
  isLoading,
  emphasis = false,
}: {
  title: string;
  amount: number;
  count?: number;
  accent: string;
  isLoading: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 ${
        emphasis ? "border-primary/15 bg-primary/5" : "border-black/5 bg-white"
      }`}
    >
      <span className="inline-flex flex-col gap-1">
        <span className="text-[13px] font-medium text-primary">{title}</span>
        <span className={`h-[2px] w-8 rounded-full ${accent}`} />
      </span>

      {isLoading ? (
        <Skeleton className="h-9 w-36 rounded-lg" />
      ) : (
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold leading-none text-primary">
            {formatBRLCompact(amount)}
          </span>
          {count !== undefined && (
            <span className="text-xs text-gray-100/60">
              {count} {count === 1 ? "lançamento" : "lançamentos"}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export function WalletSummary({ overview, isLoading }: WalletSummaryProps) {
  const isNegative = overview.balance < 0;

  return (
    <section aria-label="Resumo do caixa" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card
        title="Entradas"
        amount={overview.inflowAmount}
        count={overview.inflowCount}
        accent="bg-success/60"
        isLoading={isLoading}
      />
      <Card
        title="Saídas"
        amount={overview.outflowAmount}
        count={overview.outflowCount}
        accent="bg-danger/60"
        isLoading={isLoading}
      />
      {/* O saldo é o número que se olha primeiro: ganha destaque e muda de cor
          no negativo — sem isso, "-R$ 1.500" e "R$ 1.500" se parecem demais
          numa leitura rápida. */}
      <div
        className={`flex flex-col gap-3 rounded-2xl border p-5 ${
          isNegative
            ? "border-danger/30 bg-danger/5"
            : "border-primary/15 bg-primary/5"
        }`}
      >
        <span className="inline-flex flex-col gap-1">
          <span className="text-[13px] font-medium text-primary">
            Saldo do mês
          </span>
          <span
            className={`h-[2px] w-8 rounded-full ${
              isNegative ? "bg-danger/60" : "bg-secondary/70"
            }`}
          />
        </span>
        {isLoading ? (
          <Skeleton className="h-9 w-36 rounded-lg" />
        ) : (
          <p
            className={`text-3xl font-semibold leading-none ${
              isNegative ? "text-danger" : "text-primary"
            }`}
          >
            {formatBRLCompact(overview.balance)}
          </p>
        )}
      </div>
    </section>
  );
}
