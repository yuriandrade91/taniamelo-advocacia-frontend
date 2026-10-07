"use client";

import type { ReactNode } from "react";
import type { SectionForm } from "@/hooks/useSectionForm";
import type { ExtractedField } from "./smartFill";
import type { AddressValues, PersonalValues, ProfessionalValues, ServiceValues } from "../schemas";

/**
 * O que todo modo de preenchimento recebe: os MESMOS formulários da página.
 * Trocar de modo não perde nada, e "Salvar cliente" grava o que qualquer
 * modo preencheu. Endereço é o primeiro (o principal).
 */
export type FillModeProps = {
  service: SectionForm<ServiceValues>;
  personal: SectionForm<PersonalValues>;
  professional: SectionForm<ProfessionalValues>;
  address: SectionForm<AddressValues>;
  /** A mesma regra das abas: trocar para PCD pergunta o sexo. */
  onBenefitChange: (next: string, previous: string) => void;
};

/** Grava os campos extraídos de texto nos formulários de destino. */
export function applyExtracted(
  fields: readonly ExtractedField[],
  forms: FillModeProps,
) {
  for (const field of fields) {
    const form = forms[field.target] as unknown as {
      setField: (key: string, value: string) => void;
    };
    if (field.key === "benefit") {
      forms.onBenefitChange(field.value, forms.service.values.benefit);
    }
    form.setField(field.key, field.value);
  }
}

/** Valor atual de um campo extraível — para avisar o que vai ser trocado. */
export function currentValueOf(field: ExtractedField, forms: FillModeProps) {
  const values = forms[field.target].values as Record<string, unknown>;
  const value = values[field.key];
  return typeof value === "string" ? value : "";
}

/* ───────────── lacunas editáveis (petição, carteirinha, linha) ───────────── */

type Tone = "paper" | "card" | "plain";

const TONE: Record<Tone, string> = {
  // Lacuna de documento: sublinhado tracejado dourado, texto forte.
  paper:
    "border-b-2 border-dashed border-secondary/45 font-semibold text-primary placeholder:font-normal placeholder:text-secondary/55 focus:border-solid focus:border-secondary",
  // Impresso no cartão escuro.
  card: "border-b border-white/25 font-medium text-white placeholder:text-white/35 focus:border-secondary",
  // Linha simples em fundo claro.
  plain:
    "border-b border-light-gray font-medium text-primary placeholder:text-gray-100/45 focus:border-secondary",
};

const base =
  "min-w-0 rounded-none bg-transparent px-0.5 outline-none transition-colors";

/** Largura que acompanha o texto, para a lacuna caber na frase. */
const widthOf = (value: string, placeholder: string, min = 4) =>
  `${Math.max((value || placeholder).length, min) + 1.5}ch`;

export function InlineInput({
  value,
  onChange,
  placeholder,
  label,
  tone = "paper",
  missing = false,
  fluid = false,
  className = "",
  type = "text",
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Nome acessível — a lacuna não tem rótulo visível. */
  label: string;
  tone?: Tone;
  /** Obrigatório vazio: ganha fundo dourado claro. */
  missing?: boolean;
  /** Ocupa a largura do contêiner em vez de acompanhar o texto. */
  fluid?: boolean;
  className?: string;
  type?: "text" | "email" | "password";
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(event) => onChange(event.target.value)}
      style={fluid ? undefined : { width: widthOf(value, placeholder) }}
      className={`${base} ${TONE[tone]} ${fluid ? "w-full" : "inline-block"} ${
        missing && !value ? "bg-secondary/10" : ""
      } ${className}`}
    />
  );
}

export function InlineSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
  tone = "paper",
  missing = false,
  fluid = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  placeholder: string;
  label: string;
  tone?: Tone;
  missing?: boolean;
  fluid?: boolean;
  className?: string;
}) {
  const shown = options.find((option) => option.value === value)?.label ?? "";
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={fluid ? undefined : { width: widthOf(shown, placeholder, 6) }}
      className={`${base} ${TONE[tone]} cursor-pointer appearance-none ${
        fluid ? "w-full" : "inline-block"
      } ${
        !value
          ? tone === "card"
            ? "font-normal text-white/40"
            : "font-normal text-secondary/55"
          : ""
      } ${
        missing && !value ? "bg-secondary/10" : ""
      } ${tone === "card" ? "[&>option]:text-primary" : ""} ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function InlineDate({
  value,
  onChange,
  label,
  tone = "paper",
  missing = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  tone?: Tone;
  missing?: boolean;
  className?: string;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${base} ${TONE[tone]} inline-block w-[11.5ch] ${
        tone === "card" ? "[color-scheme:dark]" : ""
      } ${missing && !value ? "bg-secondary/10" : ""} ${className}`}
    />
  );
}

/** Rótulo pequeno em cima de uma lacuna (carteirinha, linha da vida). */
export function Caption({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "card" | "back";
}) {
  const color =
    tone === "card"
      ? "text-white/55"
      : tone === "back"
        ? "text-primary/55"
        : "text-gray-100/70";
  return (
    <span
      className={`block text-[10px] font-semibold tracking-[0.12em] uppercase ${color}`}
    >
      {children}
    </span>
  );
}
