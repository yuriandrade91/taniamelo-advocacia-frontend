import { describe, expect, it, vi } from "vitest";
import { CalendarDate } from "@internationalized/date";
import {
  buildFilterChips,
  notBillableFromSegment,
  notBillableSegmentId,
  selectedClientType,
} from "@/components/clients/list/filterChips";

/** Estado mínimo da barra, com setters espiões. */
function state(overrides: Partial<Parameters<typeof buildFilterChips>[0]> = {}) {
  return {
    clientType: [] as string[],
    notBillable: null as boolean | null,
    benefitType: [] as string[],
    situation: [] as string[],
    dateRange: null,
    setClientType: vi.fn(),
    setNotBillable: vi.fn(),
    setBenefitType: vi.fn(),
    setSituation: vi.fn(),
    setDateRange: vi.fn(),
    ...overrides,
  };
}

describe("selectedClientType", () => {
  it("um tipo só é filtro; nenhum ou os dois é 'Todos'", () => {
    expect(selectedClientType(["POTENCIAL"])).toBe("POTENCIAL");
    expect(selectedClientType([])).toBe("");
    expect(selectedClientType(["POTENCIAL", "VERIFICADO"])).toBe("");
  });
});

describe("isenção: botão ↔ notBillable", () => {
  it("Todos é null; Isentos e Não isentos são true e false", () => {
    expect(notBillableFromSegment("")).toBeNull();
    expect(notBillableFromSegment("true")).toBe(true);
    expect(notBillableFromSegment("false")).toBe(false);
    expect(notBillableSegmentId(null)).toBe("");
    expect(notBillableSegmentId(true)).toBe("true");
    expect(notBillableSegmentId(false)).toBe("false");
  });
});

describe("buildFilterChips", () => {
  it("sem filtro, sem chip", () => {
    expect(buildFilterChips(state())).toEqual([]);
  });

  it("um chip por valor, com o rótulo da tela (não a chave)", () => {
    const chips = buildFilterChips(
      state({
        clientType: ["POTENCIAL"],
        situation: ["ANALISE_DOCUMENTAL", "BENEFICIO_FUTURO"],
        dateRange: { start: new CalendarDate(2026, 9, 1), end: new CalendarDate(2026, 9, 30) },
      }),
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      "Potenciais",
      "Análise documental",
      "Benefício futuro",
      "Período do registro",
    ]);
  });

  it("isenção vira chip com o rótulo do botão; remover volta para Todos", () => {
    const exempt = state({ notBillable: true });
    const [chip] = buildFilterChips(exempt);
    expect(chip.label).toBe("Isentos");
    chip.remove();
    expect(exempt.setNotBillable).toHaveBeenCalledWith(null);

    expect(buildFilterChips(state({ notBillable: false }))[0].label).toBe("Não isentos");
  });

  it("remover tira só aquele valor", () => {
    const s = state({ situation: ["ANALISE_DOCUMENTAL", "BENEFICIO_FUTURO"] });
    buildFilterChips(s)[0].remove();
    expect(s.setSituation).toHaveBeenCalledWith(["BENEFICIO_FUTURO"]);
  });

  it("remover o tipo volta para 'Todos'; remover o período limpa as duas datas", () => {
    const s = state({
      clientType: ["VERIFICADO"],
      dateRange: { start: new CalendarDate(2026, 9, 1), end: new CalendarDate(2026, 9, 30) },
    });
    const [type, period] = buildFilterChips(s);
    type.remove();
    period.remove();
    expect(s.setClientType).toHaveBeenCalledWith([]);
    expect(s.setDateRange).toHaveBeenCalledWith(null);
  });

  it("período pela metade (só o início) ainda não é filtro", () => {
    const chips = buildFilterChips(
      state({ dateRange: { start: new CalendarDate(2026, 9, 1) } as never }),
    );
    expect(chips).toEqual([]);
  });
});
