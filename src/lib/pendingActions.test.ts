import { describe, expect, it } from "vitest";
import {
  applyPendingOverlay,
  applyPendingTotal,
  type PendingKind,
  type PendingMap,
} from "./pendingActions";

const LABELS = { complete: "Concluído", cancel: "Cancelado" };

const items = [
  { id: "a", status: "Agendado" },
  { id: "b", status: "Agendado" },
  { id: "c", status: "Agendado" },
];

const mapOf = (entries: [string, PendingKind][]): PendingMap =>
  new Map(entries);

describe("applyPendingOverlay", () => {
  it("devolve a mesma lista quando não há nada pendente", () => {
    expect(applyPendingOverlay(items, mapOf([]), LABELS)).toBe(items);
  });

  it("some com o item que tem exclusão agendada", () => {
    const result = applyPendingOverlay(items, mapOf([["b", "delete"]]), LABELS);
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("reescreve o status de conclusão e cancelamento agendados", () => {
    const result = applyPendingOverlay(
      items,
      mapOf([
        ["a", "complete"],
        ["c", "cancel"],
      ]),
      LABELS,
    );
    expect(result).toEqual([
      { id: "a", status: "Concluído" },
      { id: "b", status: "Agendado" },
      { id: "c", status: "Cancelado" },
    ]);
  });

  it("não muta a entrada", () => {
    const original = JSON.parse(JSON.stringify(items));
    applyPendingOverlay(items, mapOf([["a", "complete"]]), LABELS);
    expect(items).toEqual(original);
  });

  it("preserva a identidade dos itens não afetados", () => {
    const result = applyPendingOverlay(items, mapOf([["a", "complete"]]), LABELS);
    // `b` e `c` continuam sendo os MESMOS objetos — importa para memoização.
    expect(result[1]).toBe(items[1]);
    expect(result[2]).toBe(items[2]);
    expect(result[0]).not.toBe(items[0]);
  });

  it("ignora chave pendente que não está nesta página", () => {
    const result = applyPendingOverlay(items, mapOf([["zzz", "delete"]]), LABELS);
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("applyPendingTotal", () => {
  it("desconta só as exclusões, não conclusões nem cancelamentos", () => {
    const pending = mapOf([
      ["a", "delete"],
      ["b", "complete"],
      ["c", "cancel"],
    ]);
    expect(applyPendingTotal(47, items, pending)).toBe(46);
  });

  it("não desconta exclusão agendada de item fora desta página", () => {
    expect(applyPendingTotal(47, items, mapOf([["zzz", "delete"]]))).toBe(47);
  });

  it("nunca fica negativo", () => {
    expect(applyPendingTotal(1, items, mapOf([
      ["a", "delete"],
      ["b", "delete"],
    ]))).toBe(0);
  });

  it("é identidade quando não há pendências", () => {
    expect(applyPendingTotal(47, items, mapOf([]))).toBe(47);
  });
});
