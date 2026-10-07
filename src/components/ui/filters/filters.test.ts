import { describe, expect, it, vi } from "vitest";
import { defineFilters, emptyFilters, filterChips, hasActiveFilters, periodLabel } from "./filters";

const schema = defineFilters({
  search: { kind: "search", label: "Pesquisar", placeholder: "…" },
  status: {
    kind: "select",
    label: "Status",
    placeholder: "Todos",
    options: [
      { id: "overdue", label: "Atrasado" },
      { id: "paid", label: "Recebido" },
    ],
  },
  method: {
    kind: "multi",
    label: "Forma",
    placeholder: "Todas",
    options: [
      { id: "PIX", label: "Pix" },
      { id: "BOLETO", label: "Boleto" },
    ],
  },
  period: { kind: "dateRange", label: "Período" },
});

describe("emptyFilters", () => {
  it("o vazio de cada tipo", () => {
    expect(emptyFilters(schema)).toEqual({ search: "", status: "", method: [], period: { from: "", to: "" } });
  });
});

describe("hasActiveFilters", () => {
  const empty = emptyFilters(schema);

  it("nada marcado: sem filtro; busca só de espaços também não conta", () => {
    expect(hasActiveFilters(schema, empty)).toBe(false);
    expect(hasActiveFilters(schema, { ...empty, search: "   " })).toBe(false);
  });

  it("qualquer campo marcado conta — inclusive a busca antes do debounce", () => {
    expect(hasActiveFilters(schema, { ...empty, search: "ana" })).toBe(true);
    expect(hasActiveFilters(schema, { ...empty, method: ["PIX"] })).toBe(true);
    expect(hasActiveFilters(schema, { ...empty, period: { from: "2026-01-01", to: "" } })).toBe(true);
  });

  it("ativo é diferente do padrão da tela, não de vazio (a Agenda nasce filtrada)", () => {
    const defaults = { ...empty, status: "overdue" };
    expect(hasActiveFilters(schema, defaults, defaults)).toBe(false);
    expect(hasActiveFilters(schema, empty, defaults)).toBe(true);
  });
});

describe("filterChips", () => {
  it("um chip por valor, com o rótulo da opção; a busca nunca vira chip", () => {
    const values = {
      search: "ana",
      status: "paid",
      method: ["PIX", "BOLETO"],
      period: { from: "2026-01-01", to: "2026-01-31" },
    };
    const labels = filterChips(schema, values, () => undefined).map((chip) => chip.label);
    expect(labels).toEqual(["Recebido", "Pix", "Boleto", "01/01/2026 – 31/01/2026"]);
  });

  it("remover um chip tira só aquele valor", () => {
    const onChange = vi.fn();
    const values = { ...emptyFilters(schema), status: "paid", method: ["PIX", "BOLETO"] };
    const chips = filterChips(schema, values, onChange);
    chips.find((chip) => chip.label === "Pix")!.remove();
    expect(onChange).toHaveBeenLastCalledWith({ ...values, method: ["BOLETO"] });
    chips.find((chip) => chip.label === "Recebido")!.remove();
    expect(onChange).toHaveBeenLastCalledWith({ ...values, status: "" });
  });
});

describe("periodLabel", () => {
  it("as duas pontas, só uma, ou nenhuma", () => {
    expect(periodLabel({ from: "2026-03-01", to: "2026-03-31" })).toBe("01/03/2026 – 31/03/2026");
    expect(periodLabel({ from: "2026-03-01", to: "" })).toBe("A partir de 01/03/2026");
    expect(periodLabel({ from: "", to: "2026-03-31" })).toBe("Até 31/03/2026");
    expect(periodLabel({ from: "", to: "" })).toBeNull();
  });
});
