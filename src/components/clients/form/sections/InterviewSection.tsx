"use client";

import { DateTimePickerField, Field } from "@/components/ui/form/Field";
import { RichTextField } from "@/components/ui/form/RichTextField";
import { validateRequired } from "@/lib/validators";
import type { FieldRules, SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";

/**
 * "Entrevista" — espelha `ClientInterviewRequestDTO`.
 *
 * `content` é `@NotBlank` e `durationMinutes` é `@Positive`. A entrevista é
 * opcional no cadastro: só vira requisição se houver conteúdo — daí a regra de
 * obrigatoriedade viver na página (que sabe se a seção foi preenchida) e não
 * aqui dentro.
 *
 * O campo de conteúdo usa `RichTextField` (TipTap) — o backend aceita HTML
 * em `content`, então trocar o textarea pelo editor não muda o payload.
 */

export type InterviewValues = {
  occurredAt: string;
  durationMinutes: string;
  content: string;
};

export const interviewInitial: InterviewValues = {
  occurredAt: "",
  durationMinutes: "",
  content: "",
};

export const interviewRules: FieldRules<InterviewValues> = {
  durationMinutes: (value) => {
    if (!value) return null;
    const minutes = Number(value);
    return Number.isInteger(minutes) && minutes > 0
      ? null
      : "Duração deve ser um número de minutos maior que zero.";
  },
};

/** Regra usada só quando a seção foi de fato preenchida — ver comentário acima. */
export const interviewContentRule = (values: InterviewValues) =>
  validateRequired(values.content, "Conteúdo da entrevista");

/** `true` quando o usuário mexeu na entrevista e ela deve ser enviada. */
export const hasInterviewInput = (values: InterviewValues) =>
  Boolean(values.content.trim() || values.occurredAt || values.durationMinutes);

export function InterviewSection({
  form,
}: {
  form: SectionForm<InterviewValues>;
}) {
  const { values, setField, touchField, errorOf } = form;

  return (
    <FormGrid>
      <DateTimePickerField
        label="Data e hora"
        value={values.occurredAt}
        onChange={(value) => setField("occurredAt", value)}
      />
      <Field
        label="Duração (minutos)"
        type="number"
        value={values.durationMinutes}
        onChange={(event) => setField("durationMinutes", event.target.value)}
        onBlur={() => touchField("durationMinutes")}
        isInvalid={!!errorOf("durationMinutes")}
        errorMessage={errorOf("durationMinutes")}
      />
      <RichTextField
        className="sm:col-span-2 lg:col-span-4"
        label="Conteúdo"
        placeholder="Relato da entrevista, pendências, documentos a trazer…"
        value={values.content}
        onChange={(value) => setField("content", value)}
      />
    </FormGrid>
  );
}
