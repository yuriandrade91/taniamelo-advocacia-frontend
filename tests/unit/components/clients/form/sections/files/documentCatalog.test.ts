import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPE_ENTRIES, type DocumentTypeKey } from "@/enums/documentType/DocumentType";
import { DOCUMENT_CATALOG, itemsOfCategory, totalItems } from "@/components/clients/form/sections/files/documentCatalog";

describe("catálogo de documentos", () => {
  it("só usa chaves que existem no enum do backend", () => {
    const valid = new Set(DOCUMENT_TYPE_ENTRIES.map(([key]) => key));
    for (const key of Object.keys(DOCUMENT_CATALOG)) {
      expect(valid.has(key as DocumentTypeKey)).toBe(true);
    }
  });

  it("cobre as 10 categorias, deixando OUTROS de fora", () => {
    expect(Object.keys(DOCUMENT_CATALOG)).toHaveLength(10);
    expect(DOCUMENT_CATALOG.OUTROS).toBeUndefined();
  });

  it("não tem categoria vazia — uma lista sem itens não ajudaria ninguém", () => {
    for (const key of Object.keys(DOCUMENT_CATALOG) as DocumentTypeKey[]) {
      expect(totalItems(key)).toBeDefined();
      expect(itemsOfCategory(key).length > 0).toBe(true);
    }
  });

  it("não repete item dentro da mesma categoria", () => {
    for (const key of Object.keys(DOCUMENT_CATALOG) as DocumentTypeKey[]) {
      const itens = itemsOfCategory(key);
      expect(new Set(itens).size).toBe(itens.length);
    }
  });

  it("guarda os requisitos onde o indeferimento costuma nascer", () => {
    // PPP sem agente nocivo e laudo sem prazo são os dois casos clássicos.
    expect(DOCUMENT_CATALOG.ATIVIDADE_ESPECIAL?.requisitos).toContain("agente nocivo");
    expect(DOCUMENT_CATALOG.DOCUMENTOS_MEDICOS?.requisitos).toContain("a duração");
  });

  it("devolve lista vazia para categoria sem catálogo", () => {
    expect(itemsOfCategory("OUTROS")).toEqual([]);
    expect(totalItems("OUTROS")).toBe(0);
  });
});
