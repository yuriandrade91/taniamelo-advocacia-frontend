import { describe, expect, it } from "vitest";
import {
  ageFractionOn,
  ageOn,
  competenciasBetween,
  fromDayNumber,
  toDayNumber,
  toTimeSpan,
  totalDays,
  unionIntervals,
} from "./periods";
import { computeTempo, tempoAte } from "./tempoContribuicao";
import {
  avaliarRegras,
  idadeProgressivaExigida,
  pontosExigidos,
  temDireitoAdquirido,
} from "./rules";
import { parseCnis, tryParseRemuneracao, tryParseVinculo } from "./parseCnis";
import { calcularMedia, calcularRmi, coeficiente } from "./rmi";
import { parseFator, parseFatorTable } from "./atualizacao";
import type { CnisDocument } from "./types";

const doc = (vinculos: CnisDocument["vinculos"]): CnisDocument => ({
  vinculos,
  remuneracoesOrfas: [],
  issues: [],
});

const v = (
  seq: number,
  dataInicio: string,
  dataFim?: string,
  remuneracoes: { competencia: string; valor: number }[] = [],
) => ({
  seq,
  origem: `Empresa ${seq}`,
  dataInicio,
  dataFim,
  indicadores: [],
  remuneracoes: remuneracoes.map((r) => ({ ...r, indicadores: [] })),
});

describe("dia juliano", () => {
  it("é o inverso de si mesmo", () => {
    for (const iso of ["1994-07-01", "2000-02-29", "2019-11-13", "2026-09-03"]) {
      expect(fromDayNumber(toDayNumber(iso))).toBe(iso);
    }
  });

  it("não desloca pelo fuso — 1º de março continua 1º de março", () => {
    expect(fromDayNumber(toDayNumber("2010-03-01"))).toBe("2010-03-01");
  });
});

describe("contagem de período", () => {
  it("conta os dois extremos: janeiro inteiro são 31 dias", () => {
    expect(totalDays([{ start: toDayNumber("2020-01-01"), end: toDayNumber("2020-01-31") }])).toBe(31);
  });

  it("um único dia conta 1", () => {
    const d = toDayNumber("2020-05-10");
    expect(totalDays([{ start: d, end: d }])).toBe(1);
  });
});

describe("concomitância", () => {
  it("não conta o mesmo dia duas vezes", () => {
    const a = { start: toDayNumber("2010-01-01"), end: toDayNumber("2010-12-31") };
    const b = { start: toDayNumber("2010-07-01"), end: toDayNumber("2011-06-30") };
    // 01/01/2010 a 30/06/2011 = 365 + 181 = 546
    expect(totalDays([a, b])).toBe(546);
  });

  it("funde períodos encostados: 31/01 e 01/02 não têm buraco", () => {
    const a = { start: toDayNumber("2020-01-01"), end: toDayNumber("2020-01-31") };
    const b = { start: toDayNumber("2020-02-01"), end: toDayNumber("2020-02-29") };
    expect(unionIntervals([a, b])).toHaveLength(1);
    expect(totalDays([a, b])).toBe(60);
  });

  it("mantém separados períodos com intervalo real", () => {
    const a = { start: toDayNumber("2020-01-01"), end: toDayNumber("2020-01-31") };
    const b = { start: toDayNumber("2020-03-01"), end: toDayNumber("2020-03-31") };
    expect(unionIntervals([a, b])).toHaveLength(2);
  });
});

describe("conversão para anos/meses/dias", () => {
  it("usa a convenção previdenciária de 365 e 30", () => {
    expect(toTimeSpan(365)).toEqual({ anos: 1, meses: 0, dias: 0, totalDias: 365 });
    expect(toTimeSpan(395)).toEqual({ anos: 1, meses: 1, dias: 0, totalDias: 395 });
    expect(toTimeSpan(0)).toEqual({ anos: 0, meses: 0, dias: 0, totalDias: 0 });
  });
});

describe("idade", () => {
  it("não conta o aniversário que ainda não chegou", () => {
    expect(ageOn("1965-09-04", "2026-09-03")).toBe(60);
    expect(ageOn("1965-09-03", "2026-09-03")).toBe(61);
  });

  it("dá meia idade para a regra de 59 anos e 6 meses", () => {
    expect(ageFractionOn("1967-03-03", "2026-09-03")).toBeCloseTo(59.5, 1);
  });
});

