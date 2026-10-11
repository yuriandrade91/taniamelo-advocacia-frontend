"use client";

import { useMemo, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/actions/IconButton";
import { DetailsIcon, DownloadIcon, FileIcon, TrashIcon } from "@/components/ui/icons/actions";
import { SegmentedTabs } from "@/components/ui/tabs/SegmentedTabs";
import { Pill } from "@/components/ui/feedback/Badges";
import { Notice } from "@/components/ui/feedback/Notice";
import { ChevronDownIcon } from "@/components/ui/icons/glyphs";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { formatDateBR } from "@/lib/format";
import { openBlob, saveBlob } from "@/lib/blobFile";
import { downloadClientFile } from "@/services/clientFileService";
import { DocumentCatalogPanel } from "./DocumentCatalogPanel";
import { FILE_KINDS, FileKindLabel } from "./FileKindLabel";
import { countLabel, formatFileSize, groupByDocumentType } from "./fileGrouping";
import type { FileKind } from "./types";

/**
 * "Arquivos" da ficha — o que já está no servidor.
 *
 * Duas abas, no desenho das do cadastro (`SegmentedTabs`), porque são dois
 * recursos distintos no backend (`/files/documents` e `/files/simulations`),
 * com metadados diferentes. Na aba de documentos os arquivos são agrupados por
 * tipo em blocos recolhíveis, na ordem do enum — o usuário procura "Documentos
 * médicos" no mesmo lugar toda vez.
 *
 * Abrir e baixar passam pela API com o token (`downloadClientFile`); o que
 * foi escolhido e ainda não subiu mora no `FilesUpload`, logo abaixo.
 */

export type FilesSectionProps = {
  clientId: string;
  documents: ClientFileDocumentResponse[];
  simulations: ClientFileSimulationResponse[];
  /** Sem ele, só leitura: abrir e baixar. */
  onDelete?: (fileId: string) => void;
};

function GroupBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
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
function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-left text-[11px] font-medium tracking-wide text-secondary uppercase ${className}`}
    >
      {children}
    </th>
  );
}

export function FilesSection({ clientId, documents, simulations, onDelete }: FilesSectionProps) {
  const [tab, setTab] = useState<FileKind>("documents");
  const documentGroups = useMemo(() => groupByDocumentType(documents), [documents]);

  // O erro da requisição já sai pela central; aqui só não deixa a promessa solta.
  const view = (file: { id: string; originalFilename: string }) =>
    void openBlob(() => downloadClientFile(clientId, file.id), file.originalFilename).catch(() => {});
  const save = (file: { id: string; originalFilename: string }) =>
    void saveBlob(() => downloadClientFile(clientId, file.id), file.originalFilename).catch(() => {});

  const counts: Record<FileKind, number> = {
    documents: documents.length,
    simulations: simulations.length,
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
                  {group.items.map((item) => (
                    <tr key={item.id} className="border-b border-secondary/10 last:border-0">
                      <Td>{item.documentType ?? "—"}</Td>
                      <Td strong>{item.originalFilename}</Td>
                      <Td className="whitespace-nowrap">{formatDateBR(item.uploadedAt)}</Td>
                      <Td className="max-w-64 truncate">{item.notes || "—"}</Td>
                      <Td>
                        <div className="flex justify-center gap-0.5">
                          <IconButton label="Visualizar" tone="primary" onClick={() => view(item)}>
                            <DetailsIcon />
                          </IconButton>
                          <IconButton label="Baixar" tone="secondary" onClick={() => save(item)}>
                            <DownloadIcon />
                          </IconButton>
                          {onDelete && (
                            <IconButton label="Excluir" tone="danger" onClick={() => onDelete(item.id)}>
                              <TrashIcon />
                            </IconButton>
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
    simulations.length === 0 ? (
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
                <Td>{item.isPrincipal && <Pill tone="success">Principal</Pill>}</Td>
                <Td>
                  <div className="flex justify-center gap-0.5">
                    <IconButton label="Visualizar" tone="primary" onClick={() => view(item)}>
                      <DetailsIcon />
                    </IconButton>
                    <IconButton label="Baixar" tone="secondary" onClick={() => save(item)}>
                      <DownloadIcon />
                    </IconButton>
                    {onDelete && (
                      <IconButton label="Excluir" tone="danger" onClick={() => onDelete(item.id)}>
                        <TrashIcon />
                      </IconButton>
                    )}
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
