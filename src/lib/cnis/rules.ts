/**
 * Regras de aposentadoria da EC 103/2019 (Reforma da Previdência).
 *
 * ## O que está aqui e o que não está
 *
 * Estão as cinco portas do RGPS urbano para quem já era filiado em 13/11/2019:
 * pontos, idade progressiva, pedágio de 50%, pedágio de 100% e a transição da
 * aposentadoria por idade. Estão os parâmetros e a progressão anual de cada
 * uma.
 *
 * **Não** estão: professor (redutor de 5 anos), rural, deficiência,
 * especial/insalubre, servidor público (regras próprias, EC 103 arts. 4º a
 * 6º), nem a regra permanente do art. 19 para quem se filiou **depois** da
 * reforma (homem: 65 anos e 20 de contribuição, e não 15). Cada uma dessas
 * muda os números; incluí-las pela metade seria pior do que não ter.
 *
 * ## Frações contam
 *
 * O art. 15 §1º manda somar idade e tempo "incluídas as frações". Por isso
 * `pontos` usa idade fracionária e tempo em dias/365, e não anos completos.
 * Arredondar para baixo nos dois adia a aposentadoria de quem já tem direito;
 * arredondar para cima faz o contrário, que é pior.
 *
 * ## Fonte dos parâmetros
 *
 * EC 103/2019, arts. 15 a 20. Conferidos contra a tabela de 2026 (mulher: 93
 * pontos e 59 anos e 6 meses; homem: 103 pontos e 64 anos e 6 meses).
 */

import { ageFractionOn, ageOn, toDayNumber } from "./periods";
import type { IsoDate, Sexo } from "./types";

/** Véspera da EC 103 — a data que congela o direito adquirido e o pedágio. */
export const DATA_EC103: IsoDate = "2019-11-13";

/** Tempo mínimo de contribuição das regras de transição, em anos. */
export const TEMPO_MINIMO: Record<Sexo, number> = { F: 30, M: 35 };

export type RegraId =
  | "pontos"
  | "idadeProgressiva"
  | "pedagio50"
  | "pedagio100"
  | "idadeUrbana";

/** Pontos exigidos no ano (art. 15): 86/96 em 2019, +1 ao ano, teto 100/105. */
export function pontosExigidos(ano: number, sexo: Sexo): number {
  const base = sexo === "F" ? 86 : 96;
  const teto = sexo === "F" ? 100 : 105;
  return Math.min(base + (ano - 2019), teto);
}

/**
 * Idade mínima do art. 16 no ano: 56/61 em 2019, +6 meses ao ano, até 62/65.
 *
 * Meio ano é meio ano de verdade — 59,5 e não 59 nem 60. Em 2026 é exatamente
 * onde a mulher está, e arredondar reprova quem tem direito.
 */
export function idadeProgressivaExigida(ano: number, sexo: Sexo): number {
  const base = sexo === "F" ? 56 : 61;
  const teto = sexo === "F" ? 62 : 65;
  return Math.min(base + 0.5 * (ano - 2019), teto);
}

/** Art. 18 — transição da aposentadoria por idade. Mulher chegou a 62 em 2023. */
export function idadeUrbanaExigida(ano: number, sexo: Sexo): number {
  if (sexo === "M") return 65;
  return Math.min(60 + 0.5 * (ano - 2019), 62);
}

/** Idade fixa dos pedágios do art. 20. O art. 17 não exige idade. */
export const IDADE_PEDAGIO_100: Record<Sexo, number> = { F: 57, M: 60 };

/** Carência da aposentadoria por idade: 180 contribuições. */
export const CARENCIA_IDADE = 180;

export interface RegraInput {
  sexo: Sexo;
  dataNascimento: IsoDate;
  /** Data em que se avalia o direito (DER, ou hoje numa simulação). */
  dataBase: IsoDate;
  /** Tempo total de contribuição na data-base, em dias. */
  diasContribuicao: number;
  /** Tempo de contribuição em 13/11/2019, em dias — só o pedágio usa. */
  diasEm13112019: number;
  /** Competências com contribuição. */
  carencia: number;
}