describe("computeTempo", () => {
  it("fecha o vínculo em aberto na data-base e marca como tal", () => {
    const result = computeTempo(doc([v(1, "2020-01-01")]), "2020-12-31");
    expect(result.tempo.totalDias).toBe(366);
    expect(result.periodos[0].emAberto).toBe(true);
  });

  it("mostra quantos dias a concomitância tirou", () => {
    const result = computeTempo(
      doc([v(1, "2010-01-01", "2010-12-31"), v(2, "2010-07-01", "2011-06-30")]),
      "2026-09-03",
    );
    expect(result.diasBrutos).toBe(365 + 365);
    expect(result.tempo.totalDias).toBe(546);
    expect(result.diasConcomitantes).toBe(184);
  });

  it("não engole vínculo sem data — reporta", () => {
    const result = computeTempo(
      doc([{ seq: 1, origem: "X", indicadores: [], remuneracoes: [] }]),
      "2026-09-03",
    );
    expect(result.ignorados).toHaveLength(1);
    expect(result.tempo.totalDias).toBe(0);
  });
});

describe("carência", () => {
  it("conta competências, não dias", () => {
    const result = computeTempo(doc([v(1, "2020-01-15", "2020-01-20")]), "2026-09-03");
    expect(result.tempo.totalDias).toBe(6);
    expect(result.carencia).toBe(1);
  });

  it("dois empregos no mesmo mês são um mês de carência", () => {
    const result = computeTempo(
      doc([
        v(1, "2020-01-01", "2020-03-31", [
          { competencia: "01/2020", valor: 1000 },
          { competencia: "02/2020", valor: 1000 },
        ]),
        v(2, "2020-02-01", "2020-02-29", [{ competencia: "02/2020", valor: 500 }]),
      ]),
      "2026-09-03",
    );
    // Jan, fev e mar: fevereiro tem dois vínculos e conta uma vez. Março não
    // tem remuneração listada e conta assim mesmo — o período do vínculo é o
    // que vale.
    expect(result.carencia).toBe(3);
  });

  it("conta o período do vínculo, não só os meses com remuneração listada", () => {
    // O banco de remunerações do CNIS começa em 07/1994: um vínculo anterior
    // traz remuneração só do trecho final. Contar apenas essas competências
    // subestima a carência em anos — foi o defeito que este teste fixa.
    const result = computeTempo(
      doc([
        v(1, "1990-01-01", "1994-12-31", [
          { competencia: "07/1994", valor: 100 },
          { competencia: "08/1994", valor: 100 },
        ]),
      ]),
      "2026-09-03",
    );
    expect(result.carencia).toBe(60);
  });

  it("não conta competência posterior à data-base", () => {
    const result = computeTempo(
      doc([v(1, "2020-01-01", "2020-12-31", [
        { competencia: "01/2020", valor: 1 },
        { competencia: "12/2020", valor: 1 },
      ])]),
      "2020-06-30",
    );
    // Janeiro a junho. A remuneração de 12/2020 está além da data-base e fica
    // de fora, mesmo estando no extrato.
    expect(result.carencia).toBe(6);
  });

  it("marca revisão quando há contribuinte individual", () => {
    const semRevisao = computeTempo(doc([v(1, "2020-01-01", "2020-12-31")]), "2026-09-03");
    expect(semRevisao.carenciaPrecisaRevisao).toBe(false);

    const comRevisao = computeTempo(
      doc([
        {
          ...v(1, "2020-01-01", "2020-12-31"),
          tipoFiliado: "Contribuinte Individual",
        },
      ]),
      "2026-09-03",
    );
    expect(comRevisao.carenciaPrecisaRevisao).toBe(true);
  });
});

describe("competenciasBetween", () => {
  it("inclui os dois extremos e vira o ano", () => {
    expect(competenciasBetween("2019-11-01", "2020-02-15")).toEqual([
      "11/2019",
      "12/2019",
      "01/2020",
      "02/2020",
    ]);
  });
});

