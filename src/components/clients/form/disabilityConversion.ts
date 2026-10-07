/**
 * A conversão que o servidor assina, no formato que a tela já desenha.
 *
 * `GET /clients/{id}/disability-periods/conversion` devolve os graus como
 * **rótulo** ("Grave") e o total em campos soltos; o cálculo local
 * (`lib/disabilityTime`) trabalha com a **chave** do enum e um `TimeBreakdown`.
 * Traduzir aqui deixa um único componente de exibição para as duas origens —
 * e, com isso, a ficha mostra a conta aberta exatamente como o cadastro.
 */
import { getDisabilityGradeKeyByLabel } from "@/enums/disabilityGrade/DisabilityGrade";
import type { ConversionResult } from "@/lib/disabilityTime";
import type { DisabilityConversionResponse } from "@/services/clientDisabilityPeriodService";

/**
 * `null` quando algum grau não é reconhecido.
 *
 * Melhor não mostrar a conta do servidor do que mostrá-la com uma linha sem
 * grau: o número vai para um requerimento, e uma linha que a tela não sabe
 * nomear é uma linha que ninguém consegue conferir.
 */
export function conversionFromServer(
  response: DisabilityConversionResponse | null | undefined,
): ConversionResult | null {
  if (!response) return null;

  const convertedTo = getDisabilityGradeKeyByLabel(response.convertedTo);
  if (!convertedTo) return null;

  const lines: ConversionResult["lines"] = [];
  for (const line of response.lines ?? []) {
    const grade = getDisabilityGradeKeyByLabel(line.grade);
    if (!grade) return null;
    lines.push({
      grade,
      gradeYears: line.gradeYears,
      days: line.days,
      factor: line.factor,
      convertedDays: line.convertedDays,
      startedOn: line.startedOn,
      endedOn: line.endedOn,
      ongoing: line.ongoing,
    });
  }

  return {
    convertedTo,
    targetYears: response.targetYears,
    lines,
    total: {
      totalDays: response.totalDays,
      years: response.totalYears,
      months: response.totalMonths,
      days: response.totalRemainingDays,
      label: response.totalLabel,
    },
  };
}
