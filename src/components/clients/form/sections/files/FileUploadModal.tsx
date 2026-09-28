"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Field, SelectField } from "@/components/ui/form/Field";
import {
  DocumentTypeOptions,
  type DocumentTypeKey,
} from "@/enums/documentType/DocumentType";
import { DocumentChecklist } from "./DocumentChecklist";
import { toSelectOptions } from "@/components/ui/form/options";
import {
  FileIcon,
  TrashIcon,
  UploadCloudIcon,
} from "@/components/ui/icons/actions";
import {
  isDocumentReady,
  newStagedDocument,
  newStagedSimulation,
  type FileKind,
  type StagedDocument,
  type StagedSimulation,
} from "./types";
import { formatFileSize } from "./fileGrouping";

/**
 * "Adicionar arquivo(s)".
 *
 * Duas abas porque são dois recursos distintos no backend
 * (`/files/documents` e `/files/simulations`), com metadados diferentes. A aba
 * escolhida decide o endpoint — não é filtro de exibição.
 *
 * O arraste-e-solte precisa de `preventDefault` no `dragOver` **e** no `drop`:
 * sem isso o navegador abre o arquivo numa aba nova e o usuário perde a tela.
 */

const DOCUMENT_TYPE_OPTIONS = toSelectOptions(DocumentTypeOptions);

export type FileUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Aba inicial — a seção abre o modal já na aba em que o usuário estava. */
  initialKind?: FileKind;
  onConfirm: (payload: {
    documents: StagedDocument[];
    simulations: StagedSimulation[];
  }) => void;
};

