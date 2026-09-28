// Categorias de despesa do escritório.
//
// ⚠️ Ainda NÃO existe no backend — não há tabela nem enum Java para despesa.
// Este arquivo é a proposta de vocabulário, no mesmo formato dos demais enums
// (chave da constante + label PT-BR), para que o dia em que o Java existir o
// contrato já esteja acordado dos dois lados.
import { createEnum } from "@/lib/enumFactory";

const EXPENSE_CATEGORY_ENTRIES = [
  ["ALUGUEL", "Aluguel e condomínio"],
  ["PESSOAL", "Salários e encargos"],
  ["CUSTAS_PROCESSUAIS", "Custas processuais"],
  ["SOFTWARE", "Software e assinaturas"],
  ["MARKETING", "Marketing e captação"],
  ["CONTABILIDADE", "Contabilidade e jurídico"],
  ["IMPOSTOS", "Impostos e taxas"],
  ["MATERIAL", "Material de escritório"],
  ["DESLOCAMENTO", "Deslocamento e viagens"],
  ["OUTROS", "Outros"],
] as const;

const expenseCategory = createEnum(EXPENSE_CATEGORY_ENTRIES);

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_ENTRIES)[number][0];
/** Label PT-BR — seria o valor devolvido pela API (@JsonValue). */
export type ExpenseCategoryLabel = (typeof EXPENSE_CATEGORY_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type ExpenseCategoryInput = ExpenseCategoryKey | ExpenseCategoryLabel;

export const ExpenseCategoryOptions = expenseCategory.options;
export const ExpenseCategoryLabelByKey = expenseCategory.labelByKey;
export const getExpenseCategoryKeyByLabel = expenseCategory.getKeyByLabel;
export const getExpenseCategoryLabelByKey = expenseCategory.getLabelByKey;

export { EXPENSE_CATEGORY_ENTRIES };
