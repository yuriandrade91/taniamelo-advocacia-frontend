"use client";

import { useEffect, useMemo, type DragEvent } from "react";
import {
  DOCUMENT_TYPE_ENTRIES,
  type DocumentTypeKey,
} from "@/enums/documentType/DocumentType";
import { formatFileSize } from "../fileGrouping";
import {
  newStagedDocument,
  newStagedSimulation,
  type FileKind,
  type StagedDocument,
  type StagedSimulation,
} from "../types";

/**
 * Peças da aba Arquivos do cadastro (`FilesUpload`).
 *
 * A lista continua morando na página (`stagedDocuments`/`stagedSimulations`)
 * — aqui só se decide **como** os arquivos entram e as operações sobre eles.
 *
 * **Documentos e simulações ficam separados**: são dois recursos do backend
 * (`/files/documents` e `/files/simulations`), com metadados diferentes.
 * Arquivo que parece ser do outro lado ganha um aviso "mover", nunca muda
 * sozinho.
 */

export type UploadModelProps = {
  documents: readonly StagedDocument[];
  simulations: readonly StagedSimulation[];
  onDocumentsChange: (documents: StagedDocument[]) => void;
  onSimulationsChange: (simulations: StagedSimulation[]) => void;
};

/** Os onze tipos de documento, na ordem do enum. */
export const DOC_TYPES: readonly {
  key: DocumentTypeKey;
  label: string;
}[] = DOCUMENT_TYPE_ENTRIES.map(([key, label]) => ({ key, label }));

export type DocType = DocumentTypeKey | "";

export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-.]+/g, " ");

/**
 * Palpite de tipo pelo nome (do arquivo ou da pasta). A ordem importa:
 * "certidão de casamento" é dependente antes de "certidão" ser identificação.
 * Sem palpite, `""` — o documento fica sem tipo e a pessoa escolhe.
 */
const GUESSES: readonly [RegExp, DocumentTypeKey][] = [
  [
    /\b(casamento|obito|uniao estavel|dependente|filho|conjuge)/,
    "DEPENDENTES_RELACAO_FAMILIAR",
  ],
  [
    /\b(laudo|atestado|exame|receita|cid|medic|pericia|prontuario)/,
    "DOCUMENTOS_MEDICOS",
  ],
  [/\b(ppp|ltcat|insalubr|periculos|especial)/, "ATIVIDADE_ESPECIAL"],
  [
    /\b(cnis|ctps|carteira de trabalho|holerite|contracheque|rais|vinculo)/,
    "VINCULO_TEMPO_CONTRIBUICAO",
  ],
  [
    /\b(gps|carne|guia|facultativ|mei|individual)/,
    "CONTRIBUINTE_INDIVIDUAL_FACULTATIVO",
  ],
  [
    /\b(rural|sindicato|itr|produtor|pescador|segurado especial)/,
    "SEGURADO_ESPECIAL",
  ],
  [
    /\b(processo|sentenca|indeferiment|decisao|recurso|procuracao|carta|requerimento)/,
    "JUDICIAIS_ADMINISTRATIVOS",
  ],
  [/\b(declaracao|autodeclaracao)/, "DECLARACOES_AUTODECLARACOES"],
  [
    /\b(comprovante|residencia|endereco|conta de (luz|agua)|cadastr)/,
    "CADASTRAIS_DADOS_PESSOAIS",
  ],
  [
    /\b(rg|cpf|cnh|identidade|nascimento|titulo de eleitor|documento pessoal)/,
    "IDENTIFICACAO_SEGURADO",
  ],
];

export function guessDocType(name: string): DocType {
  const text = normalize(name);
  return GUESSES.find(([pattern]) => pattern.test(text))?.[1] ?? "";
}

/** O nome diz "simulação"/"cálculo" — talvez esteja do lado errado. */
export const looksLikeSimulation = (name: string) =>
  /\b(simulacao|simulac|calculo|planejamento previdenciario)/.test(
    normalize(name),
  );

/** Versão escrita no nome ("v2", "versao 3"), para já preencher. */
export const guessVersion = (name: string) =>
  normalize(name).match(/\b(?:v|versao )(\d+)\b/)?.[1] ?? "";

const ids = new WeakMap<File, string>();
let nextId = 0;
export const idOf = (file: File) => {
  let id = ids.get(file);
  if (!id) {
    id = `arquivo-${++nextId}`;
    ids.set(file, id);
  }
  return id;
};

