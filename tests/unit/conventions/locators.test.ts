import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A trava da regra de localizadores (`docs/TESTING.md`): os e2e acham os
 * elementos por papel e nome, que é o que a pessoa vê, e `data-testid` é
 * exceção com justificativa escrita.
 *
 * O valor não é proibir — é obrigar a escrever a frase. Quem precisa mesmo
 * escreve em dez segundos aqui; quem estava só com pressa desiste.
 */
const ALLOWED: Record<string, string> = {
  // "caminho/do/Componente.tsx": "por que este elemento não é alcançável por papel e nome",
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

describe("localizadores", () => {
  it("todo data-testid tem justificativa escrita", () => {
    const withTestId = sourceFiles("src")
      .filter((file) => readFileSync(file, "utf8").includes("data-testid"))
      .map((file) => file.replace(/\\/g, "/"));
    expect(withTestId.filter((file) => !(file in ALLOWED))).toEqual([]);
  });
});
