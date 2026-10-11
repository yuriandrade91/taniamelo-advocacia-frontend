"use client";

import { useEffect, useState } from "react";

/** Espera padrão entre a digitação parar e a busca sair — a mesma em todas as telas. */
const SEARCH_DEBOUNCE_MS = 400;

/**
 * O valor, só depois de ele parar de mudar por `delay` ms — uma busca por
 * tecla não.
 *
 * Texto vazio vale na hora: limpar a busca devolve a lista sem espera.
 * Compare por valor (`Object.is`): para objetos, passe uma chave em texto.
 */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, debounced, delay]);

  return value === "" ? value : debounced;
}
