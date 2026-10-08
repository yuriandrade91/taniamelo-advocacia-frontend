"use client";

import { useMemo, useState, type ReactNode } from "react";
import ActionButton from "@/components/ui/table/ActionButton";
import {
  DetailsIcon,
  DownloadIcon,
  FileIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/ui/icons/actions";
import { ChevronDownIcon } from "@/components/ui/icons/CalendarIcon";
import { SegmentedTabs } from "@/components/ui/tabs/SegmentedTabs";
import { formatDateBR } from "@/lib/format";
import { openInNewTab } from "@/lib/openInNewTab";
import { AddItemButton } from "../../FormSection";
import { DocumentCatalogPanel } from "./DocumentCatalogPanel";
import { FILE_KINDS, FileKindLabel } from "./FileKindLabel";
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
import { Pill } from "@/components/ui/feedback/Badges";
import { Notice } from "@/components/ui/feedback/Notice";

/**
 * "Arquivos" — o corpo do accordion.
 *
 * Duas abas, no desenho das do cadastro (`SegmentedTabs`), porque são dois
 * recursos distintos no backend (`/files/documents` e `/files/simulations`),
 * com metadados diferentes. Na aba
 * de documentos os arquivos são agrupados por tipo em blocos recolhíveis, na
 * ordem do enum — o usuário procura "Documentos médicos" no mesmo lugar toda
 * vez.
 *
 * Arquivos já no servidor e arquivos apenas escolhidos aparecem na **mesma**
 * lista: separá-los em "enviados" e "a enviar" faria conferir duas vezes. O que
 * distingue é a coluna de data (vazia no que não subiu) e as ações — não dá
 * para baixar o que ainda não existe no servidor.
 *
 * O botão "Novo arquivo" fica na barra das abas, e não no cabeçalho da seção:
 * botão dentro do gatilho de uma seção recolhível aninha elemento interativo
 * dentro de outro, o que quebra teclado e leitor de tela.
 */

/**
 * Sem handlers, só leitura (a ficha): abrir e baixar. Cada handler acende a
 * ação dele — "Novo arquivo", excluir, editar —, e os arquivos escolhidos e
 * ainda não enviados só existem onde se pode removê-los.
 */
export type FilesSectionProps = {
  documents: ClientFileDocumentResponse[];
  simulations: ClientFileSimulationResponse[];
  stagedDocuments?: StagedDocument[];
  stagedSimulations?: StagedSimulation[];
  onAddFiles?: (kind: FileKind) => void;
  onRemoveStagedDocument?: (index: number) => void;
  onRemoveStagedSimulation?: (index: number) => void;
  onDelete?: (kind: FileKind, fileId: string) => void;
  onEdit?: (kind: FileKind, fileId: string) => void;
};

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

/** Selo de quem ainda não subiu — no lugar da data, ou da marca de principal. */
const StagedTag = () => <Pill tone="soft">a enviar</Pill>;

/** Célula de dado: texto pequeno; `strong` para o nome do arquivo. */
function Td({
  children,
  strong = false,
  className = "",
}: {
  children?: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2.5 text-xs ${strong ? "max-w-56 truncate text-primary" : "text-gray-100"} ${className}`}>
      {children}
    </td>
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
  stagedDocuments = [],
  stagedSimulations = [],
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

  const counts: Record<FileKind, number> = {
    documents: documents.length + stagedDocuments.length,
    simulations: simulations.length + stagedSimulations.length,
  };

  const documentsPanel =
    documentGroups.length === 0 ? (
      <Notice>Nenhum documento adicionado.</Notice>
    ) : (
      <div className="flex flex-col gap-3">
        {documentGroups.map((group) => (
          <GroupBlock key={group.type} title={group.type} count={group.items.length}>
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
                      <Td>{row.documentType ?? "—"}</Td>
                      <Td strong>{row.filename}</Td>
                      <Td className="whitespace-nowrap">
                        {row.isStaged ? <StagedTag /> : formatDateBR(row.registeredAt)}
                      </Td>
                      <Td className="max-w-64 truncate">{row.notes || "—"}</Td>
                      <Td>
                        <div className="flex justify-center gap-0.5">
                          {/* Ações do que ainda não subiu são só remover:
                              visualizar e baixar precisam do servidor. */}
                          {!row.isStaged && (
                            <>
                              <ActionButton
                                label="Visualizar"
                                tone="primary"
                                onClick={() => openInNewTab(row.downloadUrl)}
                              >
                                <DetailsIcon />
                              </ActionButton>
                              <ActionButton
                                label="Baixar"
                                tone="secondary"
                                onClick={() => openInNewTab(row.downloadUrl)}
                              >
                                <DownloadIcon />
                              </ActionButton>
                              {onEdit && (
                                <ActionButton
                                  label="Editar"
                                  tone="secondary"
                                  onClick={() => onEdit("documents", row.id)}
                                >
                                  <PencilIcon />
                                </ActionButton>
                              )}
                            </>
                          )}
                          {(row.isStaged || onDelete) && (
                            <ActionButton
                              label="Excluir"
                              tone="danger"
                              onClick={() =>
                                row.isStaged
                                  ? onRemoveStagedDocument?.(stagedIndexOf(row))
                                  : onDelete?.("documents", row.id)
                              }
                            >
                              <TrashIcon />
                            </ActionButton>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GroupBlock>
        ))}
      </div>
    );

  const simulationsPanel =
    counts.simulations === 0 ? (
      <Notice>Nenhuma simulação adicionada.</Notice>
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
                <Td strong>{item.originalFilename}</Td>
                <Td className="whitespace-nowrap">{formatDateBR(item.simulationDate)}</Td>
                <Td>{item.version ?? "—"}</Td>
                <Td>{item.vinculos ?? "—"}</Td>
                <Td>{formatFileSize(item.fileSizeBytes)}</Td>
                <Td>
                  {item.isPrincipal && (
                    <Pill tone="success">Principal</Pill>
                  )}
                </Td>
                <Td>
                  <div className="flex justify-center gap-0.5">
                    <ActionButton
                      label="Baixar"
                      tone="secondary"
                      onClick={() => openInNewTab(item.downloadUrl)}
                    >
                      <DownloadIcon />
                    </ActionButton>
                    {onDelete && (
                      <ActionButton
                        label="Excluir"
                        tone="danger"
                        onClick={() => onDelete("simulations", item.id)}
                      >
                        <TrashIcon />
                      </ActionButton>
                    )}
                  </div>
                </Td>
              </tr>
            ))}

            {stagedSimulations.map((item, index) => (
              <tr key={`staged-${index}`} className="border-b border-secondary/10 last:border-0">
                <Td strong>{item.file.name}</Td>
                <Td className="whitespace-nowrap">{formatDateBR(item.simulationDate)}</Td>
                <Td>{item.version || "—"}</Td>
                <Td>{item.vinculos || "—"}</Td>
                <Td>{formatFileSize(item.file.size)}</Td>
                <Td>
                  <StagedTag />
                </Td>
                <Td>
                  <div className="flex justify-center gap-0.5">
                    <ActionButton
                      label="Remover"
                      tone="danger"
                      onClick={() => onRemoveStagedSimulation?.(index)}
                    >
                      <TrashIcon />
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <SegmentedTabs
      label="Tipo de arquivo"
      selectedKey={tab}
      onSelectionChange={(key) => setTab(key as FileKind)}
      className="gap-4"
      actions={
        onAddFiles && <AddItemButton onClick={() => onAddFiles(tab)}>Novo arquivo</AddItemButton>
      }
      tabs={FILE_KINDS.map((kind) => ({
        id: kind,
        label: <FileKindLabel kind={kind} count={counts[kind]} />,
        content:
          kind === "documents" ? (
            <div className="flex flex-col gap-8">
              {documentsPanel}
              {/*
                Fica na aba de documentos e não acima das abas: é referência
                de documentação do INSS, não tem relação com simulação de
                cálculo. Recolhido por padrão — a lista de arquivos do cliente
                é o conteúdo principal daqui, e cinquenta itens abertos a
                empurrariam para fora da tela.
              */}
              <DocumentCatalogPanel />
            </div>
          ) : (
            simulationsPanel
          ),
      }))}
    />
  );
}