export default function FileUploadModal({
  isOpen,
  onClose,
  initialKind = "documents",
  onConfirm,
}: FileUploadModalProps) {
  const [kind, setKind] = useState<FileKind>(initialKind);
  const [documents, setDocuments] = useState<StagedDocument[]>([]);
  const [simulations, setSimulations] = useState<StagedSimulation[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cada abertura começa limpa: manter a lista da vez anterior faria o usuário
  // reenviar sem querer o que já subiu.
  useEffect(() => {
    if (isOpen) {
      setKind(initialKind);
      setDocuments([]);
      setSimulations([]);
      setIsDragging(false);
    }
  }, [isOpen, initialKind]);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    if (kind === "documents") {
      setDocuments((current) => [...current, ...files.map(newStagedDocument)]);
    } else {
      setSimulations((current) => [
        ...current,
        ...files.map(newStagedSimulation),
      ]);
    }
  };

  const total = documents.length + simulations.length;
  const canConfirm =
    total > 0 && documents.every(isDocumentReady);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop
        variant="opaque"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200"
      >
        <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200">
          <Modal.Dialog className="sm:max-w-[720px]">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Heading>Adicionar arquivo(s)</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              {/* Abas: a escolha define para qual endpoint o lote vai. */}
              <div
                role="tablist"
                aria-label="Tipo de arquivo"
                className="flex border-b border-light-gray"
              >
                {(
                  [
                    ["simulations", "Simulações"],
                    ["documents", "Documentos"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    type="button"
                    aria-selected={kind === value}
                    onClick={() => setKind(value)}
                    className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                      kind === value
                        ? "border-secondary text-secondary"
                        : "border-transparent text-gray-100 hover:text-primary"
                    }`}
                  >
                    <FileIcon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div
                onDragOver={(event) => {
                  // Sem o preventDefault aqui, o "drop" nunca dispara.
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  // E sem ele aqui, o navegador abre o arquivo numa aba nova.
                  event.preventDefault();
                  setIsDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
                className={`mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                  isDragging
                    ? "border-secondary bg-light-secondary"
                    : "border-light-gray"
                }`}
              >
                <UploadCloudIcon className="h-10 w-10 text-secondary" />
                <p className="text-sm text-primary">
                  Arraste e solte o(s) arquivo(s)
                </p>
                <p className="text-xs text-gray-100">ou</p>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => inputRef.current?.click()}
                >
                  Procurar
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    // Permite reescolher o mesmo arquivo depois de removê-lo.
                    event.target.value = "";
                  }}
                />
              </div>

              {kind === "documents" && documents.length > 0 && (
                <ul className="mt-4 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                  {documents.map((item, index) => (
                    <li
                      key={`${item.file.name}-${index}`}
                      className="rounded-xl border border-light-gray p-3"
                    >
                      <div className="flex items-start gap-3">
                        <FileIcon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-primary">
                            {item.file.name}
                          </span>
                          <span className="text-xs text-gray-100">
                            {formatFileSize(item.file.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${item.file.name}`}
                          className="text-danger"
                          onClick={() =>
                            setDocuments((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <SelectField
                          label="Tipo do documento"
                          isRequired
                          options={DOCUMENT_TYPE_OPTIONS}
                          selectedKey={item.documentType || null}
                          onSelectionChange={(key) =>
                            setDocuments((current) =>
                              current.map((doc, i) =>
                                i === index ? { ...doc, documentType: key } : doc,
                              ),
                            )
                          }
                        />
                        <Field
                          label="Observações"
                          value={item.notes}
                          onChange={(event) =>
                            setDocuments((current) =>
                              current.map((doc, i) =>
                                i === index
                                  ? { ...doc, notes: event.target.value }
                                  : doc,
                              ),
                            )
                          }
                        />
                      </div>

                      {/*
                        A lista da categoria escolhida, logo abaixo do select.
                        Aqui é onde a pergunta "o que mais preciso pedir?"
                        acontece — numa página de consulta separada, seria lida
                        uma vez e esquecida.
                      */}
                      <DocumentChecklist
                        documentType={item.documentType as DocumentTypeKey | ""}
                        className="mt-3"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {kind === "simulations" && simulations.length > 0 && (
                <ul className="mt-4 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                  {simulations.map((item, index) => (
                    <li
                      key={`${item.file.name}-${index}`}
                      className="rounded-xl border border-light-gray p-3"
                    >
                      <div className="flex items-start gap-3">
                        <FileIcon className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-primary">
                            {item.file.name}
                          </span>
                          <span className="text-xs text-gray-100">
                            {formatFileSize(item.file.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remover ${item.file.name}`}
                          className="text-danger"
                          onClick={() =>
                            setSimulations((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Field
                          label="Data"
                          type="date"
                          value={item.simulationDate}
                          onChange={(event) =>
                            setSimulations((current) =>
                              current.map((sim, i) =>
                                i === index
                                  ? { ...sim, simulationDate: event.target.value }
                                  : sim,
                              ),
                            )
                          }
                        />
                        <Field
                          label="Versão"
                          value={item.version}
                          onChange={(event) =>
                            setSimulations((current) =>
                              current.map((sim, i) =>
                                i === index
                                  ? { ...sim, version: event.target.value }
                                  : sim,
                              ),
                            )
                          }
                        />
                        <Field
                          label="Vínculos"
                          type="number"
                          value={item.vinculos}
                          onChange={(event) =>
                            setSimulations((current) =>
                              current.map((sim, i) =>
                                i === index
                                  ? { ...sim, vinculos: event.target.value }
                                  : sim,
                              ),
                            )
                          }
                        />
                        {/*
                          Principal é escolha ENTRE as simulações, como o
                          endereço principal: marcar uma desmarca as outras.
                          Um checkbox por linha permitiria duas principais.
                        */}
                        <label className="flex items-end gap-2 pb-2 text-sm text-gray-100">
                          <input
                            type="radio"
                            name="simulation-principal"
                            className="accent-[var(--color-secondary)]"
                            checked={item.isPrincipal}
                            onChange={() =>
                              setSimulations((current) =>
                                current.map((sim, i) => ({
                                  ...sim,
                                  isPrincipal: i === index,
                                })),
                              )
                            }
                          />
                          Principal
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                className="w-full"
                type="button"
                variant="primary"
                isDisabled={!canConfirm}
                onClick={() => {
                  onConfirm({ documents, simulations });
                  onClose();
                }}
              >
                {total === 0
                  ? "Adicionar"
                  : `Adicionar ${total} arquivo${total === 1 ? "" : "s"}`}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
