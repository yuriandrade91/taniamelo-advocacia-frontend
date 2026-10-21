import { describe, expect, it, vi } from "vitest";
import {
  looksLikeOtherSide,
  // Com outro nome: apesar do `use`, não são hooks (ver abaixo), e o lint
  // de regras de hook não sabe disso.
  useDocuments as documentsOf,
  useSimulations as simulationsOf,
  type StagedFilesProps,
} from "@/components/clients/form/sections/files/upload/useStagedFiles";
import {
  newStagedDocument,
  newStagedSimulation,
  type StagedDocument,
  type StagedSimulation,
} from "@/components/clients/form/sections/files/types";

/**
 * Como a lista de arquivos escolhidos muda: o palpite pelo nome, trocar de
 * lado, a principal. `useDocuments`/`useSimulations` não usam hook do React —
 * só derivam e propõem a lista nova —, então dá para chamá-los direto.
 */

const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });

function setup(documents: StagedDocument[] = [], simulations: StagedSimulation[] = []) {
  const props: StagedFilesProps = {
    documents,
    simulations,
    onDocumentsChange: vi.fn(),
    onSimulationsChange: vi.fn(),
  };
  return {
    props,
    docs: documentsOf(props),
    sims: simulationsOf(props),
    /** A última lista proposta de cada lado. */
    lastDocuments: () => vi.mocked(props.onDocumentsChange).mock.lastCall?.[0],
    lastSimulations: () => vi.mocked(props.onSimulationsChange).mock.lastCall?.[0],
  };
}

describe("documentos", () => {
  it("o tipo sai do nome do arquivo", () => {
    const { docs, lastDocuments } = setup();
    docs.add([pdf("RG-frente.pdf"), pdf("laudo_ortopedico.pdf"), pdf("CNIS 2024.pdf"), pdf("certidao de casamento.pdf")]);
    expect(lastDocuments()?.map((doc) => doc.documentType)).toEqual([
      "IDENTIFICACAO_SEGURADO",
      "DOCUMENTOS_MEDICOS",
      "VINCULO_TEMPO_CONTRIBUICAO",
      "DEPENDENTES_RELACAO_FAMILIAR",
    ]);
  });

  it("sem palpite, fica sem tipo e a pessoa escolhe", () => {
    const { docs, lastDocuments } = setup();
    docs.add([pdf("scan0001.pdf")]);
    expect(lastDocuments()?.[0].documentType).toBe("");
  });

  it("acrescenta aos que já estavam, sem trocar a ordem", () => {
    const first = newStagedDocument(pdf("a.pdf"));
    const { docs, lastDocuments } = setup([first]);
    docs.add([pdf("b.pdf")]);
    expect(lastDocuments()?.map((doc) => doc.file.name)).toEqual(["a.pdf", "b.pdf"]);
    expect(lastDocuments()?.[0]).toBe(first);
  });

  it("nada escolhido (seletor cancelado) não muda a lista", () => {
    const { docs, props } = setup();
    docs.add([]);
    expect(props.onDocumentsChange).not.toHaveBeenCalled();
  });

  it("o mesmo arquivo tem sempre o mesmo id — a chave do cartão não muda a cada render", () => {
    const doc = newStagedDocument(pdf("a.pdf"));
    expect(setup([doc]).docs.entries[0].id).toBe(setup([{ ...doc, notes: "x" }]).docs.entries[0].id);
    expect(setup([doc]).docs.entries[0].id).not.toBe(setup([newStagedDocument(pdf("a.pdf"))]).docs.entries[0].id);
  });

  it("tipo e observação mudam só o cartão dele", () => {
    const a = newStagedDocument(pdf("a.pdf"));
    const b = newStagedDocument(pdf("b.pdf"));
    const { docs, lastDocuments } = setup([a, b]);
    docs.setType(docs.entries[1], "OUTROS");
    expect(lastDocuments()?.map((doc) => doc.documentType)).toEqual(["", "OUTROS"]);
    docs.setNotes(docs.entries[0], "RG");
    expect(lastDocuments()?.map((doc) => doc.notes)).toEqual(["RG", ""]);
  });

  it("remover tira só ele", () => {
    const { docs, lastDocuments } = setup([newStagedDocument(pdf("a.pdf")), newStagedDocument(pdf("b.pdf"))]);
    docs.remove(docs.entries[0]);
    expect(lastDocuments()?.map((doc) => doc.file.name)).toEqual(["b.pdf"]);
  });

  it("mover para simulações: sai daqui e entra lá, com a versão do nome", () => {
    const { docs, lastDocuments, lastSimulations } = setup([newStagedDocument(pdf("simulacao v3.pdf"))]);
    docs.moveToSimulations(docs.entries[0]);
    expect(lastDocuments()).toEqual([]);
    expect(lastSimulations()).toEqual([expect.objectContaining({ version: "3", isPrincipal: false })]);
  });
});

