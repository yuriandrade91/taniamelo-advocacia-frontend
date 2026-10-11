import { describe, expect, it } from "vitest";
import { conversionFromServer } from "@/components/clients/form/disabilityConversion";
import type { DisabilityConversionResponse } from "@/services/clientDisabilityPeriodService";

const response: DisabilityConversionResponse = {
  convertedTo: "Sem deficiência",
  targetYears: 35,
  lines: [
    {
      grade: "Grave",
      gradeYears: 25,
      days: 1000,
      factor: 1.4,
      convertedDays: 1400,
      startedOn: "2015-03-10",
      endedOn: "2017-12-04",
      ongoing: false,
    },
    {
      grade: "Leve",
      gradeYears: 33,
      days: 500,
      factor: 1.06,
      convertedDays: 530,
      startedOn: "2018-01-01",
      endedOn: "2026-10-02",
      ongoing: true,
    },
  ],
  totalDays: 1930,
  totalYears: 5,
  totalMonths: 3,
  totalRemainingDays: 15,
  totalLabel: "5 anos, 3 meses e 15 dias",
};

describe("conversionFromServer", () => {
  it("troca rótulo por chave e monta o total no formato da tela", () => {
    const result = conversionFromServer(response);
    expect(result?.convertedTo).toBe("SEM_DEFICIENCIA");
    expect(result?.lines.map((line) => line.grade)).toEqual(["GRAVE", "LEVE"]);
    expect(result?.lines[1]).toMatchObject({
      endedOn: "2026-10-02",
      ongoing: true,
      convertedDays: 530,
    });
    expect(result?.total).toEqual({
      totalDays: 1930,
      years: 5,
      months: 3,
      days: 15,
      label: "5 anos, 3 meses e 15 dias",
    });
  });

  it("grau desconhecido não vira linha sem nome: a conta inteira fica de fora", () => {
    const odd = {
      ...response,
      lines: [{ ...response.lines[0], grade: "Gravíssima" }],
    } as unknown as DisabilityConversionResponse;
    expect(conversionFromServer(odd)).toBeNull();
  });

  it("sem resposta, sem conversão", () => {
    expect(conversionFromServer(null)).toBeNull();
  });
});
