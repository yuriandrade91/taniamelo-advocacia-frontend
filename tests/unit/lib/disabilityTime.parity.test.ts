import { describe, expect, it } from "vitest";
import { convertIntervals, timeLabel } from "@/lib/disabilityTime";
import type { ConvertibleInterval } from "@/lib/disabilityTime";

/**
 * O cálculo do frontend tem de dar exatamente o mesmo número que o do backend.
 *
 * `lib/disabilityTime.ts` duplica `DisabilityTimeConversion.java` de propósito —
 * a tela precisa mostrar o total enquanto a pessoa digita, inclusive antes de o
 * cliente existir, quando não há `clientId` para consultar. Duplicação sem
 * amarra divergiria: um ajuste de arredondamento num lado passaria meses sem
 * ninguém notar, e a tela mostraria um tempo diferente do que o servidor grava.
 *
 * As respostas abaixo foram CAPTURADAS de
 * `GET /clients/{id}/disability-periods/conversion` rodando contra o backend do
 * repositório, com estes mesmos três intervalos. Não são números que eu calculei
 * e escrevi aqui: são o que o servidor respondeu. Se o front divergir em um dia
 * ou em uma casa decimal, este teste falha.
 *
 * Datas fixas, e nenhum intervalo em aberto: a referência não pode depender de
 * quando o teste roda.
 */

const INTERVALS: ConvertibleInterval[] = [
  { grade: "GRAVE", startedOn: "1990-01-01", endedOn: "2009-12-31" },
  { grade: "MODERADA", startedOn: "2010-01-01", endedOn: "2019-12-31" },
  { grade: "LEVE", startedOn: "2020-01-01", endedOn: "2024-12-31" },
];

/** Resposta do backend para uma cliente do sexo feminino (20/24/28 → 30). */
const BACKEND_FEMALE = {
  targetYears: 30,
  lines: [
    { gradeYears: 20, days: 7305, factor: 1.5, convertedDays: 10958 },
    { gradeYears: 24, days: 3652, factor: 1.25, convertedDays: 4565 },
    { gradeYears: 28, days: 1827, factor: 1.07, convertedDays: 1958 },
  ],
  totalDays: 17481,
  totalLabel: "47 anos, 10 meses e 26 dias",
};

/**
 * Resposta do backend para um cliente do sexo masculino (25/29/33 → 35).
 *
 * Os três fatores aqui — 1,40 / 1,21 / 1,06 — são a coluna "Para 35" que vinha
 * TRUNCADA no material do escritório. Eles não foram transcritos de lugar
 * nenhum: saíram da divisão, e este teste é o registro de que o servidor
 * concorda com eles.
 */
const BACKEND_MALE = {
  targetYears: 35,
  lines: [
    { gradeYears: 25, days: 7305, factor: 1.4, convertedDays: 10227 },
    { gradeYears: 29, days: 3652, factor: 1.21, convertedDays: 4408 },
    { gradeYears: 33, days: 1827, factor: 1.06, convertedDays: 1938 },
  ],
  totalDays: 16573,
  totalLabel: "45 anos, 4 meses e 28 dias",
};

describe("paridade com o cálculo do backend", () => {
  it.each([
    ["FEMININO" as const, BACKEND_FEMALE],
    ["MASCULINO" as const, BACKEND_MALE],
  ])("%s: reproduz a resposta do servidor linha por linha", (basis, expected) => {
    const result = convertIntervals(
      INTERVALS,
      "SEM_DEFICIENCIA",
      basis,
      // Irrelevante: nenhum intervalo está em aberto. Passado explicitamente
      // para deixar claro que a referência não depende do dia de hoje.
      "2026-01-01",
    );

    expect(result.targetYears).toBe(expected.targetYears);
    expect(result.lines).toHaveLength(expected.lines.length);

    result.lines.forEach((line, i) => {
      const ref = expected.lines[i];
      expect(line.gradeYears, `linha ${i}: anos do grau`).toBe(ref.gradeYears);
      expect(line.days, `linha ${i}: dias corridos`).toBe(ref.days);
      expect(line.factor, `linha ${i}: fator`).toBe(ref.factor);
      expect(line.convertedDays, `linha ${i}: dias convertidos`).toBe(
        ref.convertedDays,
      );
    });

    expect(result.total.totalDays).toBe(expected.totalDays);
    expect(result.total.label).toBe(expected.totalLabel);
  });

  it("a frase do total é montada igual nos dois lados", () => {
    // O backend monta a frase em ClientDisabilityPeriodService#label.
    expect(timeLabel(47, 10, 26)).toBe(BACKEND_FEMALE.totalLabel);
    expect(timeLabel(45, 4, 28)).toBe(BACKEND_MALE.totalLabel);
  });
});
