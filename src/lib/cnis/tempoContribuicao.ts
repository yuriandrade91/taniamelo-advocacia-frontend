/**
 * Tempo de contribuição e carência.
 *
 * São dois números diferentes que muita gente trata como um, e a diferença
 * decide benefício:
 *
 * - **Tempo de contribuição** é medido em *dias*, pela união dos períodos.
 *   Dois empregos simultâneos somam uma vez só.
 * - **Carência** é medida em *competências pagas* — quantos meses distintos
 *   têm contribuição. Um vínculo de 15/01 a 20/01 dá 6 dias de tempo e 1 mês
 *   de carência.
 *
 * ## O que este módulo NÃO faz
 *
 * Não converte tempo especial (insalubridade), não reconhece tempo rural, não
 * valida vínculo com indicador de pendência. Cada um desses é uma tese
 * jurídica, não uma conta — e transformar em número o que depende de prova é o
 * jeito de produzir um relatório confiante e errado. Os indicadores do extrato
 * são levantados e mostrados; a decisão continua com o advogado.
 */

import {
  competenciasBetween,
  competenciaToIndex,
  toDayNumber,
  toInterval,
  toTimeSpan,
  totalDays,
  type DayInterval,
  type TimeSpan,
} from "./periods";
import type { CnisDocument, IsoDate, Vinculo } from "./types";

export interface VinculoPeriodo {
  seq: number;
  origem: string;
  inicio: IsoDate;
  fim: IsoDate;
  /** `true` quando o vínculo estava em aberto e foi fechado na data-base. */
  emAberto: boolean;
  dias: number;
}

export interface TempoResult {
  /** Tempo líquido, já sem a dupla contagem da concomitância. */
  tempo: TimeSpan;
  /** Soma ingênua das durações — só para exibir o quanto a concomitância tirou. */
  diasBrutos: number;
  /** `diasBrutos - tempo.totalDias`: dias que apareceram em dois vínculos. */
  diasConcomitantes: number;
  periodos: VinculoPeriodo[];
  /** Competências distintas com contribuição. */
  carencia: number;
  /**
   * `true` quando há vínculo cuja carência depende de recolhimento efetivo
   * (contribuinte individual, facultativo, segurado especial) — o número conta
   * os meses do período e pode estar alto.
   */
  carenciaPrecisaRevisao: boolean;
  /** Vínculos ignorados por não ter data de início. */
  ignorados: { seq: number; origem: string; motivo: string }[];
}

/**
 * Fecha um vínculo em aberto na data-base.
 *
 * Sem isso, o emprego atual — que costuma ser o mais longo — simplesmente não
 * conta. Fica marcado em `emAberto` para a tela dizer que aquele trecho é
 * "até hoje" e não uma data que veio do documento.
 */
function resolveFim(vinculo: Vinculo, dataBase: IsoDate): IsoDate | null {
  if (!vinculo.dataFim) return dataBase;
  // Vínculo com fim posterior à data-base: conta só até a data-base.
  return vinculo.dataFim > dataBase ? dataBase : vinculo.dataFim;
}

