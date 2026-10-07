import { describe, expect, it } from "vitest";
import { sectionHasInput } from "./unsaved";

const initial = { name: "", city: "", isPrimary: true };

describe("sectionHasInput", () => {
  it("formulário intocado não tem o que perder", () => {
    expect(sectionHasInput({ ...initial }, initial)).toBe(false);
  });

  it("valor que nasce preenchido não conta como digitado", () => {
    const comPadrao = { ...initial, situation: "Em análise" };
    expect(sectionHasInput({ ...comPadrao }, comPadrao)).toBe(false);
  });

  it("texto digitado conta; só espaços, não", () => {
    expect(sectionHasInput({ ...initial, name: "Maria" }, initial)).toBe(true);
    expect(sectionHasInput({ ...initial, name: "   " }, initial)).toBe(false);
  });

  it("chave trocada conta", () => {
    expect(sectionHasInput({ ...initial, isPrimary: false }, initial)).toBe(true);
  });
});
