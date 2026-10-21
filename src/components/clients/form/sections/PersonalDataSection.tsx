"use client";

import { Field } from "@/components/ui/form/Field";
import { FieldSkeleton, SchemaField } from "@/components/ui/form/SchemaFields";
import type { SectionForm } from "@/hooks/useSectionForm";
import { ageFromBirthDate } from "@/lib/validators";
import { FormGroup } from "@/components/clients/form/FormGroup";
import { PERSONAL_GROUPS, personalSchema, type PersonalValues } from "../schemas";

/** A idade é calculada do nascimento: só leitura, com o mesmo esqueleto dos outros campos. */
function AgeField({ age, isLoading }: Readonly<{ age: number | null; isLoading?: boolean }>) {
  if (isLoading) return <FieldSkeleton label="Idade" />;
  return (
    <Field
      label="Idade"
      isReadOnly
      value={age === null ? "" : `${age} anos`}
      onChange={() => {}}
      placeholder="—"
    />
  );
}

/**
 * "Dados pessoais" — campos, máscaras e regras em `personalSchema`; aqui só os
 * grupos da tela e a idade, derivada (nunca enviada: o backend a calcula).
 */
export function PersonalDataSection({
  form,
  isReadOnly,
  isLoading,
}: Readonly<{
  form: SectionForm<PersonalValues>;
  isReadOnly?: boolean;
  /** Carregando: rótulos fixos, valores em skeleton. */
  isLoading?: boolean;
}>) {
  const age = ageFromBirthDate(form.values.birthDate);
  return (
    <div className="flex flex-col gap-8">
      {PERSONAL_GROUPS.map((group) => (
        <FormGroup key={group.title} title={group.title}>
          {group.names.map((name) =>
            name === "age" ? (
              <AgeField key={name} age={age} isLoading={isLoading} />
            ) : (
              <SchemaField
                key={name}
                form={form}
                schema={personalSchema}
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
