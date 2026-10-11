import { describe, expect, it } from "vitest";
import {
  basisFromGender,
  breakdownOfDays,
  convertDays,
  convertIntervals,
  daysBetween,
  factor,
  formatFactor,
  timeLabel,
} from "@/lib/disabilityTime";
import type { DisabilityGradeKey } from "@/enums/disabilityGrade/DisabilityGrade";

/** Grave, moderada, leve, sem deficiência — a ordem das duas tabelas. */
const ORDER: DisabilityGradeKey[] = [
  "GRAVE",
  "MODERADA",
  "LEVE",
  "SEM_DEFICIENCIA",
];

/**
 * As 16 células femininas: de 20, 24, 28, 30 anos para 20, 24, 28, 30.
 *
 * Transcritas do material do escritório de propósito — o teste existe para
 * confirmar que a divisão as reproduz, não para confirmar a divisão com ela
 * mesma. É a mesma asserção que o backend faz em
 * `DisabilityTimeConversionTest.java`; é o que mantém as duas cópias do
 * cálculo idênticas.
 */
const WOMAN = [
  [1.0, 1.2, 1.4, 1.5],
  [0.83, 1.0, 1.17, 1.25],
  [0.71, 0.86, 1.0, 1.07],
  [0.67, 0.8, 0.93, 1.0],
];

/**
 * As 16 masculinas: de 25, 29, 33, 35 para 25, 29, 33, 35.
 *
 * A última coluna não vinha no material — estava truncada em três valores por
 * linha. Estes quatro (1,40 / 1,21 / 1,06 / 1,00) saem da mesma divisão que os
 * outros doze, e é por reproduzirem os doze conhecidos que se pode confiar nos
 * quatro que faltavam.
 */
const MAN = [
  [1.0, 1.16, 1.32, 1.4],
  [0.86, 1.0, 1.14, 1.21],
  [0.76, 0.88, 1.0, 1.06],
  [0.71, 0.83, 0.94, 1.0],
];

describe("a tabela de multiplicadores", () => {
  it.each([
    ["FEMININO" as const, WOMAN],
    ["MASCULINO" as const, MAN],
  ])("%s: as 16 células saem de destino ÷ origem", (basis, expected) => {
    ORDER.forEach((from, i) => {
      ORDER.forEach((to, j) => {
        expect(factor(from, to, basis), `de ${from} para ${to}`).toBe(
          expected[i][j],
        );
      });
    });
  });

  it("converter para o próprio grau é sempre 1,00", () => {
    for (const grade of ORDER) {
      expect(factor(grade, grade, "FEMININO")).toBe(1);
      expect(factor(grade, grade, "MASCULINO")).toBe(1);
    }
  });

  it("grau mais severo vale mais na base geral; menos severo vale menos", () => {
    // A asserção de SENTIDO. Com a divisão invertida, as 32 células
    // continuariam coerentes entre si e o cliente perderia tempo.
    expect(factor("GRAVE", "SEM_DEFICIENCIA", "FEMININO")).toBeGreaterThan(1);
    expect(factor("SEM_DEFICIENCIA", "GRAVE", "FEMININO")).toBeLessThan(1);
  });

  it("formata como a tabela escreve", () => {
    expect(formatFactor(1.5)).toBe("1,50");
    expect(formatFactor(1.07)).toBe("1,07");
    expect(formatFactor(1)).toBe("1,00");
  });
});

describe("a conversão de dias", () => {
  it("dez anos em grave valem quinze na regra geral (mulher)", () => {
    expect(convertDays(10 * 365, "GRAVE", "SEM_DEFICIENCIA", "FEMININO")).toBe(
      15 * 365,
    );
  });

  it("o mesmo grau devolve o valor intacto", () => {
    expect(convertDays(1234, "LEVE", "LEVE", "MASCULINO")).toBe(1234);
  });

  it("ida e volta não perde mais de um dia", () => {
    for (const days of [1, 7, 365, 3650, 10001]) {
      const out = convertDays(
        convertDays(days, "MODERADA", "SEM_DEFICIENCIA", "MASCULINO"),
        "SEM_DEFICIENCIA",
        "MODERADA",
        "MASCULINO",
      );
      expect(Math.abs(out - days), `${days} dias`).toBeLessThanOrEqual(1);
    }
  });
});

describe("os dias de um intervalo", () => {
  it("conta o primeiro e o último dia", () => {
    expect(daysBetween("2020-01-01", "2020-01-31")).toBe(31);
    expect(daysBetween("2020-01-01", "2020-01-01")).toBe(1);
  });

  it("atravessa ano bissexto sem perder o dia 29", () => {
    expect(daysBetween("2020-02-28", "2020-03-01")).toBe(3);
  });

  it("fim antes do início é zero, não negativo", () => {
    expect(daysBetween("2020-06-01", "2020-01-01")).toBe(0);
  });

  it("data inválida é zero", () => {
    expect(daysBetween("", "2020-01-01")).toBe(0);
    expect(daysBetween("2020-01-01", "nao-e-data")).toBe(0);
  });
});

