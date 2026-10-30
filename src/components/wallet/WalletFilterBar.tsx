"use client";

import {
  ClearFilters,
  FilterChips,
  FilterField,
  Segmented,
} from "@/components/ui/filters/FilterBar";
import type { FiltersState } from "@/hooks/useFilters";
import type { EntryKind, WalletTab } from "./entryForms";
import { KIND_META } from "./entryKind";
import type { allFilters, expenseFilters, revenueFilters } from "./walletFilters";

/**
 * A barra da Carteira: busca grande e Todos/Saídas/Entradas (com a contagem do mês)
 * em cima; status, categoria (só saída), forma e "Limpar" embaixo; chips dos
 * filtros ativos. Mostra os filtros da aba aberta.
 */
export type WalletFilterBarProps = {
  tab: WalletTab;
  onTabChange: (tab: WalletTab) => void;
  /** Lançamentos do mês em cada aba; `null` enquanto carrega, ausente sem resposta. */
  counts: Record<EntryKind, number | null | undefined>;
  filters: FiltersState<typeof expenseFilters> | FiltersState<typeof revenueFilters> | FiltersState<typeof allFilters>;
};

/** A contagem de "Todos": `null` enquanto um dos lados conta; sem resposta de um, sem selo. */
function sumCounts(counts: Record<EntryKind, number | null | undefined>): number | null | undefined {
  if (counts.income === null || counts.expense === null) return null;
  if (counts.income === undefined || counts.expense === undefined) return undefined;
  return counts.income + counts.expense;
}

export function WalletFilterBar({ tab, onTabChange, counts, filters }: Readonly<WalletFilterBarProps>) {
  // As duas abas têm schemas diferentes (categoria só na saída); a barra só desenha.
  const state = filters as FiltersState<typeof expenseFilters>;
  const field = (name: keyof typeof expenseFilters, className?: string) => (
    <FilterField schema={state.schema} name={name} values={state.values} onChange={state.set} className={className} />
  );
  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {field("searchTerm", "flex-1")}
        <Segmented
          label="Lançamentos do mês"
          mode="tab"
          segments={[
            { id: "all", label: "Todos", active: tab === "all", count: sumCounts(counts) },
            ...(["expense", "income"] as const).map((kind) => ({
              id: kind,
              label: KIND_META[kind].label,
              active: tab === kind,
              count: counts[kind],
            })),
          ]}
          onPress={(id) => onTabChange(id as WalletTab)}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        {field("bucket", "min-w-48 flex-1")}
        {"category" in state.schema && field("category", "min-w-48 flex-1")}
        {field("paymentMethod", "min-w-48 flex-1")}
        <ClearFilters isVisible={state.hasActive} onClear={state.clear} />
      </div>
      <FilterChips chips={state.chips} />
    </div>
  );
}
