"use client";

import { Button } from "@heroui/react";
import { SelectField } from "@/components/ui/form/Field";
import { DocumentTypeOptions } from "@/enums/documentType/DocumentType";
import { toSelectOptions } from "@/components/ui/form/options";

/**
 * "Documentos" — arquivos escolhidos e o tipo de cada um.
 *
 * **Componente controlado.** A lista mora na página, não aqui. Isso deixou de
 * ser detalhe quando a criação passou a enviar só as seções preenchidas: para
 * decidir se dispara o upload, o orquestrador precisa saber se há arquivo
 * escolhido — e não daria para perguntar isso a um estado escondido dentro do
 * componente.
 *
 * Cada arquivo precisa do seu `documentType` (é `@NotBlank` no metadado do
 * backend), então a lista vira uma linha por arquivo com o seletor ao lado.
 */

const DOCUMENT_TYPE_OPTIONS = toSelectOptions(DocumentTypeOptions);

export type PendingFile = { file: File; documentType: string };

export type DocumentsSectionProps = {
  files: PendingFile[];
  onFilesChange: (files: PendingFile[]) => void;
  /** Envio imediato — só existe depois que o cliente foi criado. */
  onUploadNow?: () => void;
  isUploading?: boolean;
};

/** `true` quando há arquivo escolhido — o orquestrador decide o envio por isto. */
export const hasDocumentsInput = (files: readonly PendingFile[]) =>
  files.length > 0;

/** `true` quando todos os arquivos têm tipo; o backend recusa metadado vazio. */
export const isDocumentsReady = (files: readonly PendingFile[]) =>
  files.length > 0 && files.every((item) => item.documentType);

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function DocumentsSection({
  files,
  onFilesChange,
  onUploadNow,
  isUploading,
}: DocumentsSectionProps) {
  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onFilesChange([
      ...files,
      ...Array.from(fileList).map((file) => ({ file, documentType: "" })),
    ]);
  };

  const setType = (index: number, documentType: string) =>
    onFilesChange(
      files.map((item, i) => (i === index ? { ...item, documentType } : item)),
    );

  const removeAt = (index: number) =>
    onFilesChange(files.filter((_, i) => i !== index));

  const allTyped = isDocumentsReady(files);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-light-gray px-6 py-8 text-center hover:border-secondary">
        <span className="text-sm font-medium text-primary">
          Clique para escolher os arquivos
        </span>
        <span className="text-xs text-gray-100">
          PDF, imagens ou documentos — vários de uma vez
        </span>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files);
            // Permite reescolher o mesmo arquivo depois de remover da lista.
            event.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="flex flex-col gap-3">
          {files.map((item, index) => (
            <li
              key={`${item.file.name}-${index}`}
              className="flex flex-col gap-3 rounded-xl border border-light-gray p-3 sm:flex-row sm:items-end"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-primary">
                  {item.file.name}
                </span>
                <span className="text-xs text-gray-100">
                  {formatSize(item.file.size)}
                </span>
              </span>

              <SelectField
                className="w-full sm:w-72"
                label="Tipo do documento"
                isRequired
                options={DOCUMENT_TYPE_OPTIONS}
                selectedKey={item.documentType || null}
                onSelectionChange={(key) => setType(index, key)}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => removeAt(index)}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-gray-100">
          {files.length === 0
            ? "Nenhum arquivo selecionado."
            : allTyped
              ? `${files.length} arquivo(s) pronto(s) para envio.`
              : "Escolha o tipo de cada documento para habilitar o envio."}
        </p>
        {onUploadNow && (
          <Button
            type="button"
            variant="primary"
            isDisabled={!allTyped || isUploading}
            onClick={onUploadNow}
          >
            {isUploading ? "Enviando…" : "Enviar documentos"}
          </Button>
        )}
      </div>
    </div>
  );
}
