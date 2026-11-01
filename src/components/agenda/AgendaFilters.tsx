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
 * "Agendado" (`AGENDA_DEFAULTS`, filtrado no endpoint).
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
 * Situação em segmentos e "Limpar filtros". Sem chips: o que está ativo já
 * aparece no próprio campo.
 *
 * A Situação é uma escolha só (um segmento por vez, "Todas" é nenhum) e fica
 * fora do "Limpar": ele é da busca e do Tipo, e não mexe no segmento.
 */
export function AgendaFilters({ filters }: Readonly<{ filters: FiltersState<typeof agendaFilters> }>) {
  const { values, set } = filters;
  const statuses = agendaFilters.status.options;
  const hasTypedFilter = values.search.trim() !== "" || values.types.length > 0;
  const clear = () => {
    set("search", "");
    set("types", []);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
      <FilterField schema={agendaFilters} name="search" values={values} onChange={set} className="w-full min-w-0 xl:w-auto xl:flex-1" />
      <FilterField schema={agendaFilters} name="types" values={values} onChange={set} className="w-full shrink-0 sm:w-60" />
      <Segmented
        label="Situação"
        mode="radio"
        segments={[
          { id: "", label: "Todas", active: values.status.length === 0 },
          ...statuses.map((option) => ({ ...option, active: values.status.includes(option.id) })),
        ]}
        onPress={(id) => set("status", id ? [id] : [])}
      />
      <ClearFilters isVisible={hasTypedFilter} onClear={clear} />
    </div>
  );
}
