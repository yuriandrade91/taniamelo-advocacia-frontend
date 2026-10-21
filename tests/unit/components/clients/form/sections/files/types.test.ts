import { describe, expect, it } from "vitest";
import {
  ACCEPTED_TYPES,
  MAX_FILE_BYTES,
  documentErrors,
  fileError,
  isDocumentComplete,
  isSimulationComplete,
  newStagedDocument,
  newStagedSimulation,
  simulationErrors,
} from "@/components/clients/form/sections/files/types";

/**
 * As regras de um arquivo antes de subir.
 *
 * O formato e o tamanho existem por causa de um defeito real: a tela aceitava
 * qualquer arquivo, o backend recusava o lote inteiro (um print colado na aba
 * de simulações bastava) e a ficha dizia só "Nem todos os arquivos foram
 * enviados" — sem dizer qual, nem por quê.
 */

const file = (name: string, type: string, size = 1024) => {
  const made = new File(["x"], name, { type });
  Object.defineProperty(made, "size", { value: size });
  return made;
};

const pdf = () => file("laudo.pdf", "application/pdf");
const png = () => file("print.png", "image/png");

describe("fileError", () => {
  it("documento aceita PDF, PNG e JPEG — o que o backend aceita", () => {
    expect(fileError("documents", pdf())).toBeUndefined();
    expect(fileError("documents", png())).toBeUndefined();
    expect(fileError("documents", file("rg.jpg", "image/jpeg"))).toBeUndefined();
  });

  it("documento recusa outro formato, dizendo quais servem", () => {
    expect(fileError("documents", file("ficha.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).toBe(
      "Formato não aceito: envie PDF, PNG ou JPEG.",
    );
    expect(fileError("documents", file("foto.heic", "image/heic"))).toMatch(/Formato não aceito/);
  });

  it("simulação só aceita PDF: o print colado não passa", () => {
    expect(fileError("simulations", pdf())).toBeUndefined();
    expect(fileError("simulations", png())).toBe("Simulação só aceita PDF.");
  });

  it("arquivo sem tipo (o navegador não reconheceu) não passa", () => {
    expect(fileError("documents", file("sem-extensao", ""))).toMatch(/Formato não aceito/);
  });

  it("o tipo vale sem diferença de caixa", () => {
    expect(fileError("simulations", file("calc.pdf", "Application/PDF"))).toBeUndefined();
  });

  it("10 MB é o teto, em bytes binários como o Spring conta", () => {
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    expect(fileError("documents", file("a.pdf", "application/pdf", MAX_FILE_BYTES))).toBeUndefined();
    expect(fileError("documents", file("a.pdf", "application/pdf", MAX_FILE_BYTES + 1))).toBe("Arquivo acima de 10 MB.");
  });

  it("o formato errado é o que se diz primeiro, mesmo grande", () => {
    expect(fileError("simulations", file("a.png", "image/png", MAX_FILE_BYTES + 1))).toBe("Simulação só aceita PDF.");
  });

  it("os tipos aceitos servem de `accept` no seletor", () => {
    expect(ACCEPTED_TYPES.documents.join(",")).toBe("application/pdf,image/png,image/jpeg");
    expect(ACCEPTED_TYPES.simulations.join(",")).toBe("application/pdf");
  });
});

describe("documentErrors", () => {
  it("documento novo pede tipo e observações", () => {
    expect(documentErrors(newStagedDocument(pdf()))).toEqual({
      documentType: "Escolha o tipo do documento.",
      notes: "Descreva o documento.",
    });
  });

  it("observação só de espaços não conta", () => {
    const doc = { ...newStagedDocument(pdf()), documentType: "OUTROS", notes: "   " };
    expect(documentErrors(doc)).toEqual({ notes: "Descreva o documento." });
  });

  it("completo, sem erro", () => {
    const doc = { ...newStagedDocument(pdf()), documentType: "OUTROS", notes: "RG" };
    expect(documentErrors(doc)).toEqual({});
    expect(isDocumentComplete(doc)).toBe(true);
  });

  it("formato recusado deixa o documento incompleto, mesmo preenchido", () => {
    const doc = { ...newStagedDocument(file("a.docx", "application/msword")), documentType: "OUTROS", notes: "RG" };
    expect(documentErrors(doc)).toEqual({ file: "Formato não aceito: envie PDF, PNG ou JPEG." });
    expect(isDocumentComplete(doc)).toBe(false);
  });
});

const complete = (made: File) => ({
  ...newStagedSimulation(made),
  simulationDate: "2026-10-01",
  version: "2",
  vinculos: "3",
  notes: "cenário",
});

describe("simulationErrors", () => {

  it("simulação nova pede data, versão, vínculos e observações", () => {
    expect(Object.keys(simulationErrors(newStagedSimulation(pdf())))).toEqual([
      "simulationDate",
      "version",
      "vinculos",
      "notes",
    ]);
  });

  it("a principal não é obrigatória", () => {
    expect(simulationErrors(complete(pdf()))).toEqual({});
    expect(isSimulationComplete(complete(pdf()))).toBe(true);
  });

  it("PNG preenchido continua barrado: o Salvar não manda o lote ao 400", () => {
    expect(simulationErrors(complete(png()))).toEqual({ file: "Simulação só aceita PDF." });
    expect(isSimulationComplete(complete(png()))).toBe(false);
  });
});
