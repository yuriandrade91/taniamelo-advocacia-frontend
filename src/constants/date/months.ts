/** Nomes dos meses em PT-BR, 1-based (`MONTH_LABELS[mes - 1]`). */
export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Abreviações minúsculas, 1-based (`MONTH_SHORT[mes - 1]`): "jan", "fev"… */
export const MONTH_SHORT = MONTH_LABELS.map((label) => label.slice(0, 3).toLowerCase());
