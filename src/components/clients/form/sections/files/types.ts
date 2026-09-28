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
 * Simulação não tem campo obrigatório no metadado, então qualquer arquivo
 * escolhido já pode subir.
 */
export const isSimulationReady = () => true;
