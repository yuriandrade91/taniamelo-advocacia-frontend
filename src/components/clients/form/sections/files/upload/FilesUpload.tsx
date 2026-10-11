"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DatePickerField,
  Field,
  SelectField,
} from "@/components/ui/form/Field";
import { IconButton } from "@/components/ui/actions/IconButton";
import { TablePagination } from "@/components/ui/table/TablePagination";
import { slicePage } from "@/lib/pagination";
import { SegmentedTabs } from "@/components/ui/tabs/SegmentedTabs";
import { FieldGrid } from "@/components/ui/form/FieldGrid";
import { FILE_KINDS, FILE_KIND_WORDS, FileKindLabel } from "../FileKindLabel";
import {
  documentErrors,
  simulationErrors,
  type FileKind,
} from "../types";
import {
  DOC_TYPES,
  useDocuments,
  useSimulations,
  type DocEntry,
  type SimulationEntry,
  type StagedFilesProps,
} from "./useStagedFiles";
import {
  FileName,
  FileThumb,
  HiddenFileInput,
  RemoveButton,
  WrongSideHint,
  dropCopy,
  dropProps,
} from "./UploadParts";
import { UploadIcon } from "@/components/ui/icons/actions";
import { Svg } from "@/components/ui/icons/Svg";

/**
 * A aba Arquivos do cadastro: **tela inteira + colar**, com a zona viva.
 *
 * - Arrastar um arquivo para qualquer ponto da tela cobre a página com
 *   "Solte para anexar como documento/simulação" (o lado aberto).
 * - Ctrl+V cola o print da conversa ou a foto copiada, sem salvar antes.
 * - A zona viva, na própria aba, recebe arraste e clique; grande enquanto
 *   não há arquivo, uma faixa depois.
 *
 * Documentos e simulações ficam em abas separadas: são dois recursos do
 * backend, com metadados diferentes. Cada arquivo é um cartão com os campos
 * do sistema; todos obrigatórios (`documentErrors`/`simulationErrors`), menos
 * a simulação principal. 10 por página, e a paginação só aparece do 11º.
 */

const PAGE_SIZE = 10;

const TYPE_OPTIONS = DOC_TYPES.map((type) => ({ id: type.key, label: type.label }));

const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer?.types ?? []).includes("Files");

/**
 * Imagem colada chega como "image.png" — todas com o mesmo nome. Dá um nome
 * com data e hora, para a lista (e o servidor) distinguirem.
 */
const renamePasted = (file: File, index: number) => {
  if (file.name && file.name !== "image.png") return file;
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "h");
  const extension = file.type.split("/")[1] ?? "png";
  return new File([file], `colado-${stamp}-${index + 1}.${extension}`, {
    type: file.type,
  });
};

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-md border border-light-gray bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-primary">
    {children}
  </kbd>
);

const StarIcon = ({ isFilled }: { isFilled: boolean }) => (
  <Svg className="h-5 w-5" strokeWidth={1.6}>
    <path
      d="m12 3.5 2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z"
      fill={isFilled ? "currentColor" : "none"}
    />
  </Svg>
);

