import { describe, expect, it } from "vitest";
import { ELLIPSIS, buildPageList, clampPage, pageRange } from "./pagination";

describe("buildPageList", () => {
  it("lista todas as páginas quando cabem sem reticências", () => {
    expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("insere reticências à direita quando a página atual está no início", () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, ELLIPSIS, 20]);
  });

  it("insere reticências dos dois lados quando a atual está no meio", () => {
    expect(buildPageList(10, 20)).toEqual([
      1,
      ELLIPSIS,
      9,
      10,
      11,
      ELLIPSIS,
      20,
    ]);
  });

  it("insere reticências à esquerda quando a atual está no fim", () => {
    expect(buildPageList(20, 20)).toEqual([1, ELLIPSIS, 19, 20]);
  });

  it("não duplica páginas quando a vizinhança encosta nas bordas", () => {
    const pages = buildPageList(2, 20);
    const numbers = pages.filter((p): p is number => typeof p === "number");
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("devolve lista vazia para zero páginas", () => {
    expect(buildPageList(1, 0)).toEqual([]);
  });

  it("nunca produz reticências entre páginas consecutivas", () => {
    for (let current = 1; current <= 30; current++) {
      const pages = buildPageList(current, 30);
      pages.forEach((entry, i) => {
        if (entry !== ELLIPSIS) return;
        const before = pages[i - 1] as number;
        const after = pages[i + 1] as number;
        // Reticências só fazem sentido se houver ao menos uma página oculta.
        expect(after - before).toBeGreaterThan(1);
      });
    }
  });
});

describe("pageRange", () => {
  it("calcula o intervalo da primeira página", () => {
    expect(pageRange(1, 10, 47)).toEqual({ start: 1, end: 10 });
  });

  it("calcula o intervalo de uma página do meio", () => {
    expect(pageRange(3, 10, 47)).toEqual({ start: 21, end: 30 });
  });

  it("trunca o fim na última página incompleta", () => {
    expect(pageRange(5, 10, 47)).toEqual({ start: 41, end: 47 });
  });

  it("devolve zeros quando não há registros", () => {
    expect(pageRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("clampPage", () => {
  it("mantém a página dentro do intervalo válido", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(3, 5)).toBe(3);
    expect(clampPage(9, 5)).toBe(5);
  });

  it("devolve 1 quando não há páginas", () => {
    expect(clampPage(3, 0)).toBe(1);
  });
});
