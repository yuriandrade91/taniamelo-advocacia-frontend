"use client";

import {
  DatePickerField,
  Field,
  SelectField,
  SwitchField,
} from "@/components/ui/form/Field";
import { GenderOptions } from "@/enums/gender/Gender";
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import {
  maskCPF,
  maskCelular,
  maskRG,
  maskTelefone,
} from "@/lib/masks/masks";
import {
  ageFromBirthDate,
  validateBirthDate,
  validateCPF,
  validateEmail,
  validatePastDate,
  validatePhone,
  validateRG,
  validateRequired,
  validateRequiredSelection,
} from "@/lib/validators";
import type { FieldRules, SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";
import { toSelectOptions } from "@/components/ui/form/options";

/**
 * "Dados pessoais" — espelha `ClientPersonalDataRequestDTO`.
 *
 * A ordem dos campos segue o print; os que o print não mostra (gênero,
 * e-mail, nacionalidade, emissor/emissão do RG, WhatsApp, PCD) entraram porque
 * existem no DTO — e `gender` em particular é `@NotNull`, ou seja, sem ele o
 * `POST /clients` volta 400.
 */

export type PersonalValues = {
  fullName: string;
  birthDate: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  rgIssueDate: string;
  motherName: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  mobilePhone: string;
  isWhatsapp: boolean;
  referencePhone: string;
  referenceResponsible: string;
  email: string;
  hasDisability: boolean;
};

export const personalInitial: PersonalValues = {
  fullName: "",
  birthDate: "",
  cpf: "",
  rg: "",
  rgIssuer: "",
  rgIssueDate: "",
  motherName: "",
  gender: "",
  maritalStatus: "",
  nationality: "",
  mobilePhone: "",
  isWhatsapp: false,
  referencePhone: "",
  referenceResponsible: "",
  email: "",
  hasDisability: false,
};

/**
 * As regras são dados, não `if`s no meio do submit. Cada uma corresponde a
 * uma anotação do DTO: `@NotBlank` vira `validateRequired`, `@ValidCPF` vira
 * `validateCPF` (mesmo algoritmo do `CpfValidator`), `@Email` vira
 * `validateEmail`.
 */
export const personalRules: FieldRules<PersonalValues> = {
  fullName: (value) => validateRequired(value, "Nome completo"),
  birthDate: (value) =>
    validateRequired(value, "Data de nascimento") ?? validateBirthDate(value),
  cpf: (value) => validateRequired(value, "CPF") ?? validateCPF(value),
  motherName: (value) => validateRequired(value, "Nome da mãe"),
  gender: (value) => validateRequiredSelection(value, "o gênero"),
  mobilePhone: (value) =>
    validateRequired(value, "Celular") ?? validatePhone(value),
  rg: (value) => validateRG(value),
  rgIssueDate: (value) => validatePastDate(value, "Emissão do RG"),
  referencePhone: (value) => validatePhone(value),
  email: (value) => validateEmail(value),
};

const GENDER_OPTIONS = toSelectOptions(GenderOptions);
const MARITAL_OPTIONS = toSelectOptions(MaritalStatusOptions);

export function PersonalDataSection({
  form,
}: {
  form: SectionForm<PersonalValues>;
}) {
  const { values, setField, touchField, errorOf } = form;
  const age = ageFromBirthDate(values.birthDate);

  return (
    <FormGrid>
      <Field
        className="sm:col-span-2"
        label="Nome completo"
        isRequired
        value={values.fullName}
        onChange={(event) => setField("fullName", event.target.value)}
        onBlur={() => touchField("fullName")}
        isInvalid={!!errorOf("fullName")}
        errorMessage={errorOf("fullName")}
      />
      <DatePickerField
        label="Data de nascimento"
        isRequired
        value={values.birthDate}
        onChange={(value) => setField("birthDate", value)}
        onBlur={() => touchField("birthDate")}
        isInvalid={!!errorOf("birthDate")}
        errorMessage={errorOf("birthDate")}
      />
      {/* Derivado, nunca enviado: o backend calcula `age` na resposta. */}
      <Field
        label="Idade"
        isReadOnly
        value={age === null ? "" : `${age} anos`}
        onChange={() => undefined}
        placeholder="—"
      />

      <Field
        className="sm:col-span-2"
        label="Nome da mãe"
        isRequired
        value={values.motherName}
        onChange={(event) => setField("motherName", event.target.value)}
        onBlur={() => touchField("motherName")}
        isInvalid={!!errorOf("motherName")}
        errorMessage={errorOf("motherName")}
      />
      <Field
        label="CPF"
        isRequired
        maxLength={14}
        value={values.cpf}
        onChange={(event) => setField("cpf", maskCPF(event.target.value))}
        onBlur={() => touchField("cpf")}
        isInvalid={!!errorOf("cpf")}
        errorMessage={errorOf("cpf")}
      />
      <Field
        label="RG"
        value={values.rg}
        onChange={(event) => setField("rg", maskRG(event.target.value))}
        onBlur={() => touchField("rg")}
        isInvalid={!!errorOf("rg")}
        errorMessage={errorOf("rg")}
      />

      <Field
        label="Órgão emissor"
        placeholder="SSP/MG"
        value={values.rgIssuer}
        onChange={(event) => setField("rgIssuer", event.target.value)}
      />
      <DatePickerField
        label="Emissão do RG"
        value={values.rgIssueDate}
        onChange={(value) => setField("rgIssueDate", value)}
        onBlur={() => touchField("rgIssueDate")}
        isInvalid={!!errorOf("rgIssueDate")}
        errorMessage={errorOf("rgIssueDate")}
      />
      <SelectField
        label="Gênero"
        isRequired
        options={GENDER_OPTIONS}
        selectedKey={values.gender || null}
        onSelectionChange={(key) => setField("gender", key)}
        isInvalid={!!errorOf("gender")}
        errorMessage={errorOf("gender")}
      />
      <SelectField
        label="Estado civil"
        options={MARITAL_OPTIONS}
        selectedKey={values.maritalStatus || null}
        onSelectionChange={(key) => setField("maritalStatus", key)}
      />

      <Field
        label="Nacionalidade"
        placeholder="Brasileira"
        value={values.nationality}
        onChange={(event) => setField("nationality", event.target.value)}
      />
      <Field
        label="Celular"
        isRequired
        value={values.mobilePhone}
        onChange={(event) =>
          setField("mobilePhone", maskCelular(event.target.value))
        }
        onBlur={() => touchField("mobilePhone")}
        isInvalid={!!errorOf("mobilePhone")}
        errorMessage={errorOf("mobilePhone")}
      />
      <SwitchField
        label="É WhatsApp?"
        value={values.isWhatsapp}
        onChange={(value) => setField("isWhatsapp", value)}
      />
      <Field
        className="sm:col-span-2 lg:col-span-1"
        label="E-mail"
        type="email"
        value={values.email}
        onChange={(event) => setField("email", event.target.value)}
        onBlur={() => touchField("email")}
        isInvalid={!!errorOf("email")}
        errorMessage={errorOf("email")}
      />

      <Field
        className="sm:col-span-2"
        label="Responsável recado"
        value={values.referenceResponsible}
        onChange={(event) =>
          setField("referenceResponsible", event.target.value)
        }
      />
      <Field
        label="Telefone recado"
        value={values.referencePhone}
        onChange={(event) =>
          setField("referencePhone", maskTelefone(event.target.value))
        }
        onBlur={() => touchField("referencePhone")}
        isInvalid={!!errorOf("referencePhone")}
        errorMessage={errorOf("referencePhone")}
      />
      <SwitchField
        label="Pessoa com deficiência?"
        value={values.hasDisability}
        onChange={(value) => setField("hasDisability", value)}
      />
    </FormGrid>
  );
}
