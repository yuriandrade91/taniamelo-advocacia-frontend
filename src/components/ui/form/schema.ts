import {
  digitsOf,
  maskCEP,
  maskCPF,
  maskCTPS,
  maskCelular,
  maskEmail,
  maskNIT,
  maskRG,
  maskTelefone,
} from "@/lib/masks/masks";
import {
  validateAmountBRL,
  validateCEP,
  validateCPF,
  validateCTPS,
  validateDate,
  validateEmail,
  validateNIT,
  validatePhone,
  validateRG,
  validateRequired,
  validateRequiredSelection,
  validateUF,
} from "@/lib/validators";
import type { SelectFieldOption } from "./Field";

/**
 * Formulário orientado a schema — a parte pura (sem React).
 *
 * Um campo é descrito uma vez: rótulo, tipo, obrigatoriedade, regra extra,
 * opções e largura. O **tipo** escolhe a strategy (`FIELD_STRATEGIES`): a
 * máscara aplicada na digitação, o validador padrão e o controle que desenha.
 * Assim o CPF é o mesmo CPF no cadastro e na ficha — mesma máscara, mesmo
 * `validateCPF` — sem ninguém precisar lembrar de ligar os dois.
 *
 * A seção continua sendo JSX (`SchemaFields` desenha os campos pedidos, na
 * ordem pedida); o schema descreve campos, não telas.
 */

/** Devolve a mensagem de erro ou `null`. Recebe os demais valores para regras cruzadas. */
export type FieldRule<V> = (value: string, values: V) => string | null;

export type FieldRules<V> = Partial<Record<keyof V, FieldRule<V>>>;

export type FieldKind =
  | "text"
  | "cpf"
  | "rg"
  | "mobile"
  | "phone"
  | "email"
  | "nit"
  | "ctps"
  | "cep"
  | "uf"
  | "digits"
  | "amount"
  | "date"
  | "datetime"
  | "select"
  | "switch"
  | "password"
  | "textarea";

/** O controle que desenha cada tipo. */
export type FieldControl =
  | "text"
  | "textarea"
  | "amount"
  | "select"
  | "switch"
  | "date"
  | "datetime"
  | "password";

type Strategy = {
  control: FieldControl;
  /** Aplicada a cada digitação. */
  mask?: (value: string) => string;
  /** Validador do formato; vazio é sempre válido (obrigatoriedade é à parte). */
  rule?: (value: string) => string | null;
  maxLength?: number;
  inputType?: string;
};

export const FIELD_STRATEGIES: Record<FieldKind, Strategy> = {
  text: { control: "text" },
  cpf: { control: "text", mask: maskCPF, rule: validateCPF, maxLength: 14 },
  rg: { control: "text", mask: maskRG, rule: validateRG },
  mobile: { control: "text", mask: maskCelular, rule: validatePhone },
  phone: { control: "text", mask: maskTelefone, rule: validatePhone },
  email: { control: "text", mask: maskEmail, rule: validateEmail, inputType: "email" },
  nit: { control: "text", mask: maskNIT, rule: validateNIT, maxLength: 14 },
  ctps: { control: "text", mask: maskCTPS, rule: validateCTPS, maxLength: 8 },
  cep: { control: "text", mask: maskCEP, rule: validateCEP, maxLength: 9 },
  uf: { control: "text", mask: (v) => v.toUpperCase(), rule: validateUF, maxLength: 2 },
  // `type="number"` deixaria passar "e", "+" e "-".
  digits: { control: "text", mask: digitsOf },
  // Dinheiro não leva máscara: o `AmountField` mostra embaixo como entendeu o
  // que foi digitado, em vez de reescrever o texto e mover o cursor sozinho.
  amount: { control: "amount", rule: validateAmountBRL },
  date: { control: "date", rule: validateDate },
  datetime: { control: "datetime" },
  select: { control: "select" },
  switch: { control: "switch" },
  password: { control: "password" },
  textarea: { control: "textarea" },
};