describe("parâmetros das regras", () => {
  it("bate com a tabela de 2026", () => {
    expect(pontosExigidos(2026, "F")).toBe(93);
    expect(pontosExigidos(2026, "M")).toBe(103);
    expect(idadeProgressivaExigida(2026, "F")).toBe(59.5);
    expect(idadeProgressivaExigida(2026, "M")).toBe(64.5);
  });

  it("respeita os tetos de cada progressão", () => {
    expect(pontosExigidos(2033, "F")).toBe(100);
    expect(pontosExigidos(2040, "F")).toBe(100);
    expect(pontosExigidos(2028, "M")).toBe(105);
    expect(pontosExigidos(2040, "M")).toBe(105);
    expect(idadeProgressivaExigida(2031, "F")).toBe(62);
    expect(idadeProgressivaExigida(2040, "F")).toBe(62);
    expect(idadeProgressivaExigida(2027, "M")).toBe(65);
  });
});

describe("avaliarRegras", () => {
  const base = {
    sexo: "F" as const,
    dataNascimento: "1966-01-01",
    dataBase: "2026-09-03",
    diasContribuicao: 32 * 365,
    diasEm13112019: 25 * 365,
    carencia: 200,
  };

  it("aprova pontos quando idade + tempo alcançam a pontuação", () => {
    // 60 anos de idade + 32 de tempo = 92 pontos; exigido 93 em 2026.
    const pontos = avaliarRegras(base).find((r) => r.id === "pontos");
    expect(pontos?.elegivel).toBe(false);

    const maisVelha = avaliarRegras({ ...base, dataNascimento: "1964-01-01" });
    expect(maisVelha.find((r) => r.id === "pontos")?.elegivel).toBe(true);
  });

  it("declara o pedágio de 50% inaplicável fora da janela de 2 anos", () => {
    const regra = avaliarRegras(base).find((r) => r.id === "pedagio50");
    expect(regra?.aplicavel).toBe(false);
    expect(regra?.elegivel).toBe(false);
    expect(regra?.motivoInaplicavel).toContain("2 anos");
  });

  it("aplica o pedágio de 50% a quem faltava menos de 2 anos em 2019", () => {
    // Faltava 1 ano para os 30 → exige 30,5 anos. Tem 32.
    const regra = avaliarRegras({
      ...base,
      diasEm13112019: 29 * 365,
    }).find((r) => r.id === "pedagio50");
    expect(regra?.aplicavel).toBe(true);
    expect(regra?.elegivel).toBe(true);
  });

  it("cobra o dobro no pedágio de 100%", () => {
    // Faltavam 5 anos em 2019 → exige 35 anos. Tem 32.
    const regra = avaliarRegras(base).find((r) => r.id === "pedagio100");
    expect(regra?.elegivel).toBe(false);
    const tempoRequisito = regra?.requisitos.find((r) =>
      r.label.includes("100%"),
    );
    expect(tempoRequisito?.exigido).toContain("35");
  });

  it("reconhece direito adquirido antes da reforma", () => {
    expect(temDireitoAdquirido({ ...base, diasEm13112019: 31 * 365 })).toBe(true);
    expect(temDireitoAdquirido(base)).toBe(false);
  });

  it("reprova a aposentadoria por idade sem 180 contribuições", () => {
    const regra = avaliarRegras({ ...base, carencia: 179 }).find(
      (r) => r.id === "idadeUrbana",
    );
    expect(regra?.requisitos.find((r) => r.label === "Carência")?.atendido).toBe(false);
  });
});

describe("tempoAte", () => {
  it("corta o vínculo na data pedida", () => {
    const span = tempoAte(doc([v(1, "2019-01-01", "2021-12-31")]), "2019-11-13");
    expect(span.totalDias).toBe(317);
  });

  it("ignora vínculo que começou depois", () => {
    expect(tempoAte(doc([v(1, "2020-01-01", "2021-01-01")]), "2019-11-13").totalDias).toBe(0);
  });
});