describe("simulações", () => {
  it("a versão sai do nome (v2, versão 3)", () => {
    const { sims, lastSimulations } = setup();
    sims.add([pdf("simulacao-v2.pdf"), pdf("calculo versão 3.pdf"), pdf("calculo.pdf")]);
    expect(lastSimulations()?.map((item) => item.version)).toEqual(["2", "3", ""]);
  });

  it("principal é uma só: marcar uma desmarca as outras", () => {
    const { sims, lastSimulations } = setup([], [
      { ...newStagedSimulation(pdf("a.pdf")), isPrincipal: true },
      newStagedSimulation(pdf("b.pdf")),
    ]);
    sims.setPrincipal(sims.entries[1]);
    expect(lastSimulations()?.map((item) => item.isPrincipal)).toEqual([false, true]);
  });

  it("entrando uma principal, as que estavam deixam de ser", () => {
    const { sims, lastSimulations } = setup([], [{ ...newStagedSimulation(pdf("a.pdf")), isPrincipal: true }]);
    sims.add([pdf("b.pdf")], { isPrincipal: true });
    expect(lastSimulations()?.map((item) => item.isPrincipal)).toEqual([false, true]);
  });

  it("entrando sem principal, a que estava continua", () => {
    const { sims, lastSimulations } = setup([], [{ ...newStagedSimulation(pdf("a.pdf")), isPrincipal: true }]);
    sims.add([pdf("b.pdf")]);
    expect(lastSimulations()?.map((item) => item.isPrincipal)).toEqual([true, false]);
  });

  it("atualizar muda só o cartão dele", () => {
    const { sims, lastSimulations } = setup([], [newStagedSimulation(pdf("a.pdf")), newStagedSimulation(pdf("b.pdf"))]);
    sims.update(sims.entries[0], { vinculos: "4" });
    expect(lastSimulations()?.map((item) => item.vinculos)).toEqual(["4", ""]);
  });

  it("mover para documentos: sai daqui e entra lá, com o tipo do nome", () => {
    const { sims, lastDocuments, lastSimulations } = setup([], [newStagedSimulation(pdf("laudo.pdf"))]);
    sims.moveToDocuments(sims.entries[0]);
    expect(lastSimulations()).toEqual([]);
    expect(lastDocuments()).toEqual([expect.objectContaining({ documentType: "DOCUMENTOS_MEDICOS" })]);
  });
});

describe("looksLikeOtherSide", () => {
  it("'simulação' na lista de documentos sugere mover", () => {
    expect(looksLikeOtherSide("documents", "Simulação INSS.pdf")).toBe(true);
    expect(looksLikeOtherSide("documents", "laudo.pdf")).toBe(false);
  });

  it("nome de documento na lista de simulações sugere mover", () => {
    expect(looksLikeOtherSide("simulations", "laudo.pdf")).toBe(true);
    expect(looksLikeOtherSide("simulations", "calculo-v2.pdf")).toBe(false);
  });
});