export type DocEntry = {
  id: string;
  file: File;
  doc: StagedDocument;
  type: DocType;
};
export type SimEntry = { id: string; file: File; sim: StagedSimulation };

/** Os documentos escolhidos e as operações sobre eles. */
export function useDocuments({
  documents,
  simulations,
  onDocumentsChange,
  onSimulationsChange,
}: UploadModelProps) {
  const entries: DocEntry[] = documents.map((doc) => ({
    id: idOf(doc.file),
    file: doc.file,
    doc,
    type: doc.documentType as DocType,
  }));

  /** Sem tipo dado, usa o palpite pelo nome; pode ser um por arquivo. */
  const add = (
    files: Iterable<File>,
    type?: DocType | ((file: File) => DocType),
  ) => {
    const added = Array.from(files).map((file) => ({
      ...newStagedDocument(file),
      documentType:
        typeof type === "function"
          ? type(file)
          : (type ?? guessDocType(file.name)),
    }));
    if (added.length) onDocumentsChange([...documents, ...added]);
  };

  const setTypeMany = (targets: readonly DocEntry[], type: DocType) => {
    const files = new Set(targets.map((entry) => entry.file));
    onDocumentsChange(
      documents.map((doc) =>
        files.has(doc.file) ? { ...doc, documentType: type } : doc,
      ),
    );
  };

  const setNotes = (entry: DocEntry, notes: string) =>
    onDocumentsChange(
      documents.map((doc) =>
        doc.file === entry.file ? { ...doc, notes } : doc,
      ),
    );

  const removeMany = (targets: readonly DocEntry[]) => {
    const files = new Set(targets.map((entry) => entry.file));
    onDocumentsChange(documents.filter((doc) => !files.has(doc.file)));
  };
  const remove = (entry: DocEntry) => removeMany([entry]);

  /** O arquivo era simulação: sai daqui e entra do outro lado. */
  const moveToSimulations = (entry: DocEntry) => {
    remove(entry);
    onSimulationsChange([
      ...simulations,
      {
        ...newStagedSimulation(entry.file),
        version: guessVersion(entry.file.name),
      },
    ]);
  };

  return {
    entries,
    add,
    setType: (entry: DocEntry, type: DocType) => setTypeMany([entry], type),
    setTypeMany,
    setNotes,
    remove,
    removeMany,
    moveToSimulations,
  };
}

/** As simulações escolhidas e as operações sobre elas. */
export function useSimulations({
  documents,
  simulations,
  onDocumentsChange,
  onSimulationsChange,
}: UploadModelProps) {
  const entries: SimEntry[] = simulations.map((sim) => ({
    id: idOf(sim.file),
    file: sim.file,
    sim,
  }));

  /** Um ajuste para todos, ou um por arquivo (o primeiro como principal…). */
  const add = (
    files: Iterable<File>,
    patch:
      | Partial<StagedSimulation>
      | ((file: File, index: number) => Partial<StagedSimulation>) = {},
  ) => {
    const added = Array.from(files).map((file, index) => ({
      ...newStagedSimulation(file),
      version: guessVersion(file.name),
      ...(typeof patch === "function" ? patch(file, index) : patch),
    }));
    if (added.length === 0) return;
    // Principal é uma só: entrando uma, as que já estavam deixam de ser.
    const current = added.some((sim) => sim.isPrincipal)
      ? simulations.map((sim) => ({ ...sim, isPrincipal: false }))
      : simulations;
    onSimulationsChange([...current, ...added]);
  };

  const updateMany = (
    targets: readonly SimEntry[],
    patch: Partial<StagedSimulation>,
  ) => {
    const files = new Set(targets.map((entry) => entry.file));
    onSimulationsChange(
      simulations.map((sim) =>
        files.has(sim.file) ? { ...sim, ...patch } : sim,
      ),
    );
  };

  /** Principal é escolha ENTRE as simulações, como o endereço principal. */
  const setPrincipal = (entry: SimEntry) =>
    onSimulationsChange(
      simulations.map((sim) => ({
        ...sim,
        isPrincipal: sim.file === entry.file,
      })),
    );

  const removeMany = (targets: readonly SimEntry[]) => {
    const files = new Set(targets.map((entry) => entry.file));
    onSimulationsChange(simulations.filter((sim) => !files.has(sim.file)));
  };
  const remove = (entry: SimEntry) => removeMany([entry]);

  /** O arquivo era documento: sai daqui e entra do outro lado. */
  const moveToDocuments = (entry: SimEntry) => {
    remove(entry);
    onDocumentsChange([
      ...documents,
      {
        ...newStagedDocument(entry.file),
        documentType: guessDocType(entry.file.name),
      },
    ]);
  };

  return {
    entries,
    add,
    update: (entry: SimEntry, patch: Partial<StagedSimulation>) =>
      updateMany([entry], patch),
    updateMany,
    setPrincipal,
    remove,
    removeMany,
    moveToDocuments,
  };
}

