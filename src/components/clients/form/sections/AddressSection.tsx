"use client";

import { Field, SelectField, SwitchField } from "@/components/ui/form/Field";
import { AddressTypeOptions } from "@/enums/addressType/AddressType";
import { maskCEP } from "@/lib/masks/masks";
import {
  validateCEP,
  validateRequired,
  validateUF,
} from "@/lib/validators";
import type { FieldRules, SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";
import { toSelectOptions } from "@/components/ui/form/options";

/**
 * "Endereço" — espelha `ClientAddressRequestDTO`.
 *
 * Recurso próprio (`POST /clients/{id}/addresses`), e é justamente por isso
 * que esta seção fica travada até o cliente existir: o `POST /clients`
 * documenta em comentário que endereço **não** faz parte do payload.
 *
 * `isPrimary` marca o principal; o backend desmarca o anterior sozinho.
 */

export type AddressValues = {
  addressType: string;
  zipCode: string;
  street: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
};

export const addressInitial: AddressValues = {
  addressType: "",
  zipCode: "",
  street: "",
  addressNumber: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isPrimary: true,
};

export const addressRules: FieldRules<AddressValues> = {
  street: (value) => validateRequired(value, "Logradouro"),
  city: (value) => validateRequired(value, "Cidade"),
  state: (value) => validateRequired(value, "UF") ?? validateUF(value),
  zipCode: (value) => validateCEP(value),
};

/**
 * `true` quando o usuário mexeu no endereço.
 *
 * O orquestrador da criação usa isto para decidir se dispara
 * `POST /clients/{id}/addresses`. `isPrimary` fica de fora da checagem porque
 * já nasce `true` — contá-lo faria toda criação parecer ter endereço.
 */
export const hasAddressInput = (values: AddressValues) =>
  Boolean(
    values.street.trim() ||
      values.city.trim() ||
      values.state.trim() ||
      values.zipCode.trim() ||
      values.neighborhood.trim() ||
      values.addressNumber.trim() ||
      values.complement.trim() ||
      values.addressType,
  );

const ADDRESS_TYPE_OPTIONS = toSelectOptions(AddressTypeOptions);

export type AddressSectionProps = {
  form: SectionForm<AddressValues>;
  /**
   * Chamado quando o usuário pede para tornar ESTE endereço o principal.
   *
   * Existe porque "principal" não é um booleano deste endereço — é uma escolha
   * **entre** os endereços do cliente. Deixar o switch escrever direto no
   * formulário permitiria marcar dois, e aí alguém (backend ou última
   * requisição) decidiria em silêncio qual vale. Quem coordena a escolha é a
   * página; aqui só se pede.
   *
   * Sem esta prop o componente volta a ser autônomo e o switch escreve
   * direto — o modo de uso isolado continua funcionando.
   */
  onRequestPrimary?: () => void;
};

export function AddressSection({ form, onRequestPrimary }: AddressSectionProps) {
  const { values, setField, touchField, errorOf } = form;

  return (
    <FormGrid>
      <SelectField
        label="Tipo de endereço"
        options={ADDRESS_TYPE_OPTIONS}
        selectedKey={values.addressType || null}
        onSelectionChange={(key) => setField("addressType", key)}
      />
      <Field
        label="CEP"
        maxLength={9}
        value={values.zipCode}
        onChange={(event) => setField("zipCode", maskCEP(event.target.value))}
        onBlur={() => touchField("zipCode")}
        isInvalid={!!errorOf("zipCode")}
        errorMessage={errorOf("zipCode")}
      />
      <Field
        className="sm:col-span-2"
        label="Logradouro"
        isRequired
        value={values.street}
        onChange={(event) => setField("street", event.target.value)}
        onBlur={() => touchField("street")}
        isInvalid={!!errorOf("street")}
        errorMessage={errorOf("street")}
      />

      <Field
        label="Número"
        value={values.addressNumber}
        onChange={(event) => setField("addressNumber", event.target.value)}
      />
      <Field
        label="Complemento"
        value={values.complement}
        onChange={(event) => setField("complement", event.target.value)}
      />
      <Field
        label="Bairro"
        value={values.neighborhood}
        onChange={(event) => setField("neighborhood", event.target.value)}
      />
      <Field
        label="Cidade"
        isRequired
        value={values.city}
        onChange={(event) => setField("city", event.target.value)}
        onBlur={() => touchField("city")}
        isInvalid={!!errorOf("city")}
        errorMessage={errorOf("city")}
      />

      <Field
        label="UF"
        isRequired
        maxLength={2}
        placeholder="MG"
        value={values.state}
        onChange={(event) =>
          setField("state", event.target.value.toUpperCase())
        }
        onBlur={() => touchField("state")}
        isInvalid={!!errorOf("state")}
        errorMessage={errorOf("state")}
      />
      <SwitchField
        label="Endereço principal?"
        value={values.isPrimary}
        /*
          Já sendo o principal, o controle fica travado: principal não se
          desliga, se transfere. Desligar sem escolher outro deixaria o cliente
          sem endereço principal — estado que o backend não aceita (ele força o
          primeiro endereço a ser principal) e que a tela não teria como
          representar.
        */
        isDisabled={values.isPrimary}
        hint={values.isPrimary ? "É o principal" : "Tornar principal"}
        onChange={(value) => {
          if (!value) return;
          if (onRequestPrimary) {
            onRequestPrimary();
            return;
          }
          setField("isPrimary", true);
        }}
      />
    </FormGrid>
  );
}
