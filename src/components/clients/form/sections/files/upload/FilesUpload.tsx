"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { Pill } from "@/components/ui/feedback/Badges";
import { Notice } from "@/components/ui/feedback/Notice";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { formatDateBR, plural } from "@/lib/format";
import { numberTextOf } from "@/lib/formValues";
import { openBlob, saveBlob } from "@/lib/blobFile";
import { downloadClientFile } from "@/services/clientFileService";
import { FILE_KINDS, FILE_KIND_WORDS, FileKindLabel } from "../FileKindLabel";
import { formatFileSize, groupByDocumentType } from "../fileGrouping";
import {
  ACCEPTED_TYPES,
  documentErrors,
  fileError,
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
  type FileLike,
} from "./UploadParts";
import { DetailsIcon, DownloadIcon, TrashIcon, UploadIcon } from "@/components/ui/icons/actions";
import { CheckIcon } from "@/components/ui/icons/glyphs";
import { Svg } from "@/components/ui/icons/Svg";

/**
 * Os arquivos do cliente — a aba Arquivos do cadastro e a seção Arquivos da
 * ficha, no mesmo desenho: **tela inteira + colar**, com a zona viva.
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
 *
 * Na ficha entram também os arquivos já gravados (`saved`), em cartões iguais
 * com os campos travados: a API não altera o que foi enviado, só exclui.
 * Editando, os dois ficam em grupos separados — "Para enviar", que sobem no
 * Salvar, e "Já na ficha" —, cada um com a sua paginação, e o novo diz "a
 * enviar" sob o nome. Lendo (`isReadOnly`), sai a zona e ninguém cola nem
 * arrasta; os gravados continuam abrindo e baixando.
 */

const PAGE_SIZE = 10;

const TYPE_OPTIONS = DOC_TYPES.map((type) => ({ id: type.key, label: type.label }));

const EMPTY: Record<FileKind, string> = {
  documents: "Nenhum documento adicionado.",
  simulations: "Nenhuma simulação adicionada.",
};

/** O que já está no servidor, na ficha. */
export type SavedFiles = {
  clientId: string;
  documents: readonly ClientFileDocumentResponse[];
  simulations: readonly ClientFileSimulationResponse[];
  /** Sem ele, o gravado só abre e baixa. */
  onDelete?: (fileId: string) => void;
};

type SavedFile = ClientFileDocumentResponse | ClientFileSimulationResponse;

/** A página de cada grupo, por aba: os novos e os já enviados andam sozinhos. */
type PageKey = `${FileKind}:${"staged" | "saved"}`;

type GroupHeading = { title: string; hint?: string; icon: ReactNode; iconClass: string };

/**
 * Os títulos dos dois grupos da ficha em edição: o ícone e a cor dizem de
 * longe qual é qual — dourado o que ainda vai subir, verde o que já subiu.
 */
const GROUP_HEADINGS: Record<"staged" | "saved", GroupHeading> = {
  staged: {
    title: "Para enviar",
    hint: "envio ao salvar",
    icon: <UploadIcon className="h-3.5 w-3.5" />,
    iconClass: "bg-light-secondary text-secondary",
  },
  saved: {
    title: "Já na ficha",
    icon: <CheckIcon className="h-3.5 w-3.5" />,
    iconClass: "bg-light-green text-success",
  },
};

const hasFiles = (event: DragEvent) =>
  [...event.dataTransfer?.types ?? []].includes("Files");

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

/** O convite da zona: soltar agora, arrastar o primeiro ou acrescentar. */
function dropTitle(isOver: boolean, isEmpty: boolean, what: string): string {
  if (isOver) return "Pode soltar";
  return isEmpty ? `Arraste ${what} para cá` : "Adicionar mais";
}

