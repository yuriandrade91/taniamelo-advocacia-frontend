/**
 * Espelha `com.lawfirm.law.firm.model.DisabilityGrade` (backend).
 *
 * Os anos não são parâmetro de produto: estão no art. 3º da LC 142/2013 —
 * 20/24/28 para a mulher e 25/29/33 para o homem, conforme a deficiência seja
 * grave, moderada ou leve. `SEM_DEFICIENCIA` carrega 30 e 35, a regra geral de
 * tempo de contribuição, e existe por um motivo só: ser origem ou destino de
 * uma conversão.
 *
 * Por isso ele **não** entra em `DisabilityGradeOptions`, que é o que o select
 * do cadastro oferece — "período de deficiência sem deficiência" é
 * contradição, e o backend recusa (400) se receber.
 */
import { createEnum } from "@/lib/enumFactory";

const DISABILITY_GRADE_ENTRIES = [
  ["GRAVE", "Grave"],
  ["MODERADA", "Moderada"],
  ["LEVE", "Leve"],
  ["SEM_DEFICIENCIA", "Sem deficiência"],
] as const;

const grade = createEnum(DISABILITY_GRADE_ENTRIES);

export type DisabilityGradeKey = (typeof DISABILITY_GRADE_ENTRIES)[number][0];
/** Label PT-BR — é ESTE valor que a API devolve (`@JsonValue` no backend). */
export type DisabilityGradeLabel = (typeof DISABILITY_GRADE_ENTRIES)[number][1];
export type DisabilityGradeInput = DisabilityGradeKey | DisabilityGradeLabel;

/**
 * Anos exigidos por grau: `[mulher, homem]`.
 *
 * A tabela de multiplicadores que circula em material de escritório sai toda
 * daqui — ver `lib/disabilityTime.ts`. Guardar os anos e dividir é o que
 * impede uma célula transcrita errado: a versão que recebemos vinha com a
 * última coluna masculina faltando.
 */
export const REQUIRED_YEARS: Readonly<
  Record<DisabilityGradeKey, readonly [number, number]>
> = {
  GRAVE: [20, 25],
  MODERADA: [24, 29],
  LEVE: [28, 33],
  SEM_DEFICIENCIA: [30, 35],
};

/** Só os três que podem ser gravados num intervalo. */
export const DISABILITY_GRADES_FOR_PERIOD = [
  "GRAVE",
  "MODERADA",
  "LEVE",
] as const satisfies readonly DisabilityGradeKey[];

/**
 * Opções do select do cadastro — na ordem em que a tela pede (leve, moderada,
 * grave), que é a da deficiência menos severa para a mais severa.
 */
export const DisabilityGradeOptions = [
  { value: "LEVE", label: "Leve" },
  { value: "MODERADA", label: "Moderada" },
  { value: "GRAVE", label: "Grave" },
] as const;

/** Todas as quatro, incluindo a base "Sem deficiência" — para o destino da conversão. */
export const DisabilityBasisOptions = grade.options;

export const DisabilityGradeLabelByKey = grade.labelByKey;
export const getDisabilityGradeKeyByLabel = grade.getKeyByLabel;
export const getDisabilityGradeLabelByKey = grade.getLabelByKey;

export { DISABILITY_GRADE_ENTRIES };
