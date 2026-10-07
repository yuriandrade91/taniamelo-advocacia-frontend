import type { CalendarDate } from "@internationalized/date";
import type { DateRange } from "@/components/ui/filters/DateRangeField";
import type { ClientListRequest } from "@/interfaces/client/Client.interface";

/**
 * Regras dos filtros da listagem de clientes — funções puras, sem React.
 *
 * Moram fora do hook para serem testáveis sem montar componente (o Vitest
 * deste projeto roda em `node`, sem DOM) e para o hook ficar só com estado.
 */

export type { DateRange };

export type ClientFiltersState = {
  search: string;
  benefitType: string[];
  situation: string[];
  /** Verificado / Potencial — chaves do enum `ClientType`. */
  clientType: string[];
  /** Isento do serviço (`notBillable`): `true`, `false`, ou `null` para todos. */
  notBillable: boolean | null;
  dateRange: DateRange;
};

export const EMPTY_CLIENT_FILTERS: ClientFiltersState = {
  search: "",
  benefitType: [],
  situation: [],
  clientType: [],
  notBillable: null,
  dateRange: null,
};

export const INVERTED_RANGE_MESSAGE = "Data inicial deve ser anterior à data final";

/**
 * Data do filtro → `yyyy-MM-dd`, o formato que a API aceita para dia.
 *
 * Antes ia como `new Date(...).toISOString()`, isto é, meia-noite **UTC**. O
 * backend recebe um instante e compara direto: em UTC-3, "até 03/10" virava
 * "até 02/10 às 21h" — o último dia do período ficava quase todo de fora, e o
 * primeiro começava três horas antes. Com a data pura, o backend resolve o dia
 * no fuso do escritório (início às 00:00, fim às 23:59:59.999).
 */
export const toApiDate = (date: CalendarDate): string => date.toString();

/** Mensagem de erro do período, ou `null` quando é válido (ou incompleto). */
export function dateRangeError(range: DateRange): string | null {
  if (!range?.start || !range?.end) return null;
  return range.start.compare(range.end) > 0 ? INVERTED_RANGE_MESSAGE : null;
}

/**
 * Filtros → query da API.
 *
 * `search` entra já debounced (quem chama passa o valor atrasado), e listas
 * vazias não viram parâmetro — `benefitType=` vazio filtraria por nada.
 * Período inválido não vai: mandaria um filtro que a tela mostra como errado.
 */
export function toClientListParams(
  state: Omit<ClientFiltersState, "search">,
  debouncedSearch: string,
): ClientListRequest {
  const params: ClientListRequest = {};

  const term = debouncedSearch.trim();
  if (term) params.searchTerm = term;

  const benefitType = state.benefitType.filter(Boolean);
  if (benefitType.length > 0) params.benefitType = benefitType;

  const situation = state.situation.filter(Boolean);
  if (situation.length > 0) params.situation = situation;

  const clientType = state.clientType.filter(Boolean);
  if (clientType.length > 0) params.clientType = clientType;

  if (state.notBillable !== null) params.notBillable = state.notBillable;

  const range = state.dateRange;
  if (range?.start && range?.end && !dateRangeError(range)) {
    params.createdFrom = toApiDate(range.start);
    params.createdTo = toApiDate(range.end);
  }

  return params;
}

/** Algum filtro marcado? Habilita o "Limpar filtros". Busca conta, mesmo antes do debounce. */
export const hasActiveClientFilters = (state: ClientFiltersState): boolean =>
  state.search !== "" ||
  state.benefitType.length > 0 ||
  state.situation.length > 0 ||
  state.clientType.length > 0 ||
  state.notBillable !== null ||
  state.dateRange !== null;

/**
 * O valor novo de um filtro é igual ao atual? Listas comparam item a item (na
 * ordem), período compara as datas. Clicar no que já está marcado ("Todos"
 * com Todos ativo) não pode virar estado novo: voltaria para a página 1 e,
 * com o cache limpo, faria outra requisição para a mesma resposta.
 */
export function sameFilterValues(
  current: ClientFiltersState,
  next: Partial<ClientFiltersState>,
): boolean {
  return (Object.keys(next) as (keyof ClientFiltersState)[]).every((key) => {
    const a = current[key];
    const b = next[key];
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((value, index) => value === b[index]);
    }
    if (key === "dateRange") {
      const x = a as DateRange;
      const y = b as DateRange;
      if (!x || !y) return x === y;
      return x.start.compare(y.start) === 0 && x.end.compare(y.end) === 0;
    }
    return a === b;
  });
}
