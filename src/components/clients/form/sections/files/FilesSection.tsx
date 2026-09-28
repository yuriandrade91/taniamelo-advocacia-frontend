"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import ActionButton from "@/components/ui/table/ActionButton";
import {
  DetailsIcon,
  DownloadIcon,
  FileIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons/actions";
import { ChevronDownIcon } from "@/components/ui/icons/CalendarIcon";
import { formatDateBR } from "@/lib/format";
import { DocumentCatalogPanel } from "./DocumentCatalogPanel";
import {
  countLabel,
  formatFileSize,
  groupByDocumentType,
  toDocumentRows,
  type FileRow,
} from "./fileGrouping";
import type { FileKind, StagedDocument, StagedSimulation } from "./types";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
} from "@/interfaces/client/ClientSubResources.interface";

/**
 * "Arquivos" — o corpo do accordion.
 *
 * Duas abas, porque são dois recursos distintos no backend
 * (`/files/documents` e `/files/simulations`), com metadados diferentes. Na aba
 * de documentos os arquivos são agrupados por tipo em blocos recolhíveis, na
 * ordem do enum — o usuário procura "Documentos médicos" no mesmo lugar toda
 * vez.
 *
 * Arquivos já no servidor e arquivos apenas escolhidos aparecem na **mesma**
 * lista: separá-los em "enviados" e "a enviar" faria conferir duas vezes. O que
 * distingue é a coluna de data (vazia no que não subiu) e as ações — não dá
 * para baixar o que ainda não existe no servidor.
 *
 * O botão "Novo arquivo" fica na primeira linha do corpo, e não no cabeçalho do
 * accordion: botão dentro do gatilho do accordion aninha elemento interativo
 * dentro de outro, o que quebra teclado e leitor de tela.
 */

export type FilesSectionProps = {
  documents: ClientFileDocumentResponse[];
  simulations: ClientFileSimulationResponse[];
  stagedDocuments: StagedDocument[];
  stagedSimulations: StagedSimulation[];
  onAddFiles: (kind: FileKind) => void;
  onRemoveStagedDocument: (index: number) => void;
  onRemoveStagedSimulation: (index: number) => void;
  onDelete?: (kind: FileKind, fileId: string) => void;
  onEdit?: (kind: FileKind, fileId: string) => void;
};

const TABS = [
  { id: "documents" as const, label: "Documentos" },
  { id: "simulations" as const, label: "Simulações" },
];

function GroupBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-xl border border-secondary/25">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center gap-3 bg-light-secondary px-4 py-3 text-left"
      >
        <FileIcon className="h-4 w-4 shrink-0 text-secondary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-secondary">
          {title}
        </span>
        <span className="shrink-0 text-xs text-gray-100">
          {countLabel(count)}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-secondary transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && <div className="bg-light-secondary/40 px-4 py-3">{children}</div>}
    </div>
  );
}