export interface RequisitoStatus {
  label: string;
  /** O que a regra exige, já formatado. */
  exigido: string;
  /** O que o segurado tem. */
  atual: string;
  atendido: boolean;
  /** Quanto falta, formatado — vazio quando já atendido. */
  falta?: string;
}

export interface RegraResult {
  id: RegraId;
  nome: string;
  /** Artigo da EC 103, para conferência. */
  fundamento: string;
  aplicavel: boolean;
  /** Quando `aplicavel` é falso, o porquê (ex.: pedágio 50% fora da janela). */
  motivoInaplicavel?: string;
  elegivel: boolean;
  requisitos: RequisitoStatus[];
  /** Como a renda é apurada nesta regra — muda muito o valor final. */
  notaRenda: string;
}

const anosDe = (dias: number): number => dias / 365;

const formatAnos = (anos: number): string => {
  const inteiros = Math.floor(anos);
  const meses = Math.round((anos - inteiros) * 12);
  if (meses === 0) return `${inteiros} anos`;
  if (meses === 12) return `${inteiros + 1} anos`;
  return `${inteiros} anos e ${meses} ${meses === 1 ? "mês" : "meses"}`;
};

const requisito = (
  label: string,
  exigidoValor: number,
  atualValor: number,
  format: (value: number) => string,
): RequisitoStatus => {
  const atendido = atualValor + 1e-9 >= exigidoValor;
  return {
    label,
    exigido: format(exigidoValor),
    atual: format(atualValor),
    atendido,
    falta: atendido ? undefined : format(exigidoValor - atualValor),
  };
};