export type FieldDef<V = Record<string, string | boolean>> = {
  kind: FieldKind;
  label: string;
  /**
   * Obrigatório. Uma string é o nome usado na mensagem quando o rótulo não
   * serve: "Selecione **o gênero**.", "O campo **Senha do INSS** é obrigatório.".
   */
  required?: boolean | string;
  /** Regra além da do tipo — substitui a do tipo quando `replacesKindRule`. */
  rule?: FieldRule<V>;
  replacesKindRule?: boolean;
  options?: readonly SelectFieldOption[];
  placeholder?: string;
  maxLength?: number;
  /** Colunas na grade de 4 (`FormGrid`). */
  span?: 2 | 4;
  /** Datas: libera o futuro (vencimento); o padrão trava em hoje. */
  allowFuture?: boolean;
  /** Linhas do `textarea`. */
  rows?: number;
  /** Valor inicial; `""` (ou `false` em switch) quando omitido. */
  initial?: string | boolean;
};

export type SectionSchema = Record<string, FieldDef>;

/** Valores tipados pelo schema: switch é boolean, o resto é texto. */
export type SectionValues<S extends SectionSchema> = {
  -readonly [K in keyof S]: S[K]["kind"] extends "switch" ? boolean : string;
};

/**
 * Factory de seção. Identidade em tempo de execução: existe para o TypeScript
 * preservar as chaves e os tipos de cada campo (`SectionValues<typeof s>`).
 */
export const defineSection = <const S extends SectionSchema>(schema: S): S => schema;

/** Valores iniciais de uma seção. */
export function initialValues<S extends SectionSchema>(schema: S): SectionValues<S> {
  return Object.fromEntries(
    Object.entries(schema).map(([key, def]) => [
      key,
      def.initial ?? (def.kind === "switch" ? false : ""),
    ]),
  ) as SectionValues<S>;
}

/** O validador completo de um campo: obrigatoriedade → formato do tipo → regra própria. */
export function ruleOf<V>(def: FieldDef<V>): FieldRule<V> {
  const kindRule = def.replacesKindRule ? undefined : FIELD_STRATEGIES[def.kind].rule;
  return (value, values) => {
    if (def.required) {
      const name = typeof def.required === "string" ? def.required : def.label;
      const missing =
        def.kind === "select"
          ? validateRequiredSelection(value, name)
          : validateRequired(value, name);
      if (missing) return missing;
    }
    return kindRule?.(value) ?? def.rule?.(value, values) ?? null;
  };
}

/** As regras da seção, no formato do `useSectionForm`. Campos sem regra ficam de fora. */
export function rulesOf<S extends SectionSchema>(schema: S): FieldRules<SectionValues<S>> {
  const rules: FieldRules<SectionValues<S>> = {};
  for (const [key, def] of Object.entries(schema)) {
    if (def.required || def.rule || FIELD_STRATEGIES[def.kind].rule) {
      rules[key as keyof S] = ruleOf(def as FieldDef<SectionValues<S>>);
    }
  }
  return rules;
}

/** Roda as regras sobre os valores. Puro: devolve só os campos com erro. */
export function validateValues<V extends Record<string, string | boolean>>(
  rules: FieldRules<V>,
  values: V,
): Partial<Record<keyof V, string>> {
  const errors: Partial<Record<keyof V, string>> = {};
  for (const key of Object.keys(rules) as (keyof V)[]) {
    const raw = values[key];
    // Switches não passam por regra de texto; se precisar, a regra recebe "".
    const message = rules[key]?.(typeof raw === "string" ? raw : "", values);
    if (message) errors[key] = message;
  }
  return errors;
}

/**
 * O valor como texto legível: rótulo da opção, data BR, Sim/Não. `""` quando
 * vazio — quem exibe decide entre "—" e "faltando".
 */
export function formatValue(def: FieldDef, value: string | boolean): string {
  if (def.kind === "switch") return value ? "Sim" : "Não";
  if (!value) return "";
  const text = String(value);
  if (def.kind === "select") return def.options?.find((o) => o.id === text)?.label ?? text;
  if (def.kind === "date" || def.kind === "datetime") {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(text);
    if (!match) return text;
    const [, y, m, d, hh, mm] = match;
    return hh ? `${d}/${m}/${y} às ${hh}:${mm}` : `${d}/${m}/${y}`;
  }
  if (def.kind === "password") return "••••••";
  return text;
}
