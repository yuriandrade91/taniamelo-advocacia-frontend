"use client";

import { SchemaField } from "@/components/ui/form/SchemaFields";
import type { SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";
import { serviceSchema, type ServiceValues } from "../schemas";

/**
 * "Atendimento" — benefício, situação, tipo de cliente e faturamento: campos
 * do próprio `POST /clients`, sem lugar em `personal-data` nem em
 * `professional-data`.
 */
export function ServiceSection({
  form,
  isReadOnly,
  isLoading,
  onBenefitChange,
}: {
  form: SectionForm<ServiceValues>;
  isReadOnly?: boolean;
  /** Carregando: rótulos fixos, valores em skeleton. */
  isLoading?: boolean;
  /**
   * Avisa a troca de benefício — o cadastro pergunta o sexo quando o benefício
   * passa a ser por deficiência. Quem decide o que fazer é a página.
   */
  onBenefitChange?: (next: string, previous: string) => void;
}) {
  const previous = form.values.benefit;
  return (
    <FormGrid>
      <SchemaField
        form={form}
        schema={serviceSchema}
        name="benefit"
        isReadOnly={isReadOnly}
                isLoading={isLoading}
        onValueChange={(next) => onBenefitChange?.(next, previous)}
      />
      {(["situation", "clientType", "notBillable"] as const).map((name) => (
        <SchemaField key={name} form={form} schema={serviceSchema} name={name} isReadOnly={isReadOnly}
                isLoading={isLoading} />
      ))}
    </FormGrid>
  );
}