export function avaliarRegras(input: RegraInput): RegraResult[] {
  const ano = Number(input.dataBase.slice(0, 4));
  const idade = ageFractionOn(input.dataNascimento, input.dataBase);
  const tempoAnos = anosDe(input.diasContribuicao);
  const minimo = TEMPO_MINIMO[input.sexo];

  /**
   * O que faltava para o tempo mínimo em 13/11/2019. É a base dos dois
   * pedágios — e é por isso que `diasEm13112019` é entrada separada: recalcular
   * "tempo de hoje menos o que passou" daria outro número em quem teve
   * períodos sem contribuir.
   */
  const faltavaEm2019 = Math.max(0, minimo - anosDe(input.diasEm13112019));

  const regras: RegraResult[] = [];

  // ── Art. 15 — pontos ──
  const pontos = idade + tempoAnos;
  const pontosAlvo = pontosExigidos(ano, input.sexo);
  const reqPontos = [
    requisito("Tempo de contribuição", minimo, tempoAnos, formatAnos),
    requisito(
      "Pontos (idade + tempo)",
      pontosAlvo,
      pontos,
      (value) => value.toFixed(1).replace(".", ","),
    ),
  ];
  regras.push({
    id: "pontos",
    nome: "Pontos",
    fundamento: "EC 103/2019, art. 15",
    aplicavel: true,
    elegivel: reqPontos.every((r) => r.atendido),
    requisitos: reqPontos,
    notaRenda: "60% da média + 2% por ano que exceder 15 (mulher) ou 20 (homem).",
  });

  // ── Art. 16 — idade progressiva ──
  const idadeAlvo = idadeProgressivaExigida(ano, input.sexo);
  const reqIdadeProg = [
    requisito("Tempo de contribuição", minimo, tempoAnos, formatAnos),
    requisito("Idade", idadeAlvo, idade, formatAnos),
  ];
  regras.push({
    id: "idadeProgressiva",
    nome: "Idade progressiva",
    fundamento: "EC 103/2019, art. 16",
    aplicavel: true,
    elegivel: reqIdadeProg.every((r) => r.atendido),
    requisitos: reqIdadeProg,
    notaRenda: "60% da média + 2% por ano que exceder 15 (mulher) ou 20 (homem).",
  });

  // ── Art. 17 — pedágio de 50% ──
  //
  // A porta mais estreita: só entra quem, na véspera da reforma, estava a
  // menos de dois anos do tempo mínimo. Quem não estava não "quase" se
  // enquadra — está fora, e a tela diz isso em vez de mostrar uma barra
  // faltando muito.
  const dentroDaJanela = faltavaEm2019 > 0 && faltavaEm2019 < 2;
  const exigidoPedagio50 = minimo + faltavaEm2019 * 0.5;
  const reqPedagio50 = [
    requisito(
      "Tempo mínimo + 50% do que faltava",
      exigidoPedagio50,
      tempoAnos,
      formatAnos,
    ),
  ];
  regras.push({
    id: "pedagio50",
    nome: "Pedágio de 50%",
    fundamento: "EC 103/2019, art. 17",
    aplicavel: dentroDaJanela,
    motivoInaplicavel: dentroDaJanela
      ? undefined
      : faltavaEm2019 === 0
        ? "Em 13/11/2019 o tempo mínimo já estava completo — o caso é de direito adquirido, não de pedágio."
        : `Em 13/11/2019 faltavam ${formatAnos(faltavaEm2019)} para o tempo mínimo. Esta regra exige faltar menos de 2 anos.`,
    elegivel: dentroDaJanela && reqPedagio50.every((r) => r.atendido),
    requisitos: reqPedagio50,
    notaRenda:
      "Média × fator previdenciário. O fator costuma reduzir bastante antes dos 60 anos.",
  });

  // ── Art. 20 — pedágio de 100% ──
  const idadePedagio = IDADE_PEDAGIO_100[input.sexo];
  const exigidoPedagio100 = minimo + faltavaEm2019;
  const reqPedagio100 = [
    requisito("Idade", idadePedagio, idade, formatAnos),
    requisito(
      "Tempo mínimo + 100% do que faltava",
      exigidoPedagio100,
      tempoAnos,
      formatAnos,
    ),
  ];
  regras.push({
    id: "pedagio100",
    nome: "Pedágio de 100%",
    fundamento: "EC 103/2019, art. 20",
    aplicavel: true,
    elegivel: reqPedagio100.every((r) => r.atendido),
    requisitos: reqPedagio100,
    notaRenda:
      "100% da média, sem fator previdenciário — é a única regra que preserva a média inteira.",
  });

  // ── Art. 18 — transição da aposentadoria por idade ──
  const idadeUrbana = idadeUrbanaExigida(ano, input.sexo);
  const reqIdade = [
    requisito("Idade", idadeUrbana, idade, formatAnos),
    requisito(
      "Carência",
      CARENCIA_IDADE,
      input.carencia,
      (value) => `${Math.round(value)} contribuições`,
    ),
  ];
  regras.push({
    id: "idadeUrbana",
    nome: "Idade",
    fundamento: "EC 103/2019, art. 18",
    aplicavel: true,
    elegivel: reqIdade.every((r) => r.atendido),
    requisitos: reqIdade,
    notaRenda: "60% da média + 2% por ano que exceder 15 (mulher) ou 20 (homem).",
  });

  return regras;
}

/**
 * Direito adquirido: tempo mínimo completo **antes** da reforma.
 *
 * Merece destaque próprio porque quem tem isso não precisa de nenhuma regra de
 * transição — pode se aposentar pela regra antiga, e uma tela que só mostra as
 * cinco transições esconde a melhor opção do cliente.
 */
export function temDireitoAdquirido(input: RegraInput): boolean {
  return anosDe(input.diasEm13112019) >= TEMPO_MINIMO[input.sexo];
}

/** Idade completa na data-base — para exibição. */
export const idadeNaData = (nascimento: IsoDate, data: IsoDate): number =>
  ageOn(nascimento, data);

/** Dias entre 13/11/2019 e a data-base — usado só em diagnóstico. */
export const diasDesdeEC103 = (data: IsoDate): number =>
  toDayNumber(data) - toDayNumber(DATA_EC103);