/**
 * Props de arrastar e soltar para qualquer elemento. `preventDefault` no
 * `dragOver` **e** no `drop`: sem o primeiro o drop não dispara, sem o
 * segundo o navegador abre o arquivo numa aba nova.
 */
export function dropProps(
  onFiles: (files: File[]) => void,
  setOver: (over: boolean) => void,
) {
  return {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setOver(true);
    },
    onDragLeave: (event: DragEvent) => {
      // Sair para um filho também dispara dragleave: só conta sair de fato.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null))
        setOver(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setOver(false);
      onFiles(Array.from(event.dataTransfer.files));
    },
  };
}

/** URL temporária do arquivo, revogada quando o componente sai. */
export function useObjectUrl(file: File | undefined) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export const isImage = (file: File) => file.type.startsWith("image/");
export const isPdf = (file: File) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name);

export const extensionOf = (file: File) =>
  (file.name.split(".").pop() ?? "").slice(0, 4).toUpperCase() || "ARQ";

/** Miniatura: a própria imagem, ou um selo com a extensão. */
export function FileThumb({
  file,
  className = "h-12 w-12",
}: {
  file: File;
  className?: string;
}) {
  const url = useObjectUrl(isImage(file) ? file : undefined);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob local, sem otimização possível
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-xl object-cover border border-light-gray ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl text-[10px] font-bold tracking-wide ${
        isPdf(file) ? "bg-danger/10 text-danger" : "bg-primary/5 text-primary"
      } ${className}`}
    >
      {extensionOf(file)}
    </span>
  );
}

/** Nome e tamanho, numa coluna que trunca. */
export function FileName({ file }: { file: File }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-primary">
        {file.name}
      </span>
      <span className="text-xs text-gray-100">{formatFileSize(file.size)}</span>
    </span>
  );
}

/**
 * "Parece simulação · mover" (ou o contrário) — o nome do arquivo sugere o
 * outro lado. Sugestão, nunca mudança automática: o nome pode enganar.
 */
export function WrongSideHint({
  kind,
  name,
  onMove,
}: {
  kind: FileKind;
  name: string;
  onMove: () => void;
}) {
  const suspicious =
    kind === "documents"
      ? looksLikeSimulation(name)
      : !looksLikeSimulation(name) && guessDocType(name) !== "";
  if (!suspicious) return null;
  return (
    <button
      type="button"
      onClick={onMove}
      className="w-fit shrink-0 rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary transition hover:bg-primary/10"
    >
      Parece {kind === "documents" ? "simulação" : "documento"} · mover
    </button>
  );
}

/** Botão redondo de remover — só o ×. */
export function RemoveButton({
  name,
  onClick,
  className = "",
}: {
  name: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Remover ${name}`}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-100 transition hover:bg-danger/10 hover:text-danger ${className}`}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="h-3.5 w-3.5"
      >
        <path
          d="M4 4l8 8M12 4l-8 8"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** Texto da área de soltar, conforme o lado aberto. */
export const dropCopy = (kind: FileKind) =>
  kind === "documents"
    ? {
        title: "os documentos do cliente",
        hint: "RG, laudos, CNIS, comprovantes — vários de uma vez",
      }
    : {
        title: "as simulações de cálculo",
        hint: "PDFs do cálculo — a versão sai do nome (v2, versão 3)",
      };

/** Ícone de nuvem com seta, no traço dos outros ícones. */
export function UploadGlyph({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 15V4m0 0L8 8m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Input de arquivo escondido, que limpa o valor para aceitar o mesmo arquivo de novo. */
export function HiddenFileInput({
  inputRef,
  onFiles,
  accept,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (files: File[]) => void;
  accept?: string;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={accept}
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        onFiles(Array.from(event.target.files ?? []));
        event.target.value = "";
      }}
    />
  );
}
