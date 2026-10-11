import { describe, expect, it } from "vitest";
import { CalendarDate } from "@internationalized/date";
import {
  EMPTY_CLIENT_FILTERS,
  INVERTED_RANGE_MESSAGE,
  dateRangeError,
  hasActiveClientFilters,
  sameFilterValues,
  toApiDate,
  toClientListParams,
} from "@/components/clients/list/clientFilters";

const day = (y: number, m: number, d: number) => new CalendarDate(y, m, d);
const { search: _ignored, ...EMPTY_WITHOUT_SEARCH } = EMPTY_CLIENT_FILTERS;
void _ignored;

describe("toApiDate", () => {
  it("manda o dia puro, sem hora nem fuso", () => {
    // Antes ia como meia-noite UTC — em UTC-3, o último dia do período ficava
    // quase todo de fora. O backend resolve o dia no fuso do escritório.
    expect(toApiDate(day(2026, 10, 3))).toBe("2026-10-03");
    expect(toApiDate(day(2026, 1, 9))).toBe("2026-01-09");
  });
});

describe("dateRangeError", () => {
  it("período incompleto ou vazio não é erro", () => {
    expect(dateRangeError(null)).toBeNull();
  });

  it("início depois do fim é erro; o mesmo dia não é", () => {
    expect(dateRangeError({ start: day(2026, 10, 5), end: day(2026, 10, 1) })).toBe(
      INVERTED_RANGE_MESSAGE,
    );
    expect(dateRangeError({ start: day(2026, 10, 1), end: day(2026, 10, 1) })).toBeNull();
  });
});

describe("toClientListParams", () => {
  it("sem filtro, sem parâmetro — nada de lista vazia na query", () => {
    expect(toClientListParams(EMPTY_WITHOUT_SEARCH, "")).toEqual({});
  });

  it("busca entra aparada; só espaços não vira busca", () => {
    expect(toClientListParams(EMPTY_WITHOUT_SEARCH, "  Maria ")).toEqual({ searchTerm: "Maria" });
    expect(toClientListParams(EMPTY_WITHOUT_SEARCH, "   ")).toEqual({});
  });

  it("listas vão como estão, sem chaves vazias", () => {
    expect(
      toClientListParams(
        {
          ...EMPTY_WITHOUT_SEARCH,
          benefitType: ["APOSENTADORIA_POR_IDADE", ""],
          situation: ["ANALISE_DOCUMENTAL"],
          clientType: ["POTENCIAL"],
        },
        "",
      ),
    ).toEqual({
      benefitType: ["APOSENTADORIA_POR_IDADE"],
      situation: ["ANALISE_DOCUMENTAL"],
      clientType: ["POTENCIAL"],
    });
  });

  it("isenção vai como booleano — inclusive o false, que é filtro; null não vai", () => {
    expect(toClientListParams({ ...EMPTY_WITHOUT_SEARCH, notBillable: true }, "")).toEqual({ notBillable: true });
    expect(toClientListParams({ ...EMPTY_WITHOUT_SEARCH, notBillable: false }, "")).toEqual({ notBillable: false });
    expect(toClientListParams({ ...EMPTY_WITHOUT_SEARCH, notBillable: null }, "")).toEqual({});
  });

  it("período válido vira createdFrom/createdTo em dia puro", () => {
    expect(
      toClientListParams(
        { ...EMPTY_WITHOUT_SEARCH, dateRange: { start: day(2026, 9, 1), end: day(2026, 9, 30) } },
        "",
      ),
    ).toEqual({ createdFrom: "2026-09-01", createdTo: "2026-09-30" });
  });

  it("período invertido não vai para a API", () => {
    expect(
      toClientListParams(
        { ...EMPTY_WITHOUT_SEARCH, dateRange: { start: day(2026, 9, 30), end: day(2026, 9, 1) } },
        "",
      ),
    ).toEqual({});
  });
});

describe("hasActiveClientFilters", () => {
  it("nada marcado, nada a limpar", () => {
    expect(hasActiveClientFilters(EMPTY_CLIENT_FILTERS)).toBe(false);
  });

  it("qualquer filtro — inclusive a busca ainda sem debounce — conta", () => {
    expect(hasActiveClientFilters({ ...EMPTY_CLIENT_FILTERS, search: "a" })).toBe(true);
    expect(hasActiveClientFilters({ ...EMPTY_CLIENT_FILTERS, situation: ["X"] })).toBe(true);
    expect(hasActiveClientFilters({ ...EMPTY_CLIENT_FILTERS, notBillable: false })).toBe(true);
    expect(
      hasActiveClientFilters({
        ...EMPTY_CLIENT_FILTERS,
        dateRange: { start: day(2026, 1, 1), end: day(2026, 1, 2) },
      }),
    ).toBe(true);
  });
});

describe("sameFilterValues", () => {
  const base = {
    ...EMPTY_CLIENT_FILTERS,
    clientType: ["POTENCIAL"],
    dateRange: { start: day(2026, 9, 1), end: day(2026, 9, 30) },
  };

  it("clicar no que já está marcado não é mudança", () => {
    expect(sameFilterValues(base, { clientType: ["POTENCIAL"] })).toBe(true);
    expect(sameFilterValues(EMPTY_CLIENT_FILTERS, { clientType: [] })).toBe(true);
  });

  it("lista diferente (outro item ou outro tamanho) é mudança", () => {
    expect(sameFilterValues(base, { clientType: ["VERIFICADO"] })).toBe(false);
    expect(sameFilterValues(base, { clientType: [] })).toBe(false);
  });

  it("período compara as datas, não a referência do objeto", () => {
    expect(
      sameFilterValues(base, { dateRange: { start: day(2026, 9, 1), end: day(2026, 9, 30) } }),
    ).toBe(true);
    expect(
      sameFilterValues(base, { dateRange: { start: day(2026, 9, 2), end: day(2026, 9, 30) } }),
    ).toBe(false);
    expect(sameFilterValues(base, { dateRange: null })).toBe(false);
    expect(sameFilterValues(EMPTY_CLIENT_FILTERS, { dateRange: null })).toBe(true);
  });
});
