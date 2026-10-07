"use client";

import {
  ClearFilters,
  FilterChips,
  FilterField,
  Segmented,
} from "@/components/ui/filters/FilterBar";
import type { FiltersState } from "@/hooks/useFilters";
import type { EntryKind } from "./entryForms";
import { KIND_META } from "./entryKind";
import type { expenseFilters, revenueFilters } from "./walletFilters";

/**
 * A barra da Carteira: busca grande e Saídas/Entradas (com a contagem do mês)
 * em cima; status, categoria (só saída), forma e "Limpar" embaixo; chips dos
 * filtros ativos. Mostra os filtros da aba aberta.
 */
export type WalletFilterBarProps = {
  tab: EntryKind;
  onTabChange: (tab: EntryKind) => void;
  /** Lançamentos do mês em cada aba; `null` enquanto carrega, ausente sem resposta. */
  counts: Record<EntryKind, number | null | undefined>;
  filters: FiltersState<typeof expenseFilters> | FiltersState<typeof revenueFilters>;
};

export function WalletFilterBar({ tab, onTabChange, counts, filters }: WalletFilterBarProps) {
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
          segments={(["saida", "entrada"] as const).map((kind) => ({
            id: kind,
            label: KIND_META[kind].label,
            active: tab === kind,
            count: counts[kind],
          }))}
          onPress={(id) => onTabChange(id as EntryKind)}
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
