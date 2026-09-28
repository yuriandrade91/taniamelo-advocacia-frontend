/**
 * Monta o `FormData` do upload de documentos.
 *
 * O `ClientFileController` recebe **duas partes paralelas**:
 * `@RequestPart("files") List<MultipartFile>` e
 * `@RequestPart("metadata") List<ClientFileDocumentUploadMetadataDTO>` — o
 * metadado da posição N descreve o arquivo da posição N.
 *
 * A pegadinha está no `metadata`: precisa ir como **JSON**, não como campo de
 * texto. Sem o `Blob` com `type: "application/json"`, o browser manda
 * `text/plain`, o Spring não desserializa a lista e o que volta é um 415
 * genérico que não aponta para a causa.
 *
 * Fica fora do service de propósito: `uploadDocuments` recebe `FormData` pronto
 * (e faz bem — é o que permite reaproveitá-lo para simulações). Quem sabe a
 * forma do metadado é quem monta a tela.
 */

export type DocumentUpload = {
  file: File;
  /** Chave do enum DocumentType (ex.: "DOCUMENTOS_MEDICOS"). */
  documentType: string;
  notes?: string;
};

export function buildDocumentsFormData(
  uploads: readonly DocumentUpload[],
): FormData {
  const form = new FormData();

  for (const upload of uploads) {
    form.append("files", upload.file, upload.file.name);
  }

  const metadata = uploads.map((upload) => ({
    documentType: upload.documentType,
    notes: upload.notes?.trim() || undefined,
  }));

  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );

  return form;
}

/**
 * `FormData` do upload de simulações.
 *
 * Mesma estrutura de duas partes paralelas dos documentos, e a mesma pegadinha:
 * `metadata` precisa ir como JSON. A diferença está no metadado — simulação
 * carrega data, versão e número de vínculos, e nenhum deles é obrigatório
 * (`ClientFileSimulationUploadMetadataDTO` não tem `@NotBlank`).
 *
 * `isPrincipal` **não** vai aqui: no backend ela é marcada por rota própria
 * (`PATCH /files/simulations/{id}/principal`), que precisa do id que só existe
 * depois do upload. Mandá-la no metadado seria ignorada em silêncio.
 */
export type SimulationUpload = {
  file: File;
  simulationDate?: string;
  version?: string;
  vinculos?: number;
  notes?: string;
};

export function buildSimulationsFormData(
  uploads: readonly SimulationUpload[],
): FormData {
  const form = new FormData();

  for (const upload of uploads) {
    form.append("files", upload.file, upload.file.name);
  }

  const metadata = uploads.map((upload) => ({
    simulationDate: upload.simulationDate || undefined,
    version: upload.version?.trim() || undefined,
    vinculos: Number.isFinite(upload.vinculos) ? upload.vinculos : undefined,
    notes: upload.notes?.trim() || undefined,
  }));

  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );

  return form;
}
