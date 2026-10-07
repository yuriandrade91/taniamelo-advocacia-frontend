"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import { formatMonthLabel, type MonthRef } from "@/lib/period";
import {
  balanceStatus,
  balanceTone,
  countLabel,
  exact,
  money,
  percent,
  realized,
  type MonthSummary,
} from "./monthSummary";

/**
 * Resumo do mês da Carteira, no desenho dos blocos do painel de detalhe: o
 * saldo em bloco grande (número de 2rem, pílula de status, quanto do mês já se
 * realizou e a projeção), e entradas, saídas e o previsto em blocos menores.
 * O "quanto já se realizou" vai só em porcentagem, sem anel.
 */
export function WalletMonthSummary({
  summary,
  isLoading,
  month,
}: {
  summary: MonthSummary;
  isLoading: boolean;
  month: MonthRef;
}) {
  const { inflow, outflow, expectedIn, expectedOut, overdueIn, overdueOut, balance, projected } = summary;
  const status = balanceStatus(balance);
  const done = (inflow?.amount ?? 0) + (outflow?.amount ?? 0);
  const all =
    done +
    (expectedIn?.amount ?? 0) +
    (expectedOut?.amount ?? 0) +
    (overdueIn?.amount ?? 0) +
    (overdueOut?.amount ?? 0);
  const monthDone = all > 0 ? done / all : 0;
  const overdue = (overdueIn?.amount ?? 0) + (overdueOut?.amount ?? 0);

  return (
    <section aria-label="Resumo do mês" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile className="flex flex-col justify-between gap-4 p-5 sm:col-span-2 lg:row-span-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-gray-100/60 uppercase">Resumo do mês</p>
            <p className="mt-1 text-sm font-medium text-primary">{formatMonthLabel(month)}</p>
          </div>
          {isLoading ? (
            <span className="inline-flex h-[26px] w-24 items-center justify-center rounded-full bg-primary/5 ring-1 ring-primary/10">
              <LoadingCircle label="Carregando o saldo" />
            </span>
          ) : (
            <StatusPill dot={status.dot}>{status.label}</StatusPill>
          )}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide text-gray-100/60 uppercase">Saldo do caixa</p>
            <Num
              value={balance}
              isLoading={isLoading}
              className={`mt-1 block text-[2rem] tracking-tight ${balanceTone(balance)}`}
              skeleton="mt-1 h-8 w-40"
            />
          </div>
          <Share fraction={isLoading ? null : monthDone} label="do mês realizado" className="text-secondary" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-page/80 px-4 py-2 text-sm ring-1 ring-light-gray/70">
          <span className="text-gray-100">Se tudo o que falta for quitado</span>
          {isLoading ? (
            <Skeleton className="h-5 w-24 rounded-md" />
          ) : (
            <span className={`font-semibold tabular-nums ${balanceTone(projected)}`}>{money(projected)}</span>
          )}
        </div>
      </Tile>

      <SmallTile
        label="Entradas"
        dot="bg-success"
        isLoading={isLoading}
        note={countLabel(inflow, "recebidos")}
        aside={<Share fraction={isLoading ? null : realized(inflow, expectedIn, overdueIn)} label="recebido" className="text-gray-100" />}
      >
        <Num value={inflow?.amount} isLoading={isLoading} className="text-xl text-emerald-700" />
      </SmallTile>

      <SmallTile
        label="Saídas"
        dot="bg-rose-500"
        isLoading={isLoading}
        note={countLabel(outflow, "pagos")}
        aside={<Share fraction={isLoading ? null : realized(outflow, expectedOut, overdueOut)} label="pago" className="text-gray-100" />}
      >
        <Num value={outflow?.amount} isLoading={isLoading} className="text-xl text-rose-500" />
      </SmallTile>

      <SmallTile label="Previsto a receber" dot="bg-success" isLoading={isLoading} note={countLabel(expectedIn, "no prazo")}>
        <Num value={expectedIn?.amount} isLoading={isLoading} plus className="text-xl text-emerald-700" />
      </SmallTile>

      <SmallTile
        label="Previsto a pagar"
        dot="bg-rose-500"
        isLoading={isLoading}
        note={overdue > 0 ? <span className="text-danger">{money(overdue)} em atraso no mês</span> : countLabel(expectedOut, "no prazo")}
      >
        <Num value={expectedOut ? -expectedOut.amount : null} isLoading={isLoading} className="text-xl text-rose-500" />
      </SmallTile>
    </section>
  );
}

function Tile({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-3xl bg-white ring-1 ring-black/5 ${className}`}>{children}</div>;
}

/** A parte já realizada, só o número; `null` carregando (o rótulo fica, o número é skeleton). */
function Share({ fraction, label, className }: { fraction: number | null; label: string; className: string }) {
  return (
    <span className="flex shrink-0 flex-col items-end text-right leading-none">
      {fraction === null ? (
        <Skeleton className="h-4 w-9 rounded-md" />
      ) : (
        <span className={`block text-base font-semibold tabular-nums ${className}`}>{percent(fraction)}</span>
      )}
      <span className="mt-1 block text-[11px] text-gray-100/60">{label}</span>
    </span>
  );
}

function SmallTile({
  label,
  dot,
  note,
  aside,
  isLoading,
  children,
}: {
  label: string;
  dot: string;
  note: ReactNode;
  isLoading: boolean;
  /** No canto de cima, à direita do rótulo (a porcentagem realizada). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Tile className="flex flex-col gap-2 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-wide text-gray-100/60 uppercase">
          <Dot className={dot} />
          {label}
        </p>
        {aside}
      </div>
      <div>{children}</div>
      {isLoading ? <Skeleton className="h-4 w-28 rounded-md" /> : <p className="text-xs text-gray-100">{note}</p>}
    </Tile>
  );
}

/** Número de dinheiro: esqueleto enquanto carrega. */
function Num({
  value,
  isLoading,
  className = "text-2xl",
  plus = false,
  skeleton = "h-5 w-28",
}: {
  value: number | null | undefined;
  isLoading: boolean;
  className?: string;
  plus?: boolean;
  skeleton?: string;
}) {
  if (isLoading) return <Skeleton className={`rounded-lg ${skeleton}`} />;
  return (
    <span title={exact(value)} className={`leading-none font-semibold whitespace-nowrap tabular-nums ${className}`}>
      {money(value, { plus })}
    </span>
  );
}

/** Ponto de cor ao lado do rótulo. */
function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${className}`} />;
}

/** Pílula de status: ponto na cor + texto, como no painel de detalhe. */
function StatusPill({ dot, children }: { dot: string; children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/10">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
