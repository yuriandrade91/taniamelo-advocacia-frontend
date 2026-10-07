"use client";

import { useCallback, useState } from "react";
import {
  emptyFilters,
  filterChips,
  hasActiveFilters,
  type FilterSchema,
  type FilterValues,
} from "@/components/ui/filters/filters";
import { useDebouncedValue } from "./useDebouncedValue";

/**
 * O estado de uma barra de filtros descrita por schema (`defineFilters`).
 *
 * - `defaults` é o padrão da tela: "Limpar" volta a ele, e só o que difere
 *   dele conta como filtro ativo.
 * - `search` é o texto da busca já com debounce e sem espaços nas pontas —
 *   é o que vai para a API; o resto dos campos são cliques, sem espera.
 */
export function useFilters<S extends FilterSchema>(schema: S, defaults?: Partial<FilterValues<S>>) {
  const [initial] = useState<FilterValues<S>>(() => ({ ...emptyFilters(schema), ...defaults }));
  const [values, setValues] = useState(initial);

  const set = useCallback(
    <K extends keyof S>(key: K, value: FilterValues<S>[K]) =>
      setValues((current) => ({ ...current, [key]: value })),
    [],
  );
  const clear = useCallback(() => setValues(initial), [initial]);

  const searchKey = Object.keys(schema).find((key) => schema[key].kind === "search");
  const search = useDebouncedValue(searchKey ? String(values[searchKey]).trim() : "");

  return {
    schema,
    values,
    set,
    clear,
    search,
    hasActive: hasActiveFilters(schema, values, initial),
    chips: filterChips(schema, values, setValues),
  };
}

export type FiltersState<S extends FilterSchema> = ReturnType<typeof useFilters<S>>;
