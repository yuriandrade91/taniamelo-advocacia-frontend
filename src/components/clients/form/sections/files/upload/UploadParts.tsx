"use client";

import { useEffect, useMemo, type DragEvent } from "react";
import { formatFileSize } from "../fileGrouping";
import type { FileKind } from "../types";
import { looksLikeOtherSide } from "./useStagedFiles";
import { Svg } from "@/components/ui/icons/Svg";

/**
 * As peças visuais da aba Arquivos (`FilesUpload`): soltar arquivo em
 * qualquer área, a miniatura, o nome, o aviso de lado trocado e o botão de
 * remover.
 */

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
function useObjectUrl(file: File | undefined) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

/**
 * O que a miniatura e o nome precisam saber: o `File` escolhido agora, ou o
 * arquivo já gravado (nome, tipo e tamanho que a API devolve).
 */
export type FileLike = { name: string; type?: string; size?: number };

const isImage = (file: FileLike) => file.type?.startsWith("image/") ?? false;
const isPdf = (file: FileLike) =>
  file.type === "application/pdf" || /\.pdf$/i.test(file.name);

const extensionOf = (file: FileLike) =>
  (file.name.split(".").pop() ?? "").slice(0, 4).toUpperCase() || "ARQ";

/**
 * Miniatura: a própria imagem, ou um selo com a extensão. O gravado fica no
 * selo — a prévia custaria baixar cada arquivo só para desenhar a lista.
 */
export function FileThumb({
  file,
  className = "h-12 w-12",
}: {
  file: FileLike;
  className?: string;
}) {
  const url = useObjectUrl(file instanceof File && isImage(file) ? file : undefined);
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

/** Nome e, embaixo, o tamanho (ou o que for passado em `detail`), numa coluna que trunca. */
export function FileName({ file, detail }: { file: FileLike; detail?: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-primary">
        {file.name}
      </span>
      <span className="text-xs text-gray-100">{detail ?? formatFileSize(file.size)}</span>
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
  if (!looksLikeOtherSide(kind, name)) return null;
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
      <Svg viewBox="0 0 16 16" strokeWidth={1.75} className="h-3.5 w-3.5">
        <path d="M4 4l8 8M12 4l-8 8" />
      </Svg>
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