describe("a base de conversão", () => {
  it("aceita o rótulo da API e a chave do formulário", () => {
    // Os dois circulam: o form guarda `FEMININO`, a API devolve `Feminino`.
    expect(basisFromGender("Feminino")).toBe("FEMININO");
    expect(basisFromGender("FEMININO")).toBe("FEMININO");
    expect(basisFromGender("masculino")).toBe("MASCULINO");
    expect(basisFromGender("MASCULINO")).toBe("MASCULINO");
  });

  it("não-binário, outro e ausente não têm — devolve null em vez de supor", () => {
    expect(basisFromGender("Não-binário")).toBeNull();
    expect(basisFromGender("Outro")).toBeNull();
    expect(basisFromGender(undefined)).toBeNull();
    expect(basisFromGender("")).toBeNull();
  });
});

describe("o total convertido", () => {
  const intervals = [
    { grade: "GRAVE" as const, startedOn: "1990-01-01", endedOn: "2009-12-31" },
    { grade: "LEVE" as const, startedOn: "2010-01-01", endedOn: null },
  ];

  it("cada intervalo converte pelo seu próprio grau", () => {
    const result = convertIntervals(
      intervals,
      "SEM_DEFICIENCIA",
      "FEMININO",
      "2026-08-27",
    );
    expect(result.lines[0].factor).toBe(1.5);
    expect(result.lines[1].factor).toBe(1.07);
    // O total é a soma do que está visível — é isso que torna a conta conferível.
    expect(result.total.totalDays).toBe(
      result.lines[0].convertedDays + result.lines[1].convertedDays,
    );
  });

  it("intervalo em aberto termina no dia informado, não no relógio", () => {
    const before = convertIntervals(
      intervals,
      "SEM_DEFICIENCIA",
      "FEMININO",
      "2026-01-01",
    );
    const after = convertIntervals(
      intervals,
      "SEM_DEFICIENCIA",
      "FEMININO",
      "2027-01-01",
    );
    expect(after.total.totalDays).toBeGreaterThan(before.total.totalDays);
  });

  it("somar antes e converter depois dá outro número — e errado", () => {
    const result = convertIntervals(
      intervals,
      "SEM_DEFICIENCIA",
      "FEMININO",
      "2026-08-27",
    );
    const rawSum = result.lines[0].days + result.lines[1].days;
    expect(
      convertDays(rawSum, "GRAVE", "SEM_DEFICIENCIA", "FEMININO"),
    ).toBeGreaterThan(result.total.totalDays);
    expect(
      convertDays(rawSum, "LEVE", "SEM_DEFICIENCIA", "FEMININO"),
    ).toBeLessThan(result.total.totalDays);
  });

  it("cada linha traz as datas que originaram os dias", () => {
    // Três linhas de "2192 dias", "7579 dias" não dizem a QUAL intervalo cada
    // uma pertence — e é conferindo o período que alguém nota o ano errado.
    const result = convertIntervals(
      intervals,
      "SEM_DEFICIENCIA",
      "FEMININO",
      "2026-08-27",
    );
    expect(result.lines[0].startedOn).toBe("1990-01-01");
    expect(result.lines[0].endedOn).toBe("2009-12-31");
    expect(result.lines[0].ongoing).toBe(false);
  });

  it("no intervalo em aberto, o fim da linha é o dia informado, não null", () => {
    // "até hoje" sem dizer que dia é hoje deixa a conta irreproduzível amanhã.
    const result = convertIntervals(
      intervals,
      "SEM_DEFICIENCIA",
      "FEMININO",
      "2026-08-27",
    );
    expect(result.lines[1].ongoing).toBe(true);
    expect(result.lines[1].endedOn).toBe("2026-08-27");
    expect(result.lines[1].days).toBe(
      daysBetween("2010-01-01", "2026-08-27"),
    );
  });

  it("sem intervalo nenhum, o total é zero", () => {
    const result = convertIntervals([], "SEM_DEFICIENCIA", "MASCULINO", "2026-01-01");
    expect(result.total.totalDays).toBe(0);
    expect(result.total.label).toBe("0 dias");
  });

  it("devolve os anos exigidos no destino, para a tela explicar o alvo", () => {
    expect(
      convertIntervals([], "SEM_DEFICIENCIA", "FEMININO", "2026-01-01").targetYears,
    ).toBe(30);
    expect(
      convertIntervals([], "SEM_DEFICIENCIA", "MASCULINO", "2026-01-01").targetYears,
    ).toBe(35);
  });
});

describe("a frase do tempo", () => {
  it("omite o que é zero e usa singular quando é um", () => {
    expect(timeLabel(33, 11, 5)).toBe("33 anos, 11 meses e 5 dias");
    expect(timeLabel(1, 1, 1)).toBe("1 ano, 1 mês e 1 dia");
    expect(timeLabel(20, 0, 0)).toBe("20 anos");
    expect(timeLabel(0, 5, 2)).toBe("5 meses e 2 dias");
    expect(timeLabel(0, 0, 0)).toBe("0 dias");
  });

  it("decompõe a partir do total em dias", () => {
    const t = breakdownOfDays(365 + 30 + 30 + 5);
    expect([t.years, t.months, t.days]).toEqual([1, 2, 5]);
  });

  it("total negativo é tratado como zero", () => {
    expect(breakdownOfDays(-10).totalDays).toBe(0);
  });
});
