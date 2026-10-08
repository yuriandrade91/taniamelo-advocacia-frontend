"use client";

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
