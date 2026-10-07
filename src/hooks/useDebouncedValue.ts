"use client";

import { useEffect, useRef, useState } from "react";

/** Espera padrão entre a digitação parar e a busca sair — a mesma em todas as telas. */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * O valor, só depois de ele parar de mudar por `delay` ms — uma busca por
 * tecla não.
 *
 * - Texto vazio vale na hora: limpar a busca devolve a lista sem espera.
 * - `onSettle` roda no mesmo callback que publica o valor: o que ele mudar
 *   (voltar para a página 1, por exemplo) sai no mesmo render — uma
 *   requisição, não duas.
 *
 * Compare por valor (`Object.is`): para objetos, passe uma chave em texto.
 */
export function useDebouncedValue<T>(
  value: T,
  delay = SEARCH_DEBOUNCE_MS,
  onSettle?: (value: T) => void,
): T {
  const [debounced, setDebounced] = useState(value);
  const settleRef = useRef(onSettle);
  useEffect(() => {
    settleRef.current = onSettle;
  });

  useEffect(() => {
    if (Object.is(value, debounced)) return;
    const timer = setTimeout(() => {
      setDebounced(value);
      settleRef.current?.(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, debounced, delay]);

  return value === "" ? value : debounced;
}
