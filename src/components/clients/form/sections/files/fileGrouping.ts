import {
  DOCUMENT_TYPE_ENTRIES,
  DocumentTypeLabelByKey,
} from "@/enums/documentType/DocumentType";

/**
 * Agrupamento dos documentos por tipo, para os blocos recolhíveis da aba
 * "Documentos".
 *
 * **A ordem dos grupos é a do enum, não a de chegada.** O usuário procura
 * "Documentos médicos" no mesmo lugar toda vez; ordenar por inserção faria a
 * lista se rearranjar a cada upload, e achar um tipo viraria releitura da tela
 * inteira.
 *
 * Grupos vazios não aparecem: com 11 tipos, mostrar todos deixaria oito
 * cabeçalhos vazios entre os que têm conteúdo.
 */

export type GroupableFile = {
  /** Label PT-BR do tipo, como a API devolve (`@JsonValue`). */
  documentType?: string;
};

export type FileGroup<T> = {
  /** Label do tipo — é também o título do bloco. */
  type: string;
  items: T[];
};

/** Ordem canônica dos labels, derivada do enum. */
const TYPE_ORDER: string[] = DOCUMENT_TYPE_ENTRIES.map(([, label]) => label);

/** Rótulo dos arquivos cujo tipo não bate com nenhum do enum. */
export const UNCLASSIFIED_LABEL = "Sem classificação";

export function groupByDocumentType<T extends GroupableFile>(
  files: readonly T[],
): FileGroup<T>[] {
  const byType = new Map<string, T[]>();

  for (const file of files) {
    const raw = file.documentType?.trim();
    // Tipo desconhecido não some da tela: vira um grupo próprio. Arquivo que
    // não aparece em lugar nenhum é pior que arquivo mal classificado.
    const key =
      raw && TYPE_ORDER.includes(raw) ? raw : (raw ?? UNCLASSIFIED_LABEL);
    const bucket = byType.get(key);
    if (bucket) bucket.push(file);
    else byType.set(key, [file]);
  }

  const ordered: FileGroup<T>[] = [];
  for (const type of TYPE_ORDER) {
    const items = byType.get(type);
    if (items?.length) {
      ordered.push({ type, items });
      byType.delete(type);
    }
  }
  // O que sobrou (tipos fora do enum) vai depois, em ordem alfabética.
  for (const type of [...byType.keys()].sort()) {
    ordered.push({ type, items: byType.get(type)! });
  }
  return ordered;
}

/** Label a partir da CHAVE do enum — usado no que ainda não foi enviado. */
export const labelOfDocumentType = (key: string): string =>
  DocumentTypeLabelByKey[key as keyof typeof DocumentTypeLabelByKey] ??
  UNCLASSIFIED_LABEL;

/** "2 documentos registrados" / "1 documento registrado". */
export const countLabel = (count: number, noun = "documento"): string =>
  `${count} ${noun}${count === 1 ? "" : "s"} registrado${count === 1 ? "" : "s"}`;

/** Tamanho legível — a lista mostra o peso de cada arquivo. */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Linha exibida na tabela — une o que já está no servidor com o que foi
 * escolhido na tela e ainda não subiu.
 *
 * Os dois aparecem juntos de propósito: separar em "enviados" e "a enviar"
 * faria o usuário conferir a mesma lista em dois lugares. `isStaged` distingue
 * o que ainda não existe no servidor, e é o que decide quais ações a linha
 * oferece — não dá para baixar o que não foi enviado.
 */
export type FileRow = {
  id: string;
  /** Label do tipo (documento) — vazio nas simulações. */
  documentType?: string;
  filename: string;
  /** `uploadedAt` do servidor; ausente no que ainda não subiu. */
  registeredAt?: string;
  notes?: string;
  isStaged: boolean;
  downloadUrl?: string;
};

export function toDocumentRows(
  registered: readonly {
    id: string;
    documentType?: string;
    originalFilename: string;
    notes?: string;
    uploadedAt?: string;
    downloadUrl?: string;
  }[],
  staged: readonly { file: File; documentType: string; notes: string }[],
): FileRow[] {
  return [
    ...registered.map((item) => ({
      id: item.id,
      documentType: item.documentType,
      filename: item.originalFilename,
      registeredAt: item.uploadedAt,
      notes: item.notes,
      isStaged: false,
      downloadUrl: item.downloadUrl,
    })),
    ...staged.map((item, index) => ({
      // Sem id do servidor ainda: a chave é posicional e local.
      id: `staged-${index}-${item.file.name}`,
      documentType: labelOfDocumentType(item.documentType),
      filename: item.file.name,
      notes: item.notes,
      isStaged: true,
    })),
  ];
}
