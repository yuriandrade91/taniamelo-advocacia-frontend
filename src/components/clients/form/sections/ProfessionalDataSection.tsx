"use client";

import type { ReactNode } from "react";
import { SchemaField } from "@/components/ui/form/SchemaFields";
import type { SectionForm } from "@/hooks/useSectionForm";
import { FormGroup } from "../FormSection";
import {
  PROFESSIONAL_GROUPS,
  professionalSchema,
  type ProfessionalValues,
} from "../schemas";

/**
 * "Dados profissionais" — campos e regras em `professionalSchema`.
 *
 * A senha do INSS é obrigatória no cadastro (`@NotBlank` no `POST /clients`).
 * Na ficha ela chega em `inssPassword`: o `InssPasswordField`, que troca a
 * senha e revela a atual pela rota auditada — a senha não volta em resposta
 * nenhuma.
 */
export function ProfessionalDataSection({
  form,
  isReadOnly,
  isLoading,
  inssPassword,
}: {
  form: SectionForm<ProfessionalValues>;
  isReadOnly?: boolean;
  /** Carregando: rótulos fixos, valores em skeleton. */
  isLoading?: boolean;
  inssPassword?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      {PROFESSIONAL_GROUPS.map((group) => (
        <FormGroup key={group.title} title={group.title}>
          {group.names.map((name) =>
            name === "inssPassword" && inssPassword ? (
              <div key={name} className="sm:col-span-2">
                {inssPassword}
              </div>
            ) : (
              <SchemaField
                key={name}
                form={form}
                schema={professionalSchema}
                name={name}
                isReadOnly={isReadOnly}
                isLoading={isLoading}
              />
            ),
          )}
        </FormGroup>
      ))}
    </div>
  );
}
