"use client";

import { ClearFilters, FilterChips, FilterField } from "@/components/ui/filters/FilterBar";
import type { FiltersState } from "@/hooks/useFilters";
import type { paymentFilters } from "../paymentFilters";

/**
 * A barra de Pagamentos no desenho da Carteira — solta na página, busca
 * grande, selects brancos e chips —, numa linha só a partir do `xl`.
 */
export function PaymentsFilterBar({ filters }: { filters: FiltersState<typeof paymentFilters> }) {
  const field = (name: keyof typeof paymentFilters, className?: string) => (
    <FilterField schema={filters.schema} name={name} values={filters.values} onChange={filters.set} className={className} />
  );
  return (
    <div>
      <div className="flex flex-wrap items-start gap-2 xl:flex-nowrap">
        {field("searchTerm", "min-w-64 flex-[2]")}
        {field("bucket")}
        {field("paymentMethod")}
        {field("period")}
        <ClearFilters isVisible={filters.hasActive} onClear={filters.clear} />
      </div>
      <FilterChips chips={filters.chips} />
    </div>
  );
}