export function FilesUpload({
  showErrors,
  ...props
}: StagedFilesProps & {
  /** Mostra os campos que faltam — depois de tentar avançar ou salvar. */
  showErrors: boolean;
}) {
  const docs = useDocuments(props);
  const sims = useSimulations(props);
  const [kind, setKind] = useState<FileKind>("documents");
  const [pages, setPages] = useState<Record<FileKind, number>>({
    documents: 1,
    simulations: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [lastPasted, setLastPasted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (files: File[]) =>
    kind === "documents" ? docs.add(files) : sims.add(files);
  // Os ouvintes da janela são registrados uma vez; `add` muda a cada render.
  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  });

  useEffect(() => {
    // dragenter/leave disparam a cada elemento cruzado: um contador diz se o
    // arraste ainda está dentro da janela.
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setIsDragging(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setIsDragging(false);
      setIsOver(false);
      addRef.current(Array.from(event.dataTransfer?.files ?? []));
    };
    // Só cola quando há arquivo na área de transferência: texto colado num
    // campo continua indo para o campo.
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      addRef.current(files.map(renamePasted));
      setLastPasted(files.length);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  useEffect(() => {
    if (!lastPasted) return;
    const timer = window.setTimeout(() => setLastPasted(0), 2500);
    return () => window.clearTimeout(timer);
  }, [lastPasted]);

  const pendingDocs = docs.entries.filter(
    (entry) => Object.keys(documentErrors(entry.doc)).length > 0,
  ).length;
  const pendingSims = sims.entries.filter(
    (entry) => Object.keys(simulationErrors(entry.simulation)).length > 0,
  ).length;

  const counts: Record<FileKind, { count: number; pending: number }> = {
    documents: { count: docs.entries.length, pending: pendingDocs },
    simulations: { count: sims.entries.length, pending: pendingSims },
  };

  const words = FILE_KIND_WORDS[kind];
  const total = kind === "documents" ? docs.entries.length : sims.entries.length;
  const isEmpty = total === 0;
  const copy = dropCopy(kind);
  const setPage = (next: number) => setPages((current) => ({ ...current, [kind]: next }));

  const docPage = slicePage(docs.entries, pages.documents, PAGE_SIZE);
  const simulationPage = slicePage(sims.entries, pages.simulations, PAGE_SIZE);
  const current = kind === "documents" ? docPage : simulationPage;

  /** O corpo de uma aba: a zona viva, o aviso do colado, os cartões. */
  const panel = (tab: FileKind) => (
    <>
      {/* A zona viva: soltar, clicar ou colar. */}
      <div
        {...dropProps(add, setIsOver)}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`group/zone flex cursor-pointer items-center gap-4 rounded-3xl border-2 border-dashed text-left transition focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none ${
          isEmpty ? "flex-col justify-center px-6 py-12 text-center" : "px-5 py-4"
        } ${
          isOver
            ? "scale-[1.01] border-secondary bg-light-secondary motion-reduce:scale-100"
            : "border-light-gray hover:border-secondary/60 hover:bg-floral"
        }`}
      >
        <span
          className={`flex shrink-0 items-center justify-center rounded-full bg-light-secondary text-secondary transition ${
            isEmpty ? "h-14 w-14" : "h-10 w-10"
          } ${isOver ? "animate-bounce motion-reduce:animate-none" : ""}`}
        >
          <UploadIcon className={isEmpty ? "h-7 w-7" : "h-5 w-5"} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-primary">
            {isOver
              ? "Pode soltar"
              : isEmpty
                ? `Arraste ${copy.title} para cá`
                : "Adicionar mais"}
          </span>
          <span className="block text-xs text-gray-100">
            ou clique para escolher · cole com <Kbd>Ctrl</Kbd> + <Kbd>V</Kbd> · {copy.hint}
          </span>
        </span>
        <HiddenFileInput inputRef={inputRef} onFiles={add} />
      </div>

      <p role="status" className="sr-only">
        {lastPasted ? `${lastPasted} arquivo(s) colado(s)` : ""}
      </p>
      {lastPasted > 0 && (
        <p
          aria-hidden="true"
          className="self-start rounded-full bg-light-green px-3 py-1 text-xs font-medium text-success"
        >
          {lastPasted} colado{lastPasted === 1 ? "" : "s"} da área de transferência
        </p>
      )}

      {!isEmpty && (
        <ul aria-label={FILE_KIND_WORDS[tab].label} className="flex flex-col gap-3">
          {tab === "documents"
            ? (docPage.slice as DocEntry[]).map((entry) => (
                <DocumentCard
                  key={entry.id}
                  entry={entry}
                  showErrors={showErrors}
                  docs={docs}
                />
              ))
            : (simulationPage.slice as SimulationEntry[]).map((entry) => (
                <SimulationCard
                  key={entry.id}
                  entry={entry}
                  showErrors={showErrors}
                  sims={sims}
                />
              ))}
        </ul>
      )}

      {total > PAGE_SIZE && (
        <TablePagination
          pageNumber={current.current}
          pageSize={PAGE_SIZE}
          total={total}
          totalPages={current.totalPages}
          onPageChange={setPage}
          noun={[words.one, words.many]}
        />
      )}
    </>
  );

  return (
    <>
      {/* Na largura toda, como as abas das seções e dos endereços: estreita,
          o HeroUI trata a barra como rolável, esmaece a direita e a aba de
          Simulações ficava cortada atrás da seta — sem como abrir. */}
      <SegmentedTabs
        label="Tipo de arquivo"
        selectedKey={kind}
        onSelectionChange={(key) => setKind(key as FileKind)}
        panelClassName="flex flex-col gap-4 p-0"
        tabs={FILE_KINDS.map((id) => ({
          id,
          label: <FileKindLabel kind={id} {...counts[id]} />,
          content: panel(id),
        }))}
      />

      {isDragging &&
        createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-primary/80 p-6 backdrop-blur-sm"
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-white/50 text-center text-white">
              <span className="flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-white/15 motion-reduce:animate-none">
                <UploadIcon className="h-10 w-10" />
              </span>
              <p className="text-2xl font-semibold">Solte para anexar como {words.one}</p>
              <p className="text-sm text-white/70">
                {kind === "documents"
                  ? "O tipo de cada arquivo é escolhido pelo nome — confira depois."
                  : "A versão sai do nome do arquivo (v2, versão 3)."}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Cabeçalho do cartão: miniatura, nome, tamanho e as ações do arquivo. */
function CardHeader({
  file,
  children,
}: {
  file: File;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <FileThumb file={file} className="h-11 w-11" />
      <FileName file={file} />
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

const CARD_CLASS = "flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-light-gray sm:p-5";

function DocumentCard({
  entry,
  showErrors,
  docs,
}: {
  entry: DocEntry;
  showErrors: boolean;
  docs: ReturnType<typeof useDocuments>;
}) {
  const errors = showErrors ? documentErrors(entry.doc) : {};
  return (
    <li className={CARD_CLASS}>
      <CardHeader file={entry.file}>
        <WrongSideHint
          kind="documents"
          name={entry.file.name}
          onMove={() => docs.moveToSimulations(entry)}
        />
        <RemoveButton name={entry.file.name} onClick={() => docs.remove(entry)} />
      </CardHeader>
      <FieldGrid columns={4}>
        <SelectField
          className="sm:col-span-2"
          label="Tipo do documento"
          isRequired
          placeholder="Selecione o tipo"
          options={TYPE_OPTIONS}
          selectedKey={entry.type || null}
          onSelectionChange={(key) => docs.setType(entry, key as typeof entry.type)}
          isInvalid={!!errors.documentType}
          errorMessage={errors.documentType}
        />
        <Field
          className="sm:col-span-2"
          label="Observações"
          isRequired
          placeholder="RG frente e verso, legível"
          value={entry.doc.notes}
          onChange={(event) => docs.setNotes(entry, event.target.value)}
          isInvalid={!!errors.notes}
          errorMessage={errors.notes}
        />
      </FieldGrid>
    </li>
  );
}

function SimulationCard({
  entry,
  showErrors,
  sims,
}: {
  entry: SimulationEntry;
  showErrors: boolean;
  sims: ReturnType<typeof useSimulations>;
}) {
  const errors = showErrors ? simulationErrors(entry.simulation) : {};
  const { simulation: simulation, file } = entry;
  return (
    <li className={CARD_CLASS}>
      <CardHeader file={file}>
        <WrongSideHint
          kind="simulations"
          name={file.name}
          onMove={() => sims.moveToDocuments(entry)}
        />
        {/* Principal é escolha entre as simulações: só o ícone, e o
            tooltip diz o que o clique faz. */}
        <IconButton
          label={simulation.isPrincipal ? "Simulação principal" : "Tornar principal"}
          tone={simulation.isPrincipal ? "secondary" : "neutral"}
          onClick={() => sims.setPrincipal(entry)}
        >
          <StarIcon isFilled={simulation.isPrincipal} />
        </IconButton>
        <RemoveButton name={file.name} onClick={() => sims.remove(entry)} />
      </CardHeader>
      <FieldGrid columns={4}>
        <DatePickerField
          label="Data da simulação"
          isRequired
          value={simulation.simulationDate}
          onChange={(value) => sims.update(entry, { simulationDate: value })}
          isInvalid={!!errors.simulationDate}
          errorMessage={errors.simulationDate}
        />
        <Field
          label="Versão"
          isRequired
          placeholder="1"
          value={simulation.version}
          onChange={(event) => sims.update(entry, { version: event.target.value })}
          isInvalid={!!errors.version}
          errorMessage={errors.version}
        />
        <Field
          label="Vínculos"
          isRequired
          placeholder="3"
          maxLength={3}
          value={simulation.vinculos}
          // Só dígitos: `type="number"` deixaria passar "e", "+" e "-".
          onChange={(event) =>
            sims.update(entry, { vinculos: event.target.value.replace(/\D/g, "") })
          }
          isInvalid={!!errors.vinculos}
          errorMessage={errors.vinculos}
        />
        <Field
          label="Observações"
          isRequired
          placeholder="Cenário com tempo especial"
          value={simulation.notes}
          onChange={(event) => sims.update(entry, { notes: event.target.value })}
          isInvalid={!!errors.notes}
          errorMessage={errors.notes}
        />
      </FieldGrid>
    </li>
  );
}