export function computeTempo(
  document: CnisDocument,
  dataBase: IsoDate,
): TempoResult {
  const periodos: VinculoPeriodo[] = [];
  const ignorados: TempoResult["ignorados"] = [];
  const intervals: DayInterval[] = [];

  for (const vinculo of document.vinculos) {
    if (!vinculo.dataInicio) {
      ignorados.push({
        seq: vinculo.seq,
        origem: vinculo.origem,
        motivo: "sem data de início no extrato",
      });
      continue;
    }
    const fim = resolveFim(vinculo, dataBase);
    if (!fim || fim < vinculo.dataInicio) {
      ignorados.push({
        seq: vinculo.seq,
        origem: vinculo.origem,
        motivo: "período inválido (fim antes do início)",
      });
      continue;
    }

    const interval = toInterval(vinculo.dataInicio, fim);
    intervals.push(interval);
    periodos.push({
      seq: vinculo.seq,
      origem: vinculo.origem,
      inicio: vinculo.dataInicio,
      fim,
      emAberto: !vinculo.dataFim,
      dias: interval.end - interval.start + 1,
    });
  }

  const liquido = totalDays(intervals);
  const brutos = periodos.reduce((sum, periodo) => sum + periodo.dias, 0);

  return {
    tempo: toTimeSpan(liquido),
    diasBrutos: brutos,
    diasConcomitantes: brutos - liquido,
    periodos,
    carencia: computeCarencia(document, dataBase),
    carenciaPrecisaRevisao: document.vinculos.some((vinculo) =>
      /contribuinte individual|facultativo|segurado especial/i.test(
        vinculo.tipoFiliado ?? "",
      ),
    ),
    ignorados,
  };
}

/**
 * Carência: competências distintas com contribuição.
 *
 * ## Por que o vínculo manda, e não a remuneração
 *
 * A primeira versão preferia as remunerações declaradas, por serem "o que o
 * INSS tem registrado". Estava errada, e de um jeito que só apareceu num teste
 * ponta a ponta: **o banco de remunerações do CNIS começa em 07/1994**. Um
 * vínculo de 1988 a 1996 traz remuneração só dos dois últimos anos — e a regra
 * antiga contava 27 meses de carência onde havia 103. Numa aposentadoria por
 * idade, que exige 180, isso reprova quem tem direito.
 *
 * Agora conta-se a **união**: todos os meses de todo vínculo, mais as
 * competências com remuneração que caiam fora de qualquer vínculo. `Set`
 * resolve a concomitância de graça — dois empregos no mesmo mês são um mês.
 *
 * ## O que fica por conta do advogado
 *
 * Para empregado isso é exato: o recolhimento é responsabilidade do
 * empregador, e o mês do vínculo conta. Para **contribuinte individual** conta
 * o que foi de fato pago, e um mês em aberto dentro do período não vale — a
 * tela avisa quando há vínculo desse tipo, em vez de decidir sozinha.
 */
export function computeCarencia(
  document: CnisDocument,
  dataBase: IsoDate,
): number {
  const limite = Number(dataBase.slice(0, 4)) * 12 + (Number(dataBase.slice(5, 7)) - 1);
  const competencias = new Set<string>();

  const add = (competencia: string) => {
    const index = competenciaToIndex(competencia);
    if (index !== null && index <= limite) competencias.add(competencia);
  };

  for (const vinculo of document.vinculos) {
    for (const remuneracao of vinculo.remuneracoes) add(remuneracao.competencia);

    if (!vinculo.dataInicio) continue;
    const fim =
      !vinculo.dataFim || vinculo.dataFim > dataBase ? dataBase : vinculo.dataFim;
    if (fim < vinculo.dataInicio) continue;
    for (const competencia of competenciasBetween(vinculo.dataInicio, fim)) {
      add(competencia);
    }
  }

  for (const remuneracao of document.remuneracoesOrfas) add(remuneracao.competencia);

  return competencias.size;
}

/**
 * Tempo de contribuição numa data passada — usado pelas regras de pedágio,
 * que medem o que faltava em **13/11/2019**, a véspera da EC 103.
 */
export function tempoAte(document: CnisDocument, data: IsoDate): TimeSpan {
  const intervals: DayInterval[] = [];
  const limite = toDayNumber(data);

  for (const vinculo of document.vinculos) {
    if (!vinculo.dataInicio) continue;
    const inicio = toDayNumber(vinculo.dataInicio);
    if (inicio > limite) continue;
    const fimIso = vinculo.dataFim ?? data;
    const fim = Math.min(toDayNumber(fimIso), limite);
    if (fim < inicio) continue;
    intervals.push({ start: inicio, end: fim });
  }

  return toTimeSpan(totalDays(intervals));
}
