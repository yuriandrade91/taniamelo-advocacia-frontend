"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClientListRequest } from "@/interfaces/client/Client.interface";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  EMPTY_CLIENT_FILTERS,
  dateRangeError,
  hasActiveClientFilters,
  sameFilterValues,
  toClientListParams,
  type ClientFiltersState,
  type DateRange,
} from "./clientFilters";

export type { DateRange } from "./clientFilters";

/**
 * Estado dos filtros da listagem de clientes.
 *
 * Responsabilidade única: guardar o que a pessoa escolheu e entregar o
 * `ClientListRequest` pronto. Nada de fetch nem de paginação — quem consome
 * decide o que fazer quando `params` muda. As regras (tradução para a query,
 * validação do período) estão em `clientFilters.ts`, puras e testadas.
 */


export type UseClientFiltersResult = ClientFiltersState & {
  /** Erro do período (início depois do fim), ou `null`. */
  dateError: string | null;
  /** Filtros traduzidos para a query da API. Estável entre renders iguais. */
  params: ClientListRequest;
  setSearch: (value: string) => void;
  setBenefitType: (keys: string[]) => void;
  setSituation: (keys: string[]) => void;
  setClientType: (keys: string[]) => void;
  setNotBillable: (value: boolean | null) => void;
  setDateRange: (range: DateRange) => void;
  /** `true` quando há qualquer filtro ativo — habilita o "Limpar filtros". */
  hasActiveFilters: boolean;
  clear: () => void;
};

export function useClientFilters(
  /** Chamado sempre que um filtro que vai à API muda — a página volta para a página 1. */
  onChange?: () => void,
): UseClientFiltersResult {
  const [state, setState] = useState<ClientFiltersState>(EMPTY_CLIENT_FILTERS);

  /*
   * O aviso de mudança vai por ref: a página passa uma função nova a cada
   * render, e depender dela recriaria todos os setters (e o efeito do
   * debounce) sem motivo.
   */
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  /*
   * Debounce só do texto: os demais filtros são cliques, e esperar meio
   * segundo depois de um clique é latência sem motivo.
   *
   * A volta para a página 1 acontece aqui, junto com o texto que vai para a
   * API, e não a cada tecla: avisar na digitação trocava a página na hora e a
   * lista mudava (página 1 da busca antiga) antes de a busca nova sair. As
   * duas atualizações no mesmo callback viram um render só — uma requisição.
   */
  const debouncedSearch = useDebouncedValue(state.search, undefined, () =>
    onChangeRef.current?.(),
  );

  /*
   * Espelho do estado para o `patch` comparar sem depender dele (o que
   * recriaria todos os setters a cada mudança).
   */
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  /**
   * Muda um filtro de clique e avisa na hora (sem debounce). Valor igual ao
   * atual não faz nada — nem estado novo, nem volta para a página 1.
   */
  const patch = useCallback((next: Partial<ClientFiltersState>) => {
    if (sameFilterValues(stateRef.current, next)) return;
    setState((prev) => ({ ...prev, ...next }));
    onChangeRef.current?.();
  }, []);

  const setSearch = useCallback(
    (search: string) => setState((prev) => ({ ...prev, search })),
    [],
  );
  const setBenefitType = useCallback(
    (benefitType: string[]) => patch({ benefitType }),
    [patch],
  );
  const setSituation = useCallback(
    (situation: string[]) => patch({ situation }),
    [patch],
  );
  const setClientType = useCallback(
    (clientType: string[]) => patch({ clientType }),
    [patch],
  );
  const setNotBillable = useCallback(
    (notBillable: boolean | null) => patch({ notBillable }),
    [patch],
  );
  const setDateRange = useCallback(
    (dateRange: DateRange) => patch({ dateRange }),
    [patch],
  );

  const clear = useCallback(() => {
    setState(EMPTY_CLIENT_FILTERS);
    onChangeRef.current?.();
  }, []);

  const { benefitType, situation, clientType, notBillable, dateRange } = state;
  const params = useMemo(
    () =>
      toClientListParams(
        { benefitType, situation, clientType, notBillable, dateRange },
        debouncedSearch,
      ),
    [benefitType, situation, clientType, notBillable, dateRange, debouncedSearch],
  );

  return {
    ...state,
    dateError: dateRangeError(dateRange),
    params,
    setSearch,
    setBenefitType,
    setSituation,
    setClientType,
    setNotBillable,
    setDateRange,
    hasActiveFilters: hasActiveClientFilters(state),
    clear,
  };
}
