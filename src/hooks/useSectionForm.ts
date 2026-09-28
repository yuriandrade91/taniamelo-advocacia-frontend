"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Estado de uma seção de formulário: valores, erros e "campo já visitado".
 *
 * Existe para não repetir o padrão que o próprio `REVISAO_ARQUITETURA_2026`
 * aponta como problema no `AppointmentsCard`: um `useState` por campo, 25 no
 * mesmo escopo, com a validação espalhada em `if`s pela função. Aqui o estado
 * é um objeto só e **as regras são dados** — um mapa de campo → validador.
 *
 * Isso também é o degrau anterior ao formulário schema-driven: quando as
 * regras já são dados, mover a definição do campo para um schema deixa de ser
 * reescrita e vira transporte.
 */

/** Devolve a mensagem de erro ou `null`. Recebe os demais valores para regras cruzadas. */
export type FieldRule<V> = (value: string, values: V) => string | null;

export type FieldRules<V> = Partial<Record<keyof V, FieldRule<V>>>;

export type SectionFormOptions<V> = {
  initial: V;
  rules?: FieldRules<V>;
};

/** Valores de formulário: string para inputs/selects, boolean para switches. */
export type FormValues = Record<string, string | boolean>;

export function useSectionForm<V extends FormValues>({
  initial,
  rules = {},
}: SectionFormOptions<V>) {
  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  /** Erros já revelados. Um campo só mostra erro depois de visitado ou de um submit. */
  const [revealed, setRevealed] = useState(false);

  /** Roda todas as regras sobre os valores atuais. Puro: não toca em estado. */
  const errors = useMemo(() => {
    const result: Partial<Record<keyof V, string>> = {};
    for (const key of Object.keys(rules) as (keyof V)[]) {
      const rule = rules[key];
      if (!rule) continue;
      const raw = values[key];
      // Switches não passam por regra de texto; se precisar, a regra recebe "".
      const message = rule(typeof raw === "string" ? raw : "", values);
      if (message) result[key] = message;
    }
    return result;
    // `rules` é redefinido a cada render no ponto de uso; comparar por
    // identidade reexecutaria sempre. O que importa é o conteúdo de `values`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const isValid = Object.keys(errors).length === 0;

  const setField = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  }, []);

  const touchField = useCallback((key: keyof V) => {
    setTouched((current) => ({ ...current, [key]: true }));
  }, []);

  /** Erro exibível: existe, e o usuário já passou pelo campo (ou tentou salvar). */
  const errorOf = useCallback(
    (key: keyof V): string | undefined =>
      revealed || touched[key] ? errors[key] : undefined,
    [errors, revealed, touched],
  );

  /** Chamado no submit: revela todos os erros de uma vez e diz se pode seguir. */
  const revealErrors = useCallback(() => {
    setRevealed(true);
    return Object.keys(errors).length === 0;
  }, [errors]);

  const reset = useCallback(
    (next?: V) => {
      setValues(next ?? initial);
      setTouched({});
      setRevealed(false);
    },
    [initial],
  );

  return {
    values,
    errors,
    isValid,
    setField,
    setValues,
    touchField,
    errorOf,
    revealErrors,
    reset,
  };
}

export type SectionForm<V extends FormValues> = ReturnType<
  typeof useSectionForm<V>
>;
