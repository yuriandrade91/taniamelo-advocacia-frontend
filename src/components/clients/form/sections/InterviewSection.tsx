"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@heroui/react";
import { SchemaField } from "@/components/ui/form/SchemaFields";
import type { SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";
import { interviewSchema, type InterviewValues } from "../schemas";

/**
 * O editor rico (TipTap) é a dependência mais pesada do formulário e só serve
 * a esta seção: vem sob demanda, fora do JS inicial da página.
 */
const RichTextField = dynamic(
  () => import("@/components/ui/form/RichTextField").then((m) => m.RichTextField),
  { ssr: false },
);

/**
 * "Entrevista" — `ClientInterviewRequestDTO`. O backend aceita HTML em
 * `content`, por isso o editor rico. Conteúdo só é obrigatório quando a seção
 * foi preenchida (regra do schema).
 */
export function InterviewSection({
  form,
  isReadOnly,
  isLoading,
}: {
  form: SectionForm<InterviewValues>;
  isReadOnly?: boolean;
  /** Carregando: rótulos fixos, valores em skeleton. */
  isLoading?: boolean;
}) {
  const error = form.errorOf("content");
  return (
    <FormGrid>
      {(["occurredAt", "durationMinutes"] as const).map((name) => (
        <SchemaField key={name} form={form} schema={interviewSchema} name={name} isReadOnly={isReadOnly}
                isLoading={isLoading} />
      ))}
      {isLoading ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-sm font-medium text-secondary">Conteúdo</p>
          <Skeleton className="mt-1 h-40 w-full rounded-xl" />
        </div>
      ) : (
      <RichTextField
        className="sm:col-span-2 lg:col-span-4"
        label="Conteúdo"
        placeholder="Relato da entrevista, pendências, documentos a trazer…"
        value={form.values.content}
        onChange={(value) => form.setField("content", value)}
        isDisabled={isReadOnly}
        isInvalid={!!error}
        errorMessage={error}
      />
      )}
    </FormGrid>
  );
}
