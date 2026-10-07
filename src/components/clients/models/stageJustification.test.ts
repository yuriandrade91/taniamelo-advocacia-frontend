import { describe, expect, it } from "vitest";
import { MIN_JUSTIFICATION_LENGTH, justificationError } from "./stageJustification";

describe("justificationError", () => {
  it("vazia ou só espaços pede a justificativa", () => {
    expect(justificationError("")).toBe("Informe a justificativa.");
    expect(justificationError("    ")).toBe("Informe a justificativa.");
  });

  it("curta demais diz o mínimo; o mínimo exato já serve", () => {
    expect(justificationError("curto")).toMatch(String(MIN_JUSTIFICATION_LENGTH));
    expect(justificationError("a".repeat(MIN_JUSTIFICATION_LENGTH))).toBeUndefined();
  });

  it("conta sem os espaços das pontas", () => {
    expect(justificationError(`   ${"a".repeat(MIN_JUSTIFICATION_LENGTH - 1)}   `)).toBeDefined();
  });
});