/** Cabeçalho de coluna — caixa alta pequena, dourada, como na listagem. */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-left text-[11px] font-medium tracking-wide text-secondary uppercase ${className}`}
    >
      {children}
    </th>
  );
}

export function FilesSection({
  documents,
  simulations,
  stagedDocuments,
  stagedSimulations,
  onAddFiles,
  onRemoveStagedDocument,
  onRemoveStagedSimulation,
  onDelete,
  onEdit,
}: FilesSectionProps) {
  const [tab, setTab] = useState<FileKind>("documents");

  const documentGroups = useMemo(
    () => groupByDocumentType(toDocumentRows(documents, stagedDocuments)),
    [documents, stagedDocuments],
  );

  const stagedIndexOf = (row: FileRow) =>
    Number(row.id.split("-")[1] ?? -1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => onAddFiles(tab)}
        >
          <PlusIcon className="h-4 w-4" />
          Novo arquivo
        </Button>
      </div>

      <div role="tablist" aria-label="Tipo de arquivo" className="flex border-b border-light-gray">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === item.id
                ? "border-secondary text-secondary"
                : "border-transparent text-gray-100 hover:text-primary"
            }`}
          >
            <FileIcon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "documents" ? (
        documentGroups.length === 0 ? (
          <p className="rounded-xl bg-page/60 px-6 py-10 text-center text-sm text-gray-100/70">
            Nenhum documento adicionado.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {documentGroups.map((group) => (
              <GroupBlock
                key={group.type}
                title={group.type}
                count={group.items.length}
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="border-b border-secondary/20">
                        <Th>Tipo</Th>
                        <Th>Rótulo</Th>
                        <Th>Data do registro</Th>
                        <Th>Observações</Th>
                        <Th className="text-center">Ações</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((row) => (
                        <tr key={row.id} className="border-b border-secondary/10 last:border-0">
                          <td className="px-3 py-2.5 text-xs text-gray-100">
                            {row.documentType ?? "—"}
                          </td>
                          <td className="max-w-56 truncate px-3 py-2.5 text-xs text-primary">
                            {row.filename}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap text-gray-100">
                            {row.isStaged ? (
                              <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-medium text-secondary">
                                a enviar
                              </span>
                            ) : (
                              formatDateBR(row.registeredAt)
                            )}
                          </td>
                          <td className="max-w-64 truncate px-3 py-2.5 text-xs text-gray-100">
                            {row.notes || "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-center gap-0.5">
                              {/* Ações do que ainda não subiu são só remover:
                                  visualizar e baixar precisam do servidor. */}
                              {!row.isStaged && (
                                <>
                                  <ActionButton
                                    label="Visualizar"
                                    tone="primary"
                                    onClick={() =>
                                      row.downloadUrl &&
                                      window.open(row.downloadUrl, "_blank", "noopener,noreferrer")
                                    }
                                  >
                                    <DetailsIcon />
                                  </ActionButton>
                                  <ActionButton
                                    label="Baixar"
                                    tone="secondary"
                                    onClick={() =>
                                      row.downloadUrl &&
                                      window.open(row.downloadUrl, "_blank", "noopener,noreferrer")
                                    }
                                  >
                                    <DownloadIcon />
                                  </ActionButton>
                                  <ActionButton
                                    label="Editar"
                                    tone="secondary"
                                    onClick={() => onEdit?.("documents", row.id)}
                                  >
                                    <PencilIcon />
                                  </ActionButton>
                                </>
                              )}
                              <ActionButton
                                label="Excluir"
                                tone="danger"
                                onClick={() =>
                                  row.isStaged
                                    ? onRemoveStagedDocument(stagedIndexOf(row))
                                    : onDelete?.("documents", row.id)
                                }
                              >
                                <TrashIcon />
                              </ActionButton>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GroupBlock>
            ))}
          </div>
        )
      ) : simulations.length === 0 && stagedSimulations.length === 0 ? (
        <p className="rounded-xl bg-page/60 px-6 py-10 text-center text-sm text-gray-100/70">
          Nenhuma simulação adicionada.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary/25">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="bg-light-secondary">
              <tr>
                <Th>Rótulo</Th>
                <Th>Data</Th>
                <Th>Versão</Th>
                <Th>Vínculos</Th>
                <Th>Tamanho</Th>
                <Th>Principal</Th>
                <Th className="text-center">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {simulations.map((item) => (
                <tr key={item.id} className="border-b border-secondary/10 last:border-0">
                  <td className="max-w-56 truncate px-3 py-2.5 text-xs text-primary">
                    {item.originalFilename}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap text-gray-100">
                    {formatDateBR(item.simulationDate)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-100">{item.version ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-100">{item.vinculos ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-100">
                    {formatFileSize(item.fileSizeBytes)}
                  </td>
                  <td className="px-3 py-2.5">
                    {item.isPrincipal && (
                      <span className="rounded-full bg-light-green px-2 py-0.5 text-[10px] font-medium text-[#238C26]">
                        Principal
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center gap-0.5">
                      <ActionButton
                        label="Baixar"
                        tone="secondary"
                        onClick={() =>
                          item.downloadUrl &&
                          window.open(item.downloadUrl, "_blank", "noopener,noreferrer")
                        }
                      >
                        <DownloadIcon />
                      </ActionButton>
                      <ActionButton
                        label="Excluir"
                        tone="danger"
                        onClick={() => onDelete?.("simulations", item.id)}
                      >
                        <TrashIcon />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}

              {stagedSimulations.map((item, index) => (
                <tr key={`staged-${index}`} className="border-b border-secondary/10 last:border-0">
                  <td className="max-w-56 truncate px-3 py-2.5 text-xs text-primary">
                    {item.file.name}
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap text-gray-100">
                    {formatDateBR(item.simulationDate)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-100">{item.version || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-100">{item.vinculos || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-100">
                    {formatFileSize(item.file.size)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-medium text-secondary">
                      a enviar
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center gap-0.5">
                      <ActionButton
                        label="Remover"
                        tone="danger"
                        onClick={() => onRemoveStagedSimulation(index)}
                      >
                        <TrashIcon />
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
        Fica na aba de documentos e não acima das abas: é referência de
        documentação do INSS, não tem relação com simulação de cálculo.
        Recolhido por padrão — a lista de arquivos do cliente é o conteúdo
        principal daqui, e cinquenta itens abertos a empurrariam para fora da
        tela.
      */}
      {tab === "documents" && (
        <div className="mt-4">
          <DocumentCatalogPanel />
        </div>
      )}
    </div>
  );
}
