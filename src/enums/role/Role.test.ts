import { describe, expect, it } from "vitest";

import { ROLE_ENTRIES, getRoleLabel } from "./Role";

/**
 * Os papéis precisam ser exatamente os do backend (`model/Role.java`), porque
 * é por esse nome que `lib/permissions` decide o que a tela oferece. Este
 * arquivo já declarou `Admin`/`Assistant`, que não existiam em lugar nenhum.
 */
describe("papéis", () => {
  it("são os três do backend, com esta grafia", () => {
    expect(ROLE_ENTRIES.map(([chave]) => chave)).toEqual([
      "ADMIN",
      "LAWYER",
      "STAFF",
    ]);
  });

  it("cada um tem rótulo em português para exibição", () => {
    expect(getRoleLabel("ADMIN")).toBe("Administrador");
    expect(getRoleLabel("LAWYER")).toBe("Advogado");
    expect(getRoleLabel("STAFF")).toBe("Atendente");
  });

  /**
   * Papel novo no backend aparece cru na tela, em vez de sumir atrás de um
   * travessão. Um valor estranho visível é um defeito que alguém reporta; um
   * travessão é um defeito que ninguém vê.
   */
  it("papel desconhecido volta como veio", () => {
    expect(getRoleLabel("PARALEGAL")).toBe("PARALEGAL");
  });

  it("sem papel mostra travessão", () => {
    expect(getRoleLabel(undefined)).toBe("—");
    expect(getRoleLabel("")).toBe("—");
  });
});