export function FilesUpload({
  showErrors,
  saved,
  isReadOnly = false,
  documentsAside,
  ...props
}: StagedFilesProps & {
  /** Mostra os campos que faltam — depois de tentar avançar ou salvar. */
  showErrors: boolean;
  /** Os arquivos já gravados (a ficha). */
  saved?: SavedFiles;
  /** A ficha em leitura: sem zona, sem colar nem arrastar. */
  isReadOnly?: boolean;
  /** Abaixo da lista de documentos — o catálogo do INSS, na ficha. */
  documentsAside?: ReactNode;
}) {
  const docs = useDocuments(props);
  const sims = useSimulations(props);
  const [kind, setKind] = useState<FileKind>("documents");
  const [pages, setPages] = useState<Partial<Record<PageKey, number>>>({});
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
    if (isReadOnly) return;
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
      addRef.current([...event.dataTransfer?.files ?? []]);
    };
    // Só cola quando há arquivo na área de transferência: texto colado num
    // campo continua indo para o campo.
    const onPaste = (event: ClipboardEvent) => {
      const files = [...event.clipboardData?.files ?? []];
      if (files.length === 0) return;
      event.preventDefault();
      addRef.current(files.map((item, index) => renamePasted(item, index)));
      setLastPasted(files.length);
    };
    globalThis.addEventListener("dragenter", onEnter);
    globalThis.addEventListener("dragleave", onLeave);
    globalThis.addEventListener("dragover", onOver);
    globalThis.addEventListener("drop", onDrop);
    globalThis.addEventListener("paste", onPaste);
    return () => {
      globalThis.removeEventListener("dragenter", onEnter);
      globalThis.removeEventListener("dragleave", onLeave);
      globalThis.removeEventListener("dragover", onOver);
      globalThis.removeEventListener("drop", onDrop);
      globalThis.removeEventListener("paste", onPaste);
    };
  }, [isReadOnly]);

  useEffect(() => {
    if (!lastPasted) return;
    const timer = globalThis.setTimeout(() => setLastPasted(0), 2500);
    return () => globalThis.clearTimeout(timer);
  }, [lastPasted]);

  const pendingDocs = docs.entries.filter(
    (entry) => Object.keys(documentErrors(entry.doc)).length > 0,
  ).length;
  const pendingSims = sims.entries.filter(
    (entry) => Object.keys(simulationErrors(entry.simulation)).length > 0,
  ).length;

  // Os gravados na ordem do enum, como os blocos de antes: o usuário procura
  // "Documentos médicos" no mesmo lugar toda vez.
  const savedDocuments = useMemo(
    () => groupByDocumentType(saved?.documents ?? []).flatMap((group) => group.items),
    [saved?.documents],
  );
  const savedSimulations = saved?.simulations ?? [];

  const counts: Record<FileKind, { count: number; pending: number }> = {
    documents: { count: docs.entries.length + savedDocuments.length, pending: pendingDocs },
    simulations: { count: sims.entries.length + savedSimulations.length, pending: pendingSims },
  };

  const words = FILE_KIND_WORDS[kind];
  const isEmpty = counts[kind].count === 0;
  const copy = dropCopy(kind);
  /** Só a ficha em edição tem os dois grupos ao mesmo tempo; nela, cada um diz o que é. */
  const isSplit = Boolean(saved) && !isReadOnly;
  const pageProps = (key: PageKey) => ({
    page: pages[key] ?? 1,
    onPageChange: (next: number) => setPages((current) => ({ ...current, [key]: next })),
  });

  const savedActions = (file: SavedFile) =>
    saved && <SavedFileActions clientId={saved.clientId} file={file} onDelete={saved.onDelete} />;

  /** A zona viva (soltar, clicar ou colar) e o aviso do colado — só editando. */
  const dropZone = (
    <>
      <button
        type="button"
        {...dropProps(add, setIsOver)}
        onClick={() => inputRef.current?.click()}
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
            {dropTitle(isOver, isEmpty, copy.title)}
          </span>
          <span className="block text-xs text-gray-100">
            ou clique para escolher · cole com <Kbd>Ctrl</Kbd> + <Kbd>V</Kbd> · {copy.hint}
          </span>
        </span>
      </button>

      <output className="sr-only">
        {lastPasted ? `${lastPasted} arquivo(s) colado(s)` : ""}
      </output>
      {lastPasted > 0 && (
        <p
          aria-hidden="true"
          className="self-start rounded-full bg-light-green px-3 py-1 text-xs font-medium text-success"
        >
          {lastPasted} colado{lastPasted === 1 ? "" : "s"} da área de transferência
        </p>
      )}
    </>
  );

  /** O corpo de uma aba: a zona viva, o aviso do colado, os novos e os gravados. */
  const panel = (tab: FileKind) => {
    const noun: [string, string] = [FILE_KIND_WORDS[tab].one, FILE_KIND_WORDS[tab].many];
    const heading = isSplit ? GROUP_HEADINGS : { staged: undefined, saved: undefined };
    return (
      <>
        {isReadOnly ? isEmpty && <Notice>{EMPTY[tab]}</Notice> : dropZone}

        {tab === "documents" ? (
          <>
            <FileGroup
              {...pageProps("documents:staged")}
              heading={heading.staged}
              label={`${FILE_KIND_WORDS[tab].label} novos`}
              rows={docs.entries}
              noun={noun}
              renderRow={(entry) => (
                <DocumentCard key={entry.id} entry={entry} showErrors={showErrors} docs={docs} isNew={isSplit} />
              )}
            />
            <FileGroup
              {...pageProps("documents:saved")}
              heading={heading.saved}
              label={FILE_KIND_WORDS[tab].label}
              rows={savedDocuments}
              noun={noun}
              renderRow={(file) => (
                <SavedDocumentCard key={file.id} file={file}>
                  {savedActions(file)}
                </SavedDocumentCard>
              )}
            />
          </>
        ) : (
          <>
            <FileGroup
              {...pageProps("simulations:staged")}
              heading={heading.staged}
              label={`${FILE_KIND_WORDS[tab].label} novas`}
              rows={sims.entries}
              noun={noun}
              renderRow={(entry) => (
                <SimulationCard key={entry.id} entry={entry} showErrors={showErrors} sims={sims} isNew={isSplit} />
              )}
            />
            <FileGroup
              {...pageProps("simulations:saved")}
              heading={heading.saved}
              label={FILE_KIND_WORDS[tab].label}
              rows={savedSimulations}
              noun={noun}
              renderRow={(file) => (
                <SavedSimulationCard key={file.id} file={file}>
                  {savedActions(file)}
                </SavedSimulationCard>
              )}
            />
          </>
        )}

        {tab === "documents" && documentsAside && <div className="mt-4">{documentsAside}</div>}
      </>
    );
  };

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

      {/* Um seletor só, fora dos painéis. Com um em cada zona, os dois
          dividiam o mesmo `inputRef`: trocando de aba, o painel que saía
          desmontava depois e zerava o ref — e clicar na zona não abria mais
          nada, nem em Simulações nem de volta em Documentos. */}
      {!isReadOnly && (
        <HiddenFileInput inputRef={inputRef} onFiles={add} accept={ACCEPTED_TYPES[kind].join(",")} />
      )}

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

