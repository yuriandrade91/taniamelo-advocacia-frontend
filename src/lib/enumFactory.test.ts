import { describe, expect, it } from "vitest";
import { createEnum } from "./enumFactory";
import {
  MARITAL_STATUS_ENTRIES,
  MaritalStatusOptions,
  getMaritalStatusKeyByLabel,
  getMaritalStatusLabelByKey,
} from "@/enums/maritalStatus/MaritalStatus";
import {
  SituationOptions,
  getSituationKeyByLabel,
} from "@/enums/situation/Situation";

const ENTRIES = [
  ["ALFA", "Alfa"],
  ["BETA", "Beta"],
] as const;

describe("createEnum", () => {
  const e = createEnum(ENTRIES);

  it("preserva a ordem das entradas em options", () => {
    expect(e.options).toEqual([
      { value: "ALFA", label: "Alfa" },
      { value: "BETA", label: "Beta" },
    ]);
  });

  it("gera id posicional 1-based em optionsWithId", () => {
    expect(e.optionsWithId).toEqual([
      { id: 1, value: "ALFA", label: "Alfa" },
      { id: 2, value: "BETA", label: "Beta" },
    ]);
  });

  it("options não carrega id — as duas formas são objetos distintos", () => {
    expect(e.options[0]).not.toHaveProperty("id");
    expect(e.options[0]).not.toBe(e.optionsWithId[0]);
  });

  it("monta os dois mapas em direções opostas", () => {
    expect(e.labelByKey).toEqual({ ALFA: "Alfa", BETA: "Beta" });
    expect(e.keyByLabel).toEqual({ Alfa: "ALFA", Beta: "BETA" });
  });

  it("faz o round-trip chave → label → chave", () => {
    for (const [key, label] of ENTRIES) {
      expect(e.getLabelByKey(key)).toBe(label);
      expect(e.getKeyByLabel(label)).toBe(key);
    }
  });

  it("devolve undefined para entrada ausente, vazia ou desconhecida", () => {
    expect(e.getKeyByLabel(undefined)).toBeUndefined();
    expect(e.getKeyByLabel("")).toBeUndefined();
    expect(e.getKeyByLabel("Gama")).toBeUndefined();
    expect(e.getLabelByKey(undefined)).toBeUndefined();
    // chave inexistente em runtime (o tipo já barra em tempo de compilação)
    expect(e.getLabelByKey("GAMA" as never)).toBeUndefined();
  });

  it("não confunde label com chave", () => {
    // a API devolve o label; quem passa o label para getLabelByKey erra
    expect(e.getLabelByKey("Alfa" as never)).toBeUndefined();
    expect(e.getKeyByLabel("ALFA")).toBeUndefined();
  });
});

/**
 * Contrato com o backend: os enums migrados para a fábrica precisam continuar
 * expondo exatamente o mesmo formato que as telas já consomem.
 */
describe("enums migrados", () => {
  it("MaritalStatusOptions mantém id, value e label", () => {
    expect(MaritalStatusOptions).toHaveLength(MARITAL_STATUS_ENTRIES.length);
    expect(MaritalStatusOptions[0]).toEqual({
      id: 1,
      value: "SOLTEIRO",
      label: "Solteiro(a)",
    });
  });

  it("MaritalStatus resolve nos dois sentidos", () => {
    expect(getMaritalStatusKeyByLabel("Viúvo(a)")).toBe("VIUVO");
    expect(getMaritalStatusLabelByKey("SEPARADO")).toBe("Separado(a)");
  });

  it("SituationOptions continua sem id", () => {
    expect(SituationOptions[0]).toEqual({
      value: "FORMULARIO_PREENCHIDO",
      label: "Formulário preenchido",
    });
    expect(getSituationKeyByLabel("Benefício concluído")).toBe(
      "BENEFICIO_CONCLUIDO",
    );
  });
});
