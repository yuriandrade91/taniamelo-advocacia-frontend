import type { UseClientFiltersResult } from "@/components/clients/list/useClientFilters";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { SituationOptions } from "@/enums/situation/Situation";
import type { FilterChip } from "@/components/ui/filters/filters";

/**
 * Os filtros ativos da barra de Clientes como chips removíveis — função pura.
 *
 * A busca nunca vira chip: o texto já está no próprio campo. Tipo, isenção,
 * benefício, situação e período, sim, cada um com o seu "remover" — que tira só aquele
 * valor, sem mexer nos outros.
 */

/** Os três botões do Tipo. `""` = sem filtro (os dois tipos). */
export const CLIENT_TYPE_SEGMENTS = [
  { id: "", label: "Todos" },
  { id: "VERIFICADO", label: "Verificados" },
  { id: "POTENCIAL", label: "Potenciais" },
] as const;

/** Os três botões da isenção (`notBillable`). `""` = sem filtro. */
export const NOT_BILLABLE_SEGMENTS = [
  { id: "", label: "Todos" },
  { id: "true", label: "Isentos" },
  { id: "false", label: "Não isentos" },
] as const;

/** `notBillable` ↔ id do botão: `null` é `""`; o botão volta como booleano. */
export const notBillableSegmentId = (value: boolean | null): string =>
  value === null ? "" : String(value);
export const notBillableFromSegment = (id: string): boolean | null =>
  id === "" ? null : id === "true";

export const BENEFIT_FILTER_OPTIONS = BenefitOptions.map((o) => ({ id: o.value, label: o.label }));
export const SITUATION_FILTER_OPTIONS = SituationOptions.map((o) => ({ id: o.value, label: o.label }));


type ChipSource = Pick<
  UseClientFiltersResult,
  | "clientType"
  | "notBillable"
  | "benefitType"
  | "situation"
  | "dateRange"
  | "setClientType"
  | "setNotBillable"
  | "setBenefitType"
  | "setSituation"
  | "setDateRange"
>;

const labelOf = (options: readonly { id: string; label: string }[], id: string) =>
  options.find((option) => option.id === id)?.label ?? id;

/** O Tipo marcado, ou `""` — um tipo só marcado é o único estado com filtro. */
export const selectedClientType = (clientType: readonly string[]): string =>
  clientType.length === 1 ? clientType[0] : "";

export function buildFilterChips(state: ChipSource): FilterChip[] {
  const chips: FilterChip[] = [];

  const type = selectedClientType(state.clientType);
  if (type) {
    chips.push({
      key: "tipo",
      label: labelOf(CLIENT_TYPE_SEGMENTS, type),
      remove: () => state.setClientType([]),
    });
  }

  if (state.notBillable !== null) {
    chips.push({
      key: "isencao",
      label: labelOf(NOT_BILLABLE_SEGMENTS, notBillableSegmentId(state.notBillable)),
      remove: () => state.setNotBillable(null),
    });
  }

  for (const id of state.benefitType) {
    chips.push({
      key: `beneficio:${id}`,
      label: labelOf(BENEFIT_FILTER_OPTIONS, id),
      remove: () => state.setBenefitType(state.benefitType.filter((key) => key !== id)),
    });
  }

  for (const id of state.situation) {
    chips.push({
      key: `situacao:${id}`,
      label: labelOf(SITUATION_FILTER_OPTIONS, id),
      remove: () => state.setSituation(state.situation.filter((key) => key !== id)),
    });
  }

  if (state.dateRange?.start && state.dateRange?.end) {
    chips.push({
      key: "periodo",
      label: "Período do registro",
      remove: () => state.setDateRange(null),
    });
  }

  return chips;
}
