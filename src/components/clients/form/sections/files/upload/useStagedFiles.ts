"use client";

import {
  DOCUMENT_TYPE_ENTRIES,
  type DocumentTypeKey,
} from "@/enums/documentType/DocumentType";
import {
  newStagedDocument,
  newStagedSimulation,
  type FileKind,
  type StagedDocument,
  type StagedSimulation,
} from "../types";

/**
 * Os arquivos que o cadastro vai enviar, antes de existir o cliente
 * (`FilesUpload`): como entram (com palpite de tipo e versão pelo nome) e o
 * que se faz com eles (classificar, remover, trocar de lado).
 *
 * A lista continua morando na página (`stagedDocuments`/`stagedSimulations`)
 * — aqui só se decide como ela muda.
 *
 * **Documentos e simulações ficam separados**: são dois recursos do backend
 * (`/files/documents` e `/files/simulations`), com metadados diferentes.
 * Arquivo que parece ser do outro lado ganha um aviso "mover", nunca muda
 * sozinho.
 */

export type StagedFilesProps = {
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

type DocType = DocumentTypeKey | "";

const normalize = (text: string) =>
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

function guessDocType(name: string): DocType {
  const text = normalize(name);
  return GUESSES.find(([pattern]) => pattern.test(text))?.[1] ?? "";
}

/** O nome diz "simulação"/"cálculo" — talvez esteja do lado errado. */
const looksLikeSimulation = (name: string) =>
  /\b(simulacao|simulac|calculo|planejamento previdenciario)/.test(
    normalize(name),
  );

/**
 * O nome sugere o outro lado — "simulação" na lista de documentos, ou o
 * contrário? É sugestão (o aviso "mover"), nunca mudança automática: o nome
 * pode enganar.
 */
export const looksLikeOtherSide = (kind: FileKind, name: string): boolean =>
  kind === "documents" ? looksLikeSimulation(name) : !looksLikeSimulation(name) && guessDocType(name) !== "";

/** Versão escrita no nome ("v2", "versao 3"), para já preencher. */
const guessVersion = (name: string) =>
  normalize(name).match(/\b(?:v|versao )(\d+)\b/)?.[1] ?? "";

const ids = new WeakMap<File, string>();
let nextId = 0;
const idOf = (file: File) => {
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
export type SimulationEntry = { id: string; file: File; simulation: StagedSimulation };

/** Os documentos escolhidos e as operações sobre eles. */
export function useDocuments({
  documents,
  simulations,
  onDocumentsChange,
  onSimulationsChange,
}: StagedFilesProps) {
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
}: StagedFilesProps) {
  const entries: SimulationEntry[] = simulations.map((simulation) => ({
    id: idOf(simulation.file),
    file: simulation.file,
    simulation: simulation,
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
    const current = added.some((simulation) => simulation.isPrincipal)
      ? simulations.map((simulation) => ({ ...simulation, isPrincipal: false }))
      : simulations;
    onSimulationsChange([...current, ...added]);
  };

  const updateMany = (
    targets: readonly SimulationEntry[],
    patch: Partial<StagedSimulation>,
  ) => {
    const files = new Set(targets.map((entry) => entry.file));
    onSimulationsChange(
      simulations.map((simulation) =>
        files.has(simulation.file) ? { ...simulation, ...patch } : simulation,
      ),
    );
  };

  /** Principal é escolha ENTRE as simulações, como o endereço principal. */
  const setPrincipal = (entry: SimulationEntry) =>
    onSimulationsChange(
      simulations.map((simulation) => ({
        ...simulation,
        isPrincipal: simulation.file === entry.file,
      })),
    );

  const removeMany = (targets: readonly SimulationEntry[]) => {
    const files = new Set(targets.map((entry) => entry.file));
    onSimulationsChange(simulations.filter((simulation) => !files.has(simulation.file)));
  };
  const remove = (entry: SimulationEntry) => removeMany([entry]);

  /** O arquivo era documento: sai daqui e entra do outro lado. */
  const moveToDocuments = (entry: SimulationEntry) => {
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
    update: (entry: SimulationEntry, patch: Partial<StagedSimulation>) =>
      updateMany([entry], patch),
    updateMany,
    setPrincipal,
    remove,
    removeMany,
    moveToDocuments,
  };
}