/**
 * Um grupo de cartões com a sua paginação — os escolhidos agora ou os já
 * gravados. Vazio, não aparece; `heading` só na ficha em edição, quando os
 * dois grupos dividem a aba.
 */
function FileGroup<T>({
  heading,
  label,
  rows,
  noun,
  page,
  onPageChange,
  renderRow,
}: Readonly<{
  heading?: GroupHeading;
  /** O nome da lista para o leitor de tela. */
  label: string;
  rows: readonly T[];
  noun: [string, string];
  page: number;
  onPageChange: (page: number) => void;
  renderRow: (row: T) => ReactNode;
}>) {
  if (rows.length === 0) return null;
  const current = slicePage(rows, page, PAGE_SIZE);
  return (
    <div className="flex flex-col gap-3">
      {heading && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
          <span aria-hidden="true" className={`grid h-6 w-6 place-items-center rounded-full ${heading.iconClass}`}>
            {heading.icon}
          </span>
          <span className="font-semibold text-primary">{heading.title}</span>
          <span className="text-xs text-gray-100">
            {[plural(rows.length, ...noun), heading.hint].filter(Boolean).join(" · ")}
          </span>
        </p>
      )}
      <ul aria-label={label} className="flex flex-col gap-3">
        {current.slice.map(renderRow)}
      </ul>
      {rows.length > PAGE_SIZE && (
        <TablePagination
          pageNumber={current.current}
          pageSize={PAGE_SIZE}
          total={rows.length}
          totalPages={current.totalPages}
          onPageChange={onPageChange}
          noun={noun}
        />
      )}
    </div>
  );
}

