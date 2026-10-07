/**
 * Quando perguntar o sexo no cadastro.
 *
 * Na aposentadoria da pessoa com deficiência (LC 142/2013) o sexo escolhe a
 * coluna da tabela de conversão de tempo — sem ele, a seção de períodos não
 * consegue calcular nada. O campo mora em "Dados pessoais", outra aba; então,
 * no momento em que o benefício passa a ser esse, a tela pergunta na hora e
 * grava a resposta no campo "Gênero".
 */
import type { GenderKey } from "@/enums/gender/Gender";

export const DISABILITY_BENEFIT = "APOSENTADORIA_POR_DEFICIENCIA";

/**
 * As duas opções da tabela da LC 142/2013. "Não-binário" e "Outro" continuam
 * no campo de Dados pessoais; a pergunta rápida oferece só o que muda o
 * cálculo.
 */
export const GENDER_PROMPT_OPTIONS = [
  { value: "FEMININO", label: "Feminino" },
  { value: "MASCULINO", label: "Masculino" },
] as const satisfies readonly { value: GenderKey; label: string }[];

/**
 * Pergunta só na **troca** para o benefício por deficiência — escolher de novo
 * o mesmo benefício, ou trocar para outro, não abre nada.
 */
export const shouldAskGender = (previousBenefit: string, nextBenefit: string) =>
  nextBenefit === DISABILITY_BENEFIT && previousBenefit !== DISABILITY_BENEFIT;

/** O valor que o modal já mostra marcado: o gênero atual, se for um dos dois. */
export const initialGenderChoice = (currentGender: string) =>
  GENDER_PROMPT_OPTIONS.some((option) => option.value === currentGender)
    ? currentGender
    : "";
