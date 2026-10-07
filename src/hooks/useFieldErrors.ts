"use client";

import { useState } from "react";

/**
 * Quando mostrar o erro de cada campo: assim que ele é mexido (o formulário
 * reage enquanto se preenche), e todos de uma vez no "Salvar". Os erros em si
 * vêm do validador puro de cada formulário.
 */
export function useFieldErrors(errors: Readonly<Record<string, string | undefined>>) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  return {
    errorOf: (key: string) => (submitted || touched.has(key) ? errors[key] : undefined),
    touch: (key: string) => setTouched((current) => (current.has(key) ? current : new Set(current).add(key))),
    /** No "Salvar": revela todos e diz se pode seguir. */
    revealAll: () => {
      setSubmitted(true);
      return Object.values(errors).every((message) => !message);
    },
    reset: () => {
      setTouched(new Set());
      setSubmitted(false);
    },
  };
}
