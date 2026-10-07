"use client";

import { defineFilters } from "@/components/ui/filters/filters";
import { ClearFilters, FilterField, Segmented } from "@/components/ui/filters/FilterBar";
import { toSelectOptions } from "@/components/ui/form/options";
import type { FiltersState } from "@/hooks/useFilters";
import {
  AppointmentStatusOptions,
  AppointmentTypeOptions,
} from "@/enums/appointment/Appointment";

/**
 * Os filtros da Agenda. O mês é o seletor do topo; a Situação nasce em
 * "Agendado" (`AGENDA_DEFAULTS`, filtrado no endpoint) — "Limpar" volta a ele.
 */
export const agendaFilters = defineFilters({
  search: {
    kind: "search",
    label: "Pesquisar compromisso",
    placeholder: "Pesquisar título, cliente ou descrição…",
  },
  types: {
    kind: "multi",
    label: "Tipo",
    placeholder: "Todos os tipos",
    options: toSelectOptions(AppointmentTypeOptions),
  },
  status: {
    kind: "multi",
    label: "Situação",
    placeholder: "Todas",
    options: toSelectOptions(AppointmentStatusOptions),
  },
});

/** Situação de partida: só os agendados — o que pede ação. */
export const AGENDA_DEFAULTS = { status: ["AGENDADO"] };

/**
 * A barra da Agenda numa linha só (quebra abaixo do `xl`): busca, Tipo, a
 * Situação em segmentos liga/desliga e "Limpar filtros". Sem chips: o que está
 * ativo já aparece no próprio campo.
 */
export function AgendaFilters({ filters }: { filters: FiltersState<typeof agendaFilters> }) {
  const { values, set } = filters;
  const statuses = agendaFilters.status.options;
  /** Cada segmento liga e desliga o seu; com todos ligados, volta a "Todas" — mesmo resultado. */
  const toggle = (id: string) => {
    if (id === "") return set("status", []);
    const next = values.status.includes(id)
      ? values.status.filter((s) => s !== id)
      : [...values.status, id];
    set("status", next.length === statuses.length ? [] : next);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
      <FilterField schema={agendaFilters} name="search" values={values} onChange={set} className="w-full min-w-0 xl:w-auto xl:flex-1" />
      <FilterField schema={agendaFilters} name="types" values={values} onChange={set} className="w-full shrink-0 sm:w-60" />
      <Segmented
        label="Situação"
        mode="toggle"
        segments={[
          { id: "", label: "Todas", active: values.status.length === 0 },
          ...statuses.map((option) => ({ ...option, active: values.status.includes(option.id) })),
        ]}
        onPress={toggle}
      />
      <ClearFilters isVisible={filters.hasActive} onClear={filters.clear} />
    </div>
  );
}
