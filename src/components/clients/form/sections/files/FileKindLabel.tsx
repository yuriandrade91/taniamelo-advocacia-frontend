"use client";

import { CountBadge } from "@/components/ui/tabs/SegmentedTabs";
import type { FileKind } from "./types";

/** As palavras de cada lado dos arquivos — no singular, no plural e no gênero. */
export const FILE_KIND_WORDS: Record<
  FileKind,
  { label: string; one: string; many: string; attached: string }
> = {
  documents: { label: "Documentos", one: "documento", many: "documentos", attached: "anexado" },
  simulations: { label: "Simulações", one: "simulação", many: "simulações", attached: "anexada" },
};

export const FILE_KINDS = Object.keys(FILE_KIND_WORDS) as FileKind[];

/**
 * O rótulo da aba de um tipo de arquivo, no cadastro e na ficha: o nome,
 * quantos há (selo cinza) e quantos faltam completar (selo dourado).
 */
export function FileKindLabel({
  kind,
  count,
  pending = 0,
}: {
  kind: FileKind;
  count: number;
  pending?: number;
}) {
  const { label, one, many, attached } = FILE_KIND_WORDS[kind];
  return (
    <>
      {label}
      <CountBadge
        count={count}
        tip={count === 1 ? `1 ${one} ${attached}` : `${count} ${many} ${attached}s`}
      />
      <CountBadge
        tone="pending"
        count={pending}
        tip={`${pending} ${pending === 1 ? one : many} com campos a preencher`}
      />
    </>
  );
}
