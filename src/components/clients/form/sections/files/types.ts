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

/**
 * Os formatos que o backend aceita (`AllowedMimeTypes`): documento é PDF ou
 * imagem; simulação é o PDF do cálculo, nada mais. Vale também para o
 * `accept` do seletor de arquivos.
 */
export const ACCEPTED_TYPES: Record<FileKind, readonly string[]> = {
  documents: ["application/pdf", "image/png", "image/jpeg"],
  simulations: ["application/pdf"],
};

/** O teto por arquivo do backend (`max-file-size: 10MB`, em bytes binários). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * O que impede o arquivo em si de subir — formato ou tamanho. O backend
 * recusa o lote inteiro por um arquivo só, e a tela dizia apenas "Nem todos
 * os arquivos foram enviados": aqui o problema aparece no cartão dele, assim
 * que o arquivo entra.
 */
export function fileError(
  kind: FileKind,
  file: Pick<File, "type" | "size">,
): string | undefined {
  if (!ACCEPTED_TYPES[kind].includes(file.type.toLowerCase())) {
    return kind === "documents"
      ? "Formato não aceito: envie PDF, PNG ou JPEG."
      : "Simulação só aceita PDF.";
  }
  if (file.size > MAX_FILE_BYTES) return "Arquivo acima de 10 MB.";
  return undefined;
}

type DocumentErrorKey = "file" | "documentType" | "notes";
type SimulationErrorKey = "file" | "simulationDate" | "version" | "vinculos" | "notes";

/**
 * No cadastro, cada campo do arquivo é obrigatório — o tipo e as observações
 * do documento; data, versão, vínculos e observações da simulação. Só a marca
 * de principal fica de fora (é escolha entre as simulações, não um dado de
 * cada uma). Mais rígido que o backend de propósito: um arquivo sem contexto
 * na ficha vira uma pergunta para o atendimento depois. E o arquivo precisa
 * ser um que o backend aceite (`fileError`).
 *
 * Devolve só os campos com erro, como os validadores dos formulários.
 */
export function documentErrors(
  item: StagedDocument,
): Partial<Record<DocumentErrorKey, string>> {
  const errors: Partial<Record<DocumentErrorKey, string>> = {};
  const file = fileError("documents", item.file);
  if (file) errors.file = file;
  if (!item.documentType) errors.documentType = "Escolha o tipo do documento.";
  if (!item.notes.trim()) errors.notes = "Descreva o documento.";
  return errors;
}

export function simulationErrors(
  item: StagedSimulation,
): Partial<Record<SimulationErrorKey, string>> {
  const errors: Partial<Record<SimulationErrorKey, string>> = {};
  const file = fileError("simulations", item.file);
  if (file) errors.file = file;
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
