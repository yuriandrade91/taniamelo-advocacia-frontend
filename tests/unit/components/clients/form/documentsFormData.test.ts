import { describe, expect, it } from "vitest";
import {
  buildDocumentsFormData,
  buildSimulationsFormData,
} from "@/components/clients/form/documentsFormData";

/**
 * O corpo multipart do upload: N arquivos em `files` e, em `metadata`, uma
 * lista JSON na mesma ordem. `metadata` como texto (e não JSON) volta 415 do
 * Spring, sem apontar a causa.
 */

const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });

const metadataOf = async (form: FormData) => {
  const part = form.get("metadata") as Blob;
  return { type: part.type, value: JSON.parse(await part.text()) };
};

describe("buildDocumentsFormData", () => {
  it("um arquivo por parte `files`, na ordem, com o nome original", () => {
    const form = buildDocumentsFormData([
      { file: pdf("rg.pdf"), documentType: "IDENTIFICACAO_SEGURADO" },
      { file: pdf("laudo.pdf"), documentType: "DOCUMENTOS_MEDICOS" },
    ]);
    expect(form.getAll("files").map((file) => (file as File).name)).toEqual(["rg.pdf", "laudo.pdf"]);
  });

  it("`metadata` vai como JSON, na mesma ordem dos arquivos", async () => {
    const form = buildDocumentsFormData([
      { file: pdf("rg.pdf"), documentType: "IDENTIFICACAO_SEGURADO", notes: "  frente e verso " },
      { file: pdf("laudo.pdf"), documentType: "DOCUMENTOS_MEDICOS", notes: "   " },
    ]);
    expect(await metadataOf(form)).toEqual({
      type: "application/json",
      value: [
        { documentType: "IDENTIFICACAO_SEGURADO", notes: "frente e verso" },
        // Observação vazia não vai: o backend guardaria "".
        { documentType: "DOCUMENTOS_MEDICOS" },
      ],
    });
  });
});

describe("buildSimulationsFormData", () => {
  it("metadado da simulação: data, versão, vínculos e observações — sem a principal", async () => {
    const form = buildSimulationsFormData([
      { file: pdf("v1.pdf"), simulationDate: "2026-10-01", version: " 1 ", vinculos: 3, notes: "cenário" },
      { file: pdf("v2.pdf"), simulationDate: "", version: "", vinculos: Number.NaN, notes: "" },
    ]);
    const { type, value } = await metadataOf(form);
    expect(type).toBe("application/json");
    expect(value).toEqual([{ simulationDate: "2026-10-01", version: "1", vinculos: 3, notes: "cenário" }, {}]);
    expect(form.getAll("files")).toHaveLength(2);
  });

  it("zero vínculos é um valor, não ausência", async () => {
    const form = buildSimulationsFormData([{ file: pdf("v1.pdf"), vinculos: 0 }]);
    expect((await metadataOf(form)).value).toEqual([{ vinculos: 0 }]);
  });
});
