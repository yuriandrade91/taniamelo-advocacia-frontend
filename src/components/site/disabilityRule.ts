import { useState } from "react";
import { REQUIRED_YEARS, type DisabilityGradeKey } from "@/enums/disabilityGrade/DisabilityGrade";

/**
 * A regra da Lei Complementar 142/2013 que o simulador do site mostra: as
 * escolhas (sexo e grau) e as contas que saem delas. A tabela é a do sistema
 * (`REQUIRED_YEARS`), conferida célula a célula com o backend — o site não tem
 * uma segunda cópia da lei.
 */

export type Sex = "FEMININO" | "MASCULINO";
export type Grade = Exclude<DisabilityGradeKey, "SEM_DEFICIENCIA">;

export const SEXES: readonly { id: Sex; label: string }[] = [
  { id: "FEMININO", label: "Mulher" },
  { id: "MASCULINO", label: "Homem" },
];

export const GRADES: readonly { id: Grade; label: string }[] = [
  { id: "GRAVE", label: "Grave" },
  { id: "MODERADA", label: "Moderada" },
  { id: "LEVE", label: "Leve" },
];

/** A coluna da tabela de cada sexo — `REQUIRED_YEARS` guarda `[mulher, homem]`. */
const yearsFor = (grade: DisabilityGradeKey, sex: Sex) => REQUIRED_YEARS[grade][sex === "FEMININO" ? 0 : 1];

/** Idade mínima da aposentadoria por idade da pessoa com deficiência (art. 3º, IV). */
const MIN_AGE: Record<Sex, number> = { FEMININO: 55, MASCULINO: 60 };

/**
 * As escolhas do simulador e a regra geral que sai delas: o tempo exigido, o
 * da tabela sem deficiência e a diferença. Começa em mulher, grau grave.
 */
export function useDisabilityRule() {
  const [sex, setSex] = useState<Sex>("FEMININO");
  const [grade, setGrade] = useState<Grade>("GRAVE");
  const required = yearsFor(grade, sex);
  const general = yearsFor("SEM_DEFICIENCIA", sex);
  return { sex, setSex, grade, setGrade, required, general, saved: general - required, minAge: MIN_AGE[sex] };
}
