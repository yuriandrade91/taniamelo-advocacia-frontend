"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClientListRequest } from "@/interfaces/client/Client.interface";

/**
 * Estado dos filtros da listagem de clientes.
 *
 * Antes isso eram seis `useState` soltos na página (`search`,
 * `debouncedSearch`, `benefitType`, `situation`, `data`, `dateError`) mais o
 * `useEffect` do debounce, misturados com o estado de dados e de paginação. O
 * efeito de busca dependia de todos eles e ninguém conseguia dizer, olhando a
 * página, o que era filtro e o que era resultado.
 *
 * Aqui a responsabilidade é uma só: guardar o que o usuário escolheu e
 * traduzir isso no `ClientListRequest` que a API espera. Nada de fetch, nada
 * de paginação — quem consome decide o que fazer quando `params` muda.
 */

/**
 * O `DateRangePicker` do React Aria trabalha com `DateValue`
 * (@internationalized/date), não com `Date`. Tipamos de forma frouxa porque a
 * página só repassa o valor adiante — a conversão para ISO acontece em
 * `toParams`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DateValue = any;
export type DateRange = { start: DateValue; end: DateValue } | null;

/** Tempo entre a digitação parar e a busca disparar. */
const SEARCH_DEBOUNCE_MS = 500;

export type ClientFiltersState = {
  search: string;
  benefitType: string[];
  situation: string[];
  /** Verificado / Potencial — chaves do enum `ClientType`. */
  clientType: string[];
  dateRange: DateRange;
  dateError: string | null;
};

export type UseClientFiltersResult = ClientFiltersState & {
  /** Filtros traduzidos para a query da API. Estável entre renders iguais. */
  params: ClientListRequest;
  setSearch: (value: string) => void;
  setBenefitType: (keys: string[]) => void;
  setSituation: (keys: string[]) => void;
  setClientType: (keys: string[]) => void;
  setDateRange: (range: DateRange) => void;
  /** `true` quando há qualquer filtro ativo — habilita o "Limpar filtro". */
  hasActiveFilters: boolean;
  clear: () => void;
};

const EMPTY: ClientFiltersState = {
  search: "",
  benefitType: [],
  situation: [],
  clientType: [],
  dateRange: null,
  dateError: null,
};

/** `DateValue` | string -> ISO-8601, que é o que o backend espera. */
function toIso(value: DateValue): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function useClientFilters(
  /** Chamado sempre que um filtro muda — a página usa para voltar à página 1. */
  onChange?: () => void,
): UseClientFiltersResult {
  const [state, setState] = useState<ClientFiltersState>(EMPTY);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce só do texto: os demais filtros são cliques, e esperar meio
  // segundo depois de um clique é latência sem motivo.
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(state.search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [state.search]);

  const patch = useCallback(
    (next: Partial<ClientFiltersState>) => {
      setState((prev) => ({ ...prev, ...next }));
      onChange?.();
    },
    [onChange],
  );

  const setDateRange = useCallback(
    (range: DateRange) => {
      // O componente já impede fim antes do início; isto cobre valor vindo de
      // fora (URL, cache) já invertido.
      let dateError: string | null = null;
      if (range?.start && range?.end) {
        const start = new Date(String(range.start));
        const end = new Date(String(range.end));
        const isValid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime());
        if (isValid && start > end) {
          dateError = "Data inicial deve ser anterior à data final";
        }
      }
      patch({ dateRange: range, dateError });
    },
    [patch],
  );

  const params = useMemo<ClientListRequest>(() => {
    const next: ClientListRequest = {};

    const term = debouncedSearch.trim();
    if (term) next.searchTerm = term;

    if (state.benefitType.length > 0) {
      next.benefitType = state.benefitType.filter(Boolean);
    }
    if (state.situation.length > 0) {
      next.situation = state.situation.filter(Boolean);
    }
    if (state.clientType.length > 0) {
      next.clientType = state.clientType.filter(Boolean);
    }

    // Intervalo inválido não vai para a API — mandaria um filtro que o
    // usuário está vendo marcado como errado na tela.
    if (!state.dateError && state.dateRange?.start && state.dateRange?.end) {
      next.createdFrom = toIso(state.dateRange.start);
      next.createdTo = toIso(state.dateRange.end);
    }

    return next;
  }, [
    debouncedSearch,
    state.benefitType,
    state.situation,
    state.clientType,
    state.dateRange,
    state.dateError,
  ]);

  const hasActiveFilters =
    state.search !== "" ||
    state.benefitType.length > 0 ||
    state.situation.length > 0 ||
    state.clientType.length > 0 ||
    state.dateRange !== null;

  const clear = useCallback(() => {
    setState(EMPTY);
    setDebouncedSearch("");
    onChange?.();
  }, [onChange]);

  return {
    ...state,
    params,
    setSearch: (search) => patch({ search }),
    setBenefitType: (benefitType) => patch({ benefitType }),
    setSituation: (situation) => patch({ situation }),
    setClientType: (clientType) => patch({ clientType }),
    setDateRange,
    hasActiveFilters,
    clear,
  };
}
