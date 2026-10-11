import { DOCUMENT_TYPE_ENTRIES } from "@/enums/documentType/DocumentType";

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

type GroupableFile = {
  /** Label PT-BR do tipo, como a API devolve (`@JsonValue`). */
  documentType?: string;
};

type FileGroup<T> = {
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

/** "2 documentos registrados" / "1 documento registrado". */
export const countLabel = (count: number): string =>
  count === 1 ? "1 documento registrado" : `${count} documentos registrados`;

/** Tamanho legível — a lista mostra o peso de cada arquivo. */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
