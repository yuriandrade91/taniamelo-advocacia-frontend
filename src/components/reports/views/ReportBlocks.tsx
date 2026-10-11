"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { EmptyChartIcon } from "@/components/ui/icons/glyphs";
import { formatBRLShort, formatBRLSigned } from "@/lib/format";
import type { Report } from "./useReport";

/**
 * Os blocos que as visões de Relatórios repetem: o gráfico carregando, a
 * série vazia (que não vira gráfico zerado) e a faixa do financeiro em resumo.
 */

/** O espaço do gráfico enquanto a série carrega. */
export function LoadingBlock({ className = "h-40" }: { className?: string }) {
  return (
    <div role="status" aria-label="Carregando…" className="w-full">
      <Skeleton className={`w-full rounded-2xl ${className}`} />
    </div>
  );
}

/** Aviso de série vazia: diz que não há o que mostrar, sem desenhar zero. */
function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-light-gray px-6 py-8 text-center text-sm text-gray-100">
      <EmptyChartIcon className="h-6 w-6 opacity-60" />
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

/**
 * Carregando → aviso de vazio → conteúdo. `children` é função para que nada
 * do gráfico seja montado enquanto não há dado.
 */
export function SeriesGate({
  loading,
  hasData,
  empty,
  loadingClassName,
  children,
}: {
  loading: boolean;
  hasData: boolean;
  empty: string;
  loadingClassName?: string;
  children: () => ReactNode;
}) {
  if (loading) return <LoadingBlock className={loadingClassName} />;
  if (!hasData) return <EmptyNote>{empty}</EmptyNote>;
  return <>{children()}</>;
}

// ── Financeiro em resumo ──

/**
 * Faixa curta com os quatro números do dinheiro do escritório — abre as
 * visões que, no resto, contam outra história (a esteira, os meses). O
 * financeiro vem primeiro em todas elas: é a pergunta que traz o
 * administrador a Relatórios.
 */
export function FinanceSummary({ r, loading }: { r: Report; loading: boolean }) {
  const items = [
    { label: `Entradas ${r.monthShort}`, value: formatBRLSigned(r.flow.current.inflow), ok: r.flow.hasData, tone: "text-primary" },
    { label: `Saídas ${r.monthShort}`, value: formatBRLSigned(r.flow.current.outflow), ok: r.flow.hasData, tone: "text-primary" },
    {
      label: "Saldo acumulado",
      value: formatBRLSigned(r.flow.balance),
      ok: r.flow.hasData,
      tone: r.flow.balance < 0 ? "text-danger" : "text-primary",
    },
    {
      label: "Clientes em atraso (valor)",
      value: formatBRLShort(r.payments.sum.overdue),
      ok: r.payments.hasData,
      tone: r.payments.sum.overdue > 0 ? "text-danger" : "text-primary",
    },
  ];
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-primary">Financeiro em resumo</h3>
        <span className="text-[11px] text-gray-100">carteira por pagamento · parcelas dos clientes por vencimento</span>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="min-w-0 border-l-2 border-secondary/40 pl-3">
            <p className="truncate text-[11px] text-gray-100">{it.label}</p>
            {loading ? (
              <Skeleton className="mt-1.5 h-6 w-28 rounded-lg" />
            ) : it.ok ? (
              <p className={`mt-1 truncate text-xl font-semibold tracking-tight tabular-nums ${it.tone}`}>{it.value}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-100/70">Sem dados para mostrar.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
