import { describe, expect, it } from "vitest";
import {
  countLabel,
  formatFileSize,
  groupByDocumentType,
  labelOfDocumentType,
  toDocumentRows,
  UNCLASSIFIED_LABEL,
} from "./fileGrouping";

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

describe("labelOfDocumentType", () => {
  it("converte a chave do enum no label", () => {
    expect(labelOfDocumentType("DOCUMENTOS_MEDICOS")).toBe("Documentos médicos");
  });

  it("chave desconhecida cai no rótulo de sem classificação", () => {
    expect(labelOfDocumentType("NAO_EXISTE")).toBe(UNCLASSIFIED_LABEL);
  });
});

describe("countLabel", () => {
  it("concorda em número", () => {
    expect(countLabel(1)).toBe("1 documento registrado");
    expect(countLabel(2)).toBe("2 documentos registrados");
    expect(countLabel(0)).toBe("0 documentos registrados");
  });

  it("aceita outro substantivo", () => {
    expect(countLabel(1, "simulação")).toBe("1 simulação registrado");
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

describe("toDocumentRows", () => {
  const file = (name: string) => ({ name }) as File;

  it("junta enviados e escolhidos numa lista só", () => {
    const rows = toDocumentRows(
      [{ id: "1", documentType: "Outros", originalFilename: "a.pdf", uploadedAt: "2026-02-14T10:00:00Z" }],
      [{ file: file("b.pdf"), documentType: "DOCUMENTOS_MEDICOS", notes: "" }],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].isStaged).toBe(false);
    expect(rows[1].isStaged).toBe(true);
  });

  it("converte a chave do enum no label para o que ainda não subiu", () => {
    const rows = toDocumentRows([], [
      { file: file("b.pdf"), documentType: "DOCUMENTOS_MEDICOS", notes: "" },
    ]);
    expect(rows[0].documentType).toBe("Documentos médicos");
  });

  it("o que não subiu não tem data nem link de download", () => {
    const rows = toDocumentRows([], [
      { file: file("b.pdf"), documentType: "OUTROS", notes: "" },
    ]);
    expect(rows[0].registeredAt).toBeUndefined();
    expect(rows[0].downloadUrl).toBeUndefined();
  });

  it("listas vazias não viram linha", () => {
    expect(toDocumentRows([], [])).toEqual([]);
  });
});
