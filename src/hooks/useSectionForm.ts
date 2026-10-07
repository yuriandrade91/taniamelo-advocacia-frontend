"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  initialValues,
  rulesOf,
  validateValues,
  type FieldRules,
  type SectionSchema,
  type SectionValues,
} from "@/components/ui/form/schema";

export type { FieldRule, FieldRules } from "@/components/ui/form/schema";

/**
 * Estado de uma seção de formulário: valores, erros e "campo já visitado".
 *
 * Um objeto de estado e **regras como dados** (campo → validador), no lugar de
 * um `useState` por campo com `if`s no submit. Duas formas de declarar:
 *
 * - `{ schema }` — o campo descrito uma vez (`defineSection`): valores
 *   iniciais e regras saem dele, e `SchemaFields` desenha os campos;
 * - `{ initial, rules }` — para estados que não são campos de tela
 *   (endereços em lote, períodos).
 *
 * Os dois se somam: com `schema`, `rules` acrescenta (ou substitui) regras do
 * schema, e `initial` admite valores que não são campos — a situação gravada
 * de um lançamento, o id do cliente escolhido num combo. É o que permite ao
 * formulário validar o que o schema não alcança sem sair do padrão.
 */

/** Valores de formulário: string para inputs/selects, boolean para switches. */
export type FormValues = Record<string, string | boolean>;

type Options<V> =
  | { initial: V; rules?: FieldRules<V>; schema?: undefined }
  | { schema: SectionSchema; initial?: V; rules?: FieldRules<V> };

export function useSectionForm<
  S extends SectionSchema,
  V extends SectionValues<S> = SectionValues<S>,
>(options: {
  schema: S;
  initial?: V;
  rules?: FieldRules<V>;
}): SectionForm<V>;
export function useSectionForm<V extends FormValues>(options: {
  initial: V;
  rules?: FieldRules<V>;
}): SectionForm<V>;
export function useSectionForm<V extends FormValues>(options: Options<V>) {
  const { schema } = options;
  // O schema é constante de módulo: o que sai dele não muda entre renders.
  const [initial] = useState<V>(
    () => options.initial ?? (initialValues(schema!) as unknown as V),
  );
  // As do schema primeiro: `rules` acrescenta e, no mesmo campo, substitui —
  // é como a regra que depende de outro campo (ou do dia de hoje) entra.
  const rules: FieldRules<V> = schema
    ? { ...(rulesOf(schema) as FieldRules<V>), ...options.rules }
    : (options.rules ?? {});

  const [values, setValues] = useState<V>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  /** Erros já revelados. Um campo só mostra erro depois de visitado ou de um submit. */
  const [revealed, setRevealed] = useState(false);

  const errors = useMemo(
    () => validateValues(rules, values),
    // `rules` é redefinido a cada render no ponto de uso; o que importa é `values`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values],
  );
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
    schema,
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

export type SectionForm<V extends FormValues> = {
  schema?: SectionSchema;
  values: V;
  errors: Partial<Record<keyof V, string>>;
  isValid: boolean;
  setField: <K extends keyof V>(key: K, value: V[K]) => void;
  setValues: Dispatch<SetStateAction<V>>;
  touchField: (key: keyof V) => void;
  errorOf: (key: keyof V) => string | undefined;
  revealErrors: () => boolean;
  reset: (next?: V) => void;
};
