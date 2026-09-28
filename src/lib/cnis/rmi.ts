/**
 * Média dos salários de contribuição e Renda Mensal Inicial.
 *
 * ## O que a EC 103 mudou
 *
 * Antes, a média usava os **80% maiores** salários — descartava-se o quinto
 * pior. A EC 103 (art. 26) acabou com o descarte: entram **todos** os salários
 * desde 07/1994. Quem continuou aplicando a regra dos 80% depois de 13/11/2019
 * gerou média alta demais em todo cálculo. É por isso que este módulo não tem
 * opção de descarte: a opção seria a porta para o erro.
 *
 * ## O coeficiente
 *
 * 60% da média, mais 2% por ano de contribuição que exceder 20 (homem) ou 15
 * (mulher). Não há teto de 100% na lei, mas a RMI é limitada ao teto do INSS,
 * e o coeficiente na prática satura ali.
 *
 * A exceção é o **pedágio de 100%** (art. 20): 100% da média, sem coeficiente.
 * É quase sempre a regra mais vantajosa em valor — e a razão pela qual comparar
 * regras só por "quando posso me aposentar" leva o cliente a escolher errado.
 *
 * ## O que este módulo se recusa a fazer
 *
 * Não estima. Se faltar o fator de atualização de uma única competência, ele
 * devolve a lista de competências faltantes e **nenhum número**. Ver o porquê
 * em `atualizacao.ts`.
 *
 * Também não calcula **fator previdenciário** (necessário no pedágio de 50%):
 * o fator depende da tábua de expectativa de sobrevida do IBGE, que é outra
 * tabela externa. Sem ela, a regra do art. 17 mostra a média e diz que o valor
 * final ainda depende do fator, em vez de mostrar um número que ignora uma
 * redução de 20% a 40%.
 */

import { competenciaToIndex } from "./periods";
import {
  INDICE_INICIAL,
  SALARIO_MINIMO_2026,
  TETO_INSS_2026,
  type FatorTable,
} from "./atualizacao";
import type { CnisDocument, Competencia, Sexo } from "./types";

export interface SalarioCorrigido {
  competencia: Competencia;
  original: number;
  fator: number;
  corrigido: number;
}

export interface MediaResult {
  /** Salários usados, já corrigidos e ordenados por competência. */
  salarios: SalarioCorrigido[];
  media: number;
  /** Competências sem fator na tabela — quando há alguma, `media` não vale. */
  faltando: Competencia[];
  /** Competências anteriores a 07/1994, descartadas pela própria EC 103. */
  descartadasAnteriores: number;
}

/**
 * Junta as remunerações de todos os vínculos por competência.
 *
 * **Somando** as concomitantes: quem teve dois empregos no mesmo mês contribuiu
 * sobre a soma, e o salário de contribuição do mês é essa soma — limitada ao
 * teto da época. Tratar como dois salários separados na média puxaria a média
 * para baixo, porque cada emprego isolado é menor que o total.
 *
 * O teto da época não é aplicado aqui: o CNIS já registra o salário de
 * contribuição, que nasce limitado. Somar dois vínculos pode ultrapassar o teto
 * do mês, e esse é um caso que precisa de olho humano — vira aviso, não ajuste
 * silencioso.
 */
export function agruparSalarios(document: CnisDocument): Map<Competencia, number> {
  const porCompetencia = new Map<Competencia, number>();

  const add = (competencia: Competencia, valor: number) => {
    porCompetencia.set(competencia, (porCompetencia.get(competencia) ?? 0) + valor);
  };

  for (const vinculo of document.vinculos) {
    for (const remuneracao of vinculo.remuneracoes) {
      add(remuneracao.competencia, remuneracao.valor);
    }
  }
  for (const remuneracao of document.remuneracoesOrfas) {
    add(remuneracao.competencia, remuneracao.valor);
  }

  return porCompetencia;
}

export function calcularMedia(
  document: CnisDocument,
  fatores: FatorTable,
): MediaResult {
  const agrupados = agruparSalarios(document);
  const salarios: SalarioCorrigido[] = [];
  const faltando: Competencia[] = [];
  let descartadasAnteriores = 0;

  const entradas = [...agrupados.entries()].sort((a, b) => {
    const indexA = competenciaToIndex(a[0]) ?? 0;
    const indexB = competenciaToIndex(b[0]) ?? 0;
    return indexA - indexB;
  });

  for (const [competencia, valor] of entradas) {
    const index = competenciaToIndex(competencia);
    if (index === null) continue;
    if (index < INDICE_INICIAL) {
      descartadasAnteriores += 1;
      continue;
    }

    const fator = fatores[competencia];
    if (fator === undefined) {
      faltando.push(competencia);
      continue;
    }

    salarios.push({
      competencia,
      original: valor,
      fator,
      corrigido: valor * fator,
    });
  }

  const soma = salarios.reduce((total, salario) => total + salario.corrigido, 0);
  const media = salarios.length > 0 ? soma / salarios.length : 0;

  return { salarios, media, faltando, descartadasAnteriores };
}

/**
 * Coeficiente do art. 26: 60% + 2% por ano além do piso do gênero.
 *
 * Anos **completos**: 21 anos e 11 meses de contribuição rendem o mesmo que 21.
 * É o único lugar do módulo onde a fração é descartada, e é assim na lei.
 */
export function coeficiente(anosContribuicao: number, sexo: Sexo): number {
  const base = sexo === "F" ? 15 : 20;
  const excedente = Math.max(0, Math.floor(anosContribuicao) - base);
  return 0.6 + 0.02 * excedente;
}

export interface RmiResult {
  media: number;
  coeficiente: number;
  /** Antes de teto e piso. */
  bruto: number;
  rmi: number;
  /** `true` quando o teto ou o piso mudaram o valor. */
  limitadaPeloTeto: boolean;
  elevadaAoPiso: boolean;
  /** Quando a regra exige fator previdenciário, que não é calculado aqui. */
  dependeDeFatorPrevidenciario: boolean;
}

export type RegraRenda = "coeficiente" | "integral" | "fatorPrevidenciario";

/** Como cada regra apura a renda. */
export const RENDA_POR_REGRA: Record<string, RegraRenda> = {
  pontos: "coeficiente",
  idadeProgressiva: "coeficiente",
  pedagio50: "fatorPrevidenciario",
  pedagio100: "integral",
  idadeUrbana: "coeficiente",
};

export function calcularRmi(
  media: number,
  anosContribuicao: number,
  sexo: Sexo,
  regra: RegraRenda,
): RmiResult {
  const coef = regra === "integral" ? 1 : coeficiente(anosContribuicao, sexo);
  const bruto = media * coef;

  const limitadaPeloTeto = bruto > TETO_INSS_2026;
  const elevadaAoPiso = bruto < SALARIO_MINIMO_2026;
  const rmi = Math.min(Math.max(bruto, SALARIO_MINIMO_2026), TETO_INSS_2026);

  return {
    media,
    coeficiente: coef,
    bruto,
    rmi,
    limitadaPeloTeto,
    elevadaAoPiso,
    dependeDeFatorPrevidenciario: regra === "fatorPrevidenciario",
  };
}
