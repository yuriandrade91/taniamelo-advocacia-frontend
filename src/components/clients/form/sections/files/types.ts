/**
 * Arquivos escolhidos na tela e ainda não enviados.
 *
 * Documento e simulação têm metadados **diferentes** no backend — não é a mesma
 * coisa com um flag. Documento exige `documentType` (`@NotBlank`); simulação
 * carrega data, versão, número de vínculos e a marca de principal. Um tipo só
 * com campos opcionais dos dois lados esconderia essa diferença e deixaria
 * passar simulação sem data e documento sem tipo.
 */

export type StagedDocument = {
  file: File;
  /** Chave do enum DocumentType. Obrigatória para enviar. */
  documentType: string;
  notes: string;
};

export type StagedSimulation = {
  file: File;
  /** `yyyy-MM-dd`. */
  simulationDate: string;
  version: string;
  /** Texto no formulário; vira número no payload. */
  vinculos: string;
  notes: string;
  isPrincipal: boolean;
};

export type FileKind = "documents" | "simulations";

export const newStagedDocument = (file: File): StagedDocument => ({
  file,
  documentType: "",
  notes: "",
});

export const newStagedSimulation = (file: File): StagedSimulation => ({
  file,
  simulationDate: "",
  version: "",
  vinculos: "",
  notes: "",
  isPrincipal: false,
});

/** Documento só pode subir com tipo — é `@NotBlank` no metadado. */
export const isDocumentReady = (item: StagedDocument) =>
  Boolean(item.documentType);


/**
 * No cadastro, todo campo do arquivo é obrigatório — o tipo e as observações
 * do documento; data, versão, vínculos e observações da simulação. Só a marca
 * de principal fica de fora (é escolha entre as simulações, não um dado de
 * cada uma). Mais rígido que o backend de propósito: um arquivo sem contexto
 * na ficha vira uma pergunta para o atendimento depois.
 *
 * Devolve só os campos com erro, como os validadores dos formulários.
 */
export function documentErrors(
  item: StagedDocument,
): Partial<Record<"documentType" | "notes", string>> {
  const errors: Partial<Record<"documentType" | "notes", string>> = {};
  if (!item.documentType) errors.documentType = "Escolha o tipo do documento.";
  if (!item.notes.trim()) errors.notes = "Descreva o documento.";
  return errors;
}

export function simulationErrors(
  item: StagedSimulation,
): Partial<Record<"simulationDate" | "version" | "vinculos" | "notes", string>> {
  const errors: Partial<
    Record<"simulationDate" | "version" | "vinculos" | "notes", string>
  > = {};
  if (!item.simulationDate) errors.simulationDate = "Informe a data da simulação.";
  if (!item.version.trim()) errors.version = "Informe a versão.";
  if (!item.vinculos.trim()) errors.vinculos = "Informe os vínculos.";
  if (!item.notes.trim()) errors.notes = "Descreva a simulação.";
  return errors;
}

export const isDocumentComplete = (item: StagedDocument) =>
  Object.keys(documentErrors(item)).length === 0;

export const isSimulationComplete = (item: StagedSimulation) =>
  Object.keys(simulationErrors(item)).length === 0;
