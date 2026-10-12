import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  groupByDocumentType,
  UNCLASSIFIED_LABEL,
} from "@/components/clients/form/sections/files/fileGrouping";

const doc = (documentType?: string, id = documentType) => ({ documentType, id });

describe("groupByDocumentType", () => {
  it("agrupa por tipo", () => {
    const groups = groupByDocumentType([
      doc("Outros", "a"),
      doc("Outros", "b"),
      doc("Documentos médicos", "c"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.type === "Outros")?.items).toHaveLength(2);
  });

  it("usa a ordem do enum, não a de chegada", () => {
    // "Documentos médicos" vem antes de "Outros" no enum, mesmo chegando depois.
    const groups = groupByDocumentType([doc("Outros"), doc("Documentos médicos")]);
    expect(groups.map((g) => g.type)).toEqual([
      "Documentos médicos",
      "Outros",
    ]);
  });

  it("não cria grupo vazio para os 11 tipos", () => {
    expect(groupByDocumentType([doc("Outros")])).toHaveLength(1);
  });

  it("tipo desconhecido vira grupo próprio, no fim", () => {
    const groups = groupByDocumentType([doc("Tipo Inventado"), doc("Outros")]);
    expect(groups.map((g) => g.type)).toEqual(["Outros", "Tipo Inventado"]);
  });

  it("arquivo sem tipo não some da tela", () => {
    const groups = groupByDocumentType([doc(undefined, "x")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe(UNCLASSIFIED_LABEL);
  });

  it("lista vazia não vira grupo", () => {
    expect(groupByDocumentType([])).toEqual([]);
  });
});

describe("formatFileSize", () => {
  it("escala a unidade", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("ausente ou zero vira travessão", () => {
    expect(formatFileSize(undefined)).toBe("—");
    expect(formatFileSize(0)).toBe("—");
  });
});
