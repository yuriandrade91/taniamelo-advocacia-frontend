"use client";

import { useRef } from "react";
import { SwitchField } from "@/components/ui/form/Field";
import { FieldSkeleton, SchemaField } from "@/components/ui/form/SchemaFields";
import type { SectionForm } from "@/hooks/useSectionForm";
import { useCepLookup } from "@/hooks/useCepLookup";
import {
  cepPatch,
  decodeCepLookup,
  encodeCepLookup,
  isCepLocked,
  type CepLockable,
} from "@/lib/cepAutofill";
import { maskCEP } from "@/lib/masks/masks";
import { FormGrid } from "../FormSection";
import { addressSchema, type AddressValues } from "../schemas";

/**
 * "Endereço" — campos e regras em `addressSchema`; aqui o comportamento:
 *
 * - CEP completo preenche rua, bairro, cidade e UF (`GET /cep/{cep}`) e leva
 *   o foco ao Número. O que veio do CEP fica travado — para corrigir, troca-se
 *   o CEP.
 * - "Principal" não é um booleano deste endereço, é uma escolha **entre** os
 *   endereços do cliente: com `onRequestPrimary`, quem coordena é a página.
 */
export type AddressSectionProps = {
  form: SectionForm<AddressValues>;
  onRequestPrimary?: () => void;
  isReadOnly?: boolean;
  /** Carregando: rótulos fixos, valores em skeleton. */
  isLoading?: boolean;
};

/**
 * O CEP de um endereço: grava o CEP mascarado, consulta quando completo,
 * preenche campo a campo (sem passar por cima de `isPrimary` nem do tipo),
 * trava o que veio da consulta e leva o foco ao Número.
 */
export function useAddressCep(form: SectionForm<AddressValues>) {
  const { values, setField } = form;
  const numberRef = useRef<HTMLInputElement>(null);
  const cep = useCepLookup((found) => {
    const next = cepPatch(values, found);
    (Object.keys(next) as (keyof typeof next)[]).forEach((key) => {
      if (next[key] !== values[key]) setField(key, next[key]);
    });
    setField("cepLookup", encodeCepLookup(found));
    requestAnimationFrame(() => numberRef.current?.focus());
  });
  return {
    numberRef,
    hint: cep.hint,
    notice: cep.notice,
    onZipChange: (raw: string) => {
      const masked = maskCEP(raw);
      setField("zipCode", masked);
      cep.handleCepChange(masked);
    },
    isLocked: (field: CepLockable) => isCepLocked(decodeCepLookup(values.cepLookup), values, field),
  };
}

export function AddressSection({ form, onRequestPrimary, isReadOnly, isLoading }: AddressSectionProps) {
  const { values, setField } = form;
  const cep = useAddressCep(form);
  const { numberRef, isLocked: locked } = cep;
  const field = (name: keyof AddressValues & string) => (
    <SchemaField
      key={name}
      form={form}
      schema={addressSchema}
      name={name}
      isReadOnly={isReadOnly}
                isLoading={isLoading}
      isDisabled={(name === "street" || name === "neighborhood" || name === "city" || name === "state") && locked(name)}
      inputRef={name === "addressNumber" ? numberRef : undefined}
    />
  );

  return (
    <FormGrid>
      {field("addressType")}
      <SchemaField
        form={form}
        schema={addressSchema}
        name="zipCode"
        isReadOnly={isReadOnly}
                isLoading={isLoading}
        onValueChange={cep.onZipChange}
        description={isReadOnly ? undefined : (cep.hint ?? cep.notice)}
      />
      {(["street", "addressNumber", "complement", "neighborhood", "city", "state"] as const).map(field)}
      {isLoading ? (
        <FieldSkeleton label="Endereço principal?" isSwitch />
      ) : (
      <SwitchField
        label="Endereço principal?"
        value={values.isPrimary}
        // Principal não se desliga, se transfere: sem outro escolhido, o
        // cliente ficaria sem principal — estado que o backend não aceita.
        isDisabled={isReadOnly || values.isPrimary}
        hint={values.isPrimary ? "É o principal" : "Tornar principal"}
        onChange={(value) => {
          if (!value) return;
          if (onRequestPrimary) onRequestPrimary();
          else setField("isPrimary", true);
        }}
      />
      )}
    </FormGrid>
  );
}