describe("parser", () => {
  it("lê uma linha de vínculo com duas datas", () => {
    const vinculo = tryParseVinculo(
      "1  12.345.678/0001-90  METALURGICA EXEMPLO LTDA  01/03/2005  30/09/2008  Empregado",
    );
    expect(vinculo?.seq).toBe(1);
    expect(vinculo?.dataInicio).toBe("2005-03-01");
    expect(vinculo?.dataFim).toBe("2008-09-30");
    expect(vinculo?.tipoFiliado).toBe("Empregado");
    expect(vinculo?.codigoEmpregador).toBe("12.345.678/0001-90");
  });

  it("deixa o fim indefinido quando o vínculo está em aberto", () => {
    const vinculo = tryParseVinculo("3  COMERCIO XYZ ME  15/02/2019  Empregado");
    expect(vinculo?.dataInicio).toBe("2019-02-15");
    expect(vinculo?.dataFim).toBeUndefined();
  });

  it("recusa data impossível em vez de aceitar 31 de fevereiro", () => {
    expect(tryParseVinculo("1  EMPRESA  31/02/2020  01/03/2020")?.dataInicio).toBe(
      "2020-03-01",
    );
  });

  it("lê remuneração e não confunde com vínculo", () => {
    const remuneracao = tryParseRemuneracao("03/2005  1.234,56");
    expect(remuneracao?.competencia).toBe("03/2005");
    expect(remuneracao?.valor).toBe(1234.56);
  });

  it("não lê como remuneração uma linha que tem data completa", () => {
    expect(
      tryParseRemuneracao("1 EMPRESA 01/03/2005 30/09/2008 1.234,56"),
    ).toBeNull();
  });

  it("preserva a razão social e não a confunde com indicador", () => {
    const vinculo = tryParseVinculo(
      "1  12.345.678/0001-90  METALURGICA EXEMPLO LTDA  01/03/2005  30/09/2008  Empregado",
    );
    expect(vinculo?.origem).toBe("METALURGICA EXEMPLO LTDA");
    expect(vinculo?.indicadores).toEqual([]);
  });

  it("separa razão social de indicador na mesma linha", () => {
    const vinculo = tryParseVinculo(
      "2  98.765.432/0001-10  COMERCIO DE ALIMENTOS SA  01/10/1996  31/12/2010  Empregado  PREC-MENOR-MIN",
    );
    expect(vinculo?.origem).toBe("COMERCIO DE ALIMENTOS SA");
    expect(vinculo?.indicadores).toEqual(["PREC-MENOR-MIN"]);
  });

  it("captura os indicadores", () => {
    const vinculo = tryParseVinculo(
      "2  99.888.777/0001-11  PADARIA  01/01/2010  31/12/2012  Empregado  PREC-MENOR-MIN",
    );
    expect(vinculo?.indicadores).toContain("PREC-MENOR-MIN");
  });

  it("liga as remunerações ao vínculo anterior", () => {
    const document = parseCnis(
      [
        "Relações Previdenciárias",
        "1  12.345.678/0001-90  EMPRESA A  01/01/2010  31/12/2010  Empregado",
        "Remunerações",
        "01/2010  1.000,00",
        "02/2010  1.000,00",
        "2  98.765.432/0001-10  EMPRESA B  01/01/2011  31/12/2011  Empregado",
        "Remunerações",
        "01/2011  2.000,00",
      ].join("\n"),
    );
    expect(document.vinculos).toHaveLength(2);
    expect(document.vinculos[0].remuneracoes).toHaveLength(2);
    expect(document.vinculos[1].remuneracoes).toHaveLength(1);
    expect(document.remuneracoesOrfas).toHaveLength(0);
  });

  it("reclama de texto vazio em vez de devolver documento vazio calado", () => {
    const document = parseCnis("   \n  \n");
    expect(document.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("reclama quando não reconhece nenhum vínculo", () => {
    const document = parseCnis("qualquer coisa\noutra linha");
    expect(document.issues.some((i) => i.severity === "error")).toBe(true);
  });

  it("lê a data de nascimento do cabeçalho", () => {
    const document = parseCnis(
      [
        "INSS CNIS",
        "Data de Nascimento: 04/09/1965",
        "1  EMPRESA  01/01/2010  31/12/2010",
      ].join("\n"),
    );
    expect(document.dataNascimento).toBe("1965-09-04");
  });
});

describe("tabela de atualização", () => {
  it("lê vírgula como decimal e ponto como milhar", () => {
    expect(parseFator("9,276961")).toBeCloseTo(9.276961, 6);
    expect(parseFator("1,000000")).toBe(1);
  });

  it("lê ponto como decimal quando não há vírgula", () => {
    expect(parseFator("9.276961")).toBeCloseTo(9.276961, 6);
  });

  it("aceita os separadores em que a tabela costuma sair", () => {
    const { fatores, ignoradas } = parseFatorTable(
      ["07/1994 9,276961", "08/1994;9,100000", "09/1994\t8,900000", "lixo"].join("\n"),
    );
    expect(Object.keys(fatores)).toHaveLength(3);
    expect(fatores["08/1994"]).toBe(9.1);
    expect(ignoradas).toEqual(["lixo"]);
  });
});

describe("média e RMI", () => {
  const documentoComSalarios = doc([
    v(1, "2020-01-01", "2020-03-31", [
      { competencia: "01/2020", valor: 1000 },
      { competencia: "02/2020", valor: 1000 },
      { competencia: "03/2020", valor: 2000 },
    ]),
  ]);

  it("soma salários concomitantes da mesma competência", () => {
    const documento = doc([
      v(1, "2020-01-01", "2020-01-31", [{ competencia: "01/2020", valor: 1000 }]),
      v(2, "2020-01-01", "2020-01-31", [{ competencia: "01/2020", valor: 500 }]),
    ]);
    const resultado = calcularMedia(documento, { "01/2020": 1 });
    expect(resultado.salarios).toHaveLength(1);
    expect(resultado.salarios[0].original).toBe(1500);
  });

  it("recusa calcular quando falta fator, e diz qual", () => {
    const resultado = calcularMedia(documentoComSalarios, {
      "01/2020": 1,
      "02/2020": 1,
    });
    expect(resultado.faltando).toEqual(["03/2020"]);
  });

  it("usa TODOS os salários — a EC 103 acabou com o descarte dos 80%", () => {
    const resultado = calcularMedia(documentoComSalarios, {
      "01/2020": 1,
      "02/2020": 1,
      "03/2020": 1,
    });
    expect(resultado.salarios).toHaveLength(3);
    // Com descarte dos 20% piores a média seria 1500; sem descarte é 1333,33.
    expect(resultado.media).toBeCloseTo(4000 / 3, 6);
  });

  it("descarta o que é anterior a 07/1994 e conta quantos foram", () => {
    const documento = doc([
      v(1, "1990-01-01", "1990-02-28", [
        { competencia: "01/1990", valor: 100 },
        { competencia: "02/1990", valor: 100 },
      ]),
    ]);
    const resultado = calcularMedia(documento, {});
    expect(resultado.descartadasAnteriores).toBe(2);
    expect(resultado.faltando).toHaveLength(0);
  });

  it("aplica o fator de correção", () => {
    const resultado = calcularMedia(
      doc([v(1, "2000-01-01", "2000-01-31", [{ competencia: "01/2000", valor: 1000 }])]),
      { "01/2000": 5.5 },
    );
    expect(resultado.media).toBe(5500);
  });
});

describe("coeficiente", () => {
  it("parte de 60% no piso do gênero", () => {
    expect(coeficiente(15, "F")).toBeCloseTo(0.6, 10);
    expect(coeficiente(20, "M")).toBeCloseTo(0.6, 10);
  });

  it("sobe 2% por ano completo excedente", () => {
    expect(coeficiente(30, "F")).toBeCloseTo(0.9, 10);
    expect(coeficiente(35, "M")).toBeCloseTo(0.9, 10);
  });

  it("descarta a fração do ano", () => {
    expect(coeficiente(30.99, "F")).toBeCloseTo(0.9, 10);
  });

  it("não cai abaixo de 60% para quem tem menos que o piso", () => {
    expect(coeficiente(10, "F")).toBeCloseTo(0.6, 10);
  });
});

describe("calcularRmi", () => {
  it("o pedágio de 100% paga a média inteira", () => {
    const resultado = calcularRmi(4000, 30, "F", "integral");
    expect(resultado.coeficiente).toBe(1);
    expect(resultado.rmi).toBe(4000);
  });

  it("as regras de coeficiente pagam menos com o mesmo tempo", () => {
    const resultado = calcularRmi(4000, 30, "F", "coeficiente");
    expect(resultado.rmi).toBeCloseTo(3600, 6);
  });

  it("limita ao teto", () => {
    const resultado = calcularRmi(20000, 40, "M", "integral");
    expect(resultado.rmi).toBe(8475.55);
    expect(resultado.limitadaPeloTeto).toBe(true);
  });

  it("eleva ao salário mínimo", () => {
    const resultado = calcularRmi(1000, 15, "F", "coeficiente");
    expect(resultado.rmi).toBe(1621);
    expect(resultado.elevadaAoPiso).toBe(true);
  });

  it("avisa que o pedágio de 50% ainda depende do fator previdenciário", () => {
    expect(
      calcularRmi(4000, 30, "F", "fatorPrevidenciario").dependeDeFatorPrevidenciario,
    ).toBe(true);
  });
});
