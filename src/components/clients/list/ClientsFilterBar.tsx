"use client";

import type { ReactNode } from "react";
import type { UseClientFiltersResult } from "@/components/clients/list/useClientFilters";
import {
  ClearFilters,
  FIELD_SURFACE,
  FilterChips,
  SearchInput,
  Segmented,
} from "@/components/ui/filters/FilterBar";
import { MultiSelectField } from "@/components/ui/form/Field";
import {
  BENEFIT_FILTER_OPTIONS,
  CLIENT_TYPE_SEGMENTS,
  NOT_BILLABLE_SEGMENTS,
  SITUATION_FILTER_OPTIONS,
  buildFilterChips,
  notBillableFromSegment,
  notBillableSegmentId,
  selectedClientType,
} from "./filterChips";

/**
 * A barra de Clientes: busca, Tipo e isenção em cima; benefício,
 * situação, período e "Limpar" embaixo; chips dos filtros ativos. Só desenha:
 * estado, regras e requisições ficam em `useClientFilters`.
 */
export function ClientsFilterBar({
  state,
  dateRangeField,
}: {
  state: UseClientFiltersResult;
  /** O campo de período pronto (DateRangePicker em pt-BR). */
  dateRangeField?: ReactNode;
}) {
  const type = selectedClientType(state.clientType);
  const notBillable = notBillableSegmentId(state.notBillable);
  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          label="Pesquisar beneficiário"
          placeholder="Pesquisar beneficiário…"
          value={state.search}
          onChange={state.setSearch}
          className="flex-1"
        />
        <Segmented
          label="Tipo de cliente"
          mode="radio"
          segments={CLIENT_TYPE_SEGMENTS.map((segment) => ({ ...segment, active: type === segment.id }))}
          onPress={(id) => state.setClientType(id ? [id] : [])}
        />
        <Segmented
          label="Isenção"
          mode="radio"
          segments={NOT_BILLABLE_SEGMENTS.map((segment) => ({ ...segment, active: notBillable === segment.id }))}
          onPress={(id) => state.setNotBillable(notBillableFromSegment(id))}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <MultiSelectField
          label="Benefício pretendido"
          placeholder="Todos"
          hideLabel
          className={`min-w-48 flex-1 ${FIELD_SURFACE}`}
          options={BENEFIT_FILTER_OPTIONS}
          selectedKeys={state.benefitType}
          onSelectionChange={state.setBenefitType}
        />
        <MultiSelectField
          label="Situação do benefício"
          placeholder="Todas"
          hideLabel
          className={`min-w-48 flex-1 ${FIELD_SURFACE}`}
          options={SITUATION_FILTER_OPTIONS}
          selectedKeys={state.situation}
          onSelectionChange={state.setSituation}
        />
        {dateRangeField && <div className={`min-w-60 shrink-0 ${FIELD_SURFACE}`}>{dateRangeField}</div>}
        <ClearFilters isVisible={state.hasActiveFilters} onClear={state.clear} />
      </div>
      <FilterChips chips={buildFilterChips(state)} />
    </div>
  );
}
