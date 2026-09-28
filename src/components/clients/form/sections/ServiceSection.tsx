"use client";

import { SelectField, SwitchField } from "@/components/ui/form/Field";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { SituationOptions } from "@/enums/situation/Situation";
import { ClientTypeOptions } from "@/enums/clientType/ClientType";
import { validateRequiredSelection } from "@/lib/validators";
import type { FieldRules } from "@/hooks/useSectionForm";
import type { SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";
import { toSelectOptions } from "@/components/ui/form/options";

/**
 * "Atendimento" — benefício, situação, tipo de cliente e faturamento.
 *
 * Estes quatro campos não pertencem a `personal-data` nem a
 * `professional-data`: no backend eles moram no próprio `POST /clients`
 * (`benefit` e `situation` são `@NotNull`). Como o print os mostra apenas como
 * selos no cabeçalho, e selo não é campo, eles ganharam uma seção própria — a
 * alternativa seria enfiá-los em "Dados pessoais", e aí a seção deixaria de
 * espelhar o DTO que ela salva na segunda fase.
 */

export type ServiceValues = {
  benefit: string;
  situation: string;
  clientType: string;
  notBillable: boolean;
};

export const serviceInitial: ServiceValues = {
  benefit: "",
  situation: "",
  clientType: "",
  notBillable: false,
};

export const serviceRules: FieldRules<ServiceValues> = {
  benefit: (value) => validateRequiredSelection(value, "o benefício pretendido"),
  situation: (value) => validateRequiredSelection(value, "a situação"),
};

const BENEFIT_OPTIONS = toSelectOptions(BenefitOptions);
const SITUATION_OPTIONS = toSelectOptions(SituationOptions);
const CLIENT_TYPE_OPTIONS = toSelectOptions(ClientTypeOptions);

export function ServiceSection({ form }: { form: SectionForm<ServiceValues> }) {
  const { values, setField, errorOf } = form;

  return (
    <FormGrid>
      <SelectField
        className="sm:col-span-2"
        label="Benefício pretendido"
        isRequired
        options={BENEFIT_OPTIONS}
        selectedKey={values.benefit || null}
        onSelectionChange={(key) => setField("benefit", key)}
        isInvalid={!!errorOf("benefit")}
        errorMessage={errorOf("benefit")}
      />
      <SelectField
        label="Situação"
        isRequired
        options={SITUATION_OPTIONS}
        selectedKey={values.situation || null}
        onSelectionChange={(key) => setField("situation", key)}
        isInvalid={!!errorOf("situation")}
        errorMessage={errorOf("situation")}
      />
      <SelectField
        label="Tipo de cliente"
        options={CLIENT_TYPE_OPTIONS}
        selectedKey={values.clientType || null}
        onSelectionChange={(key) => setField("clientType", key)}
      />
      <SwitchField
        label="Cliente isento do serviço?"
        value={values.notBillable}
        onChange={(value) => setField("notBillable", value)}
      />
    </FormGrid>
  );
}