/** Cabeçalho do cartão: miniatura, nome, tamanho e as ações do arquivo. */
function CardHeader({
  file,
  detail,
  children,
}: Readonly<{
  file: FileLike;
  detail?: string;
  children: ReactNode;
}>) {
  return (
    <div className="flex items-center gap-3">
      <FileThumb file={file} className="h-11 w-11" />
      <FileName file={file} detail={detail} />
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

const CARD_CLASS = "flex flex-col gap-4 rounded-3xl bg-white p-4 ring-1 ring-light-gray sm:p-5";

/**
 * A linha sob o nome do escolhido agora, na ficha: "44 KB · a enviar", o par
 * do "1.0 MB · enviado em 28/08/2026" dos gravados. Fora da ficha, só o tamanho.
 */
const stagedDetail = (file: File, isNew: boolean) =>
  isNew ? `${formatFileSize(file.size)} · a enviar` : undefined;

/**
 * O arquivo em si não sobe (formato, tamanho). Aparece assim que ele entra,
 * sem esperar o "Salvar": não há campo a preencher que resolva — é remover
 * ou trocar de lado.
 */
function FileProblem({ kind, file }: Readonly<{ kind: FileKind; file: File }>) {
  const message = fileError(kind, file);
  if (!message) return null;
  return (
    <p role="alert" className="-mt-2 text-xs font-medium text-danger">
      {message}
    </p>
  );
}

function DocumentCard({
  entry,
  showErrors,
  docs,
  isNew = false,
}: Readonly<{
  entry: DocEntry;
  showErrors: boolean;
  docs: ReturnType<typeof useDocuments>;
  isNew?: boolean;
}>) {
  const errors = showErrors ? documentErrors(entry.doc) : {};
  return (
    <li className={CARD_CLASS}>
      <CardHeader file={entry.file} detail={stagedDetail(entry.file, isNew)}>
        <WrongSideHint
          kind="documents"
          name={entry.file.name}
          onMove={() => docs.moveToSimulations(entry)}
        />
        <RemoveButton name={entry.file.name} onClick={() => docs.remove(entry)} />
      </CardHeader>
      <FileProblem kind="documents" file={entry.file} />
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
  isNew = false,
}: Readonly<{
  entry: SimulationEntry;
  showErrors: boolean;
  sims: ReturnType<typeof useSimulations>;
  isNew?: boolean;
}>) {
  const errors = showErrors ? simulationErrors(entry.simulation) : {};
  const { simulation, file } = entry;
  return (
    <li className={CARD_CLASS}>
      <CardHeader file={file} detail={stagedDetail(file, isNew)}>
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
      <FileProblem kind="simulations" file={file} />
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
            sims.update(entry, { vinculos: event.target.value.replaceAll(/\D/g, "") })
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

// ── Gravados (a ficha) ──

const fileLikeOf = (file: SavedFile): FileLike => ({
  name: file.originalFilename,
  type: file.mimeType,
  size: file.fileSizeBytes,
});

/** "120 KB · enviado em 03/10/2026" — o que houver. */
const savedDetail = (file: SavedFile) =>
  [
    file.fileSizeBytes ? formatFileSize(file.fileSizeBytes) : null,
    file.uploadedAt ? `enviado em ${formatDateBR(file.uploadedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/** A API devolve o rótulo do tipo; o select trabalha com a chave. */
const typeKeyOf = (label?: string) => DOC_TYPES.find((type) => type.label === label)?.key ?? null;

const ignore = () => {};

/** Abrir, baixar e (editando) excluir — sempre pela API, com o token. */
function SavedFileActions({
  clientId,
  file,
  onDelete,
}: Readonly<{
  clientId: string;
  file: SavedFile;
  onDelete?: (fileId: string) => void;
}>) {
  const load = () => downloadClientFile(clientId, file.id);
  // O erro da requisição já sai pela central; aqui só não deixa a promessa solta.
  return (
    <>
      <IconButton
        label="Visualizar"
        tone="primary"
        onClick={() => void openBlob(load, file.originalFilename).catch(ignore)}
      >
        <DetailsIcon />
      </IconButton>
      <IconButton
        label="Baixar"
        tone="secondary"
        onClick={() => void saveBlob(load, file.originalFilename).catch(ignore)}
      >
        <DownloadIcon />
      </IconButton>
      {onDelete && (
        <IconButton label="Excluir" tone="danger" onClick={() => onDelete(file.id)}>
          <TrashIcon />
        </IconButton>
      )}
    </>
  );
}

/**
 * O gravado no desenho do cartão de quem vai subir, com os campos travados —
 * `data-readonly` os deixa legíveis mesmo com a ficha em edição.
 */
function SavedCard({
  file,
  badge,
  actions,
  children,
}: Readonly<{
  file: SavedFile;
  badge?: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}>) {
  return (
    <li className={CARD_CLASS}>
      <CardHeader file={fileLikeOf(file)} detail={savedDetail(file)}>
        {badge}
        {actions}
      </CardHeader>
      <div data-readonly="">
        <FieldGrid columns={4}>{children}</FieldGrid>
      </div>
    </li>
  );
}

function SavedDocumentCard({
  file,
  children,
}: Readonly<{
  file: ClientFileDocumentResponse;
  children: ReactNode;
}>) {
  return (
    <SavedCard file={file} actions={children}>
      <SelectField
        className="sm:col-span-2"
        label="Tipo do documento"
        // Tipo fora do enum não some: aparece como veio.
        placeholder={file.documentType ?? "—"}
        options={TYPE_OPTIONS}
        selectedKey={typeKeyOf(file.documentType)}
        onSelectionChange={ignore}
        isDisabled
      />
      <Field
        className="sm:col-span-2"
        label="Observações"
        placeholder="—"
        value={file.notes ?? ""}
        onChange={ignore}
        isReadOnly
      />
    </SavedCard>
  );
}

function SavedSimulationCard({
  file,
  children,
}: Readonly<{
  file: ClientFileSimulationResponse;
  children: ReactNode;
}>) {
  return (
    <SavedCard
      file={file}
      badge={file.isPrincipal && <Pill tone="success">Principal</Pill>}
      actions={children}
    >
      <DatePickerField
        label="Data da simulação"
        value={file.simulationDate ?? ""}
        onChange={ignore}
        isDisabled
      />
      <Field label="Versão" placeholder="—" value={file.version ?? ""} onChange={ignore} isReadOnly />
      <Field
        label="Vínculos"
        placeholder="—"
        value={numberTextOf(file.vinculos)}
        onChange={ignore}
        isReadOnly
      />
      <Field
        label="Observações"
        placeholder="—"
        value={file.notes ?? ""}
        onChange={ignore}
        isReadOnly
      />
    </SavedCard>
  );
}
