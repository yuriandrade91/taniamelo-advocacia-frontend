import { describe, expect, it } from "vitest";
import { msUntilNextOfficeDay, officeToday } from "@/lib/officeClock";

// O escritório fica em America/Sao_Paulo (UTC-3, sem horário de verão desde
// 2019): meia-noite lá é 03:00 em UTC.

describe("officeToday", () => {
  it("é o dia no escritório, não em UTC: 23h30 de lá ainda é o dia anterior", () => {
    expect(officeToday(new Date("2026-10-08T02:30:00Z"))).toBe("2026-10-07");
  });

  it("vira à meia-noite do escritório", () => {
    expect(officeToday(new Date("2026-10-08T02:59:59.999Z"))).toBe("2026-10-07");
    expect(officeToday(new Date("2026-10-08T03:00:00Z"))).toBe("2026-10-08");
  });

  it("vira o ano no fuso do escritório", () => {
    expect(officeToday(new Date("2027-01-01T01:00:00Z"))).toBe("2026-12-31");
    expect(officeToday(new Date("2027-01-01T03:00:00Z"))).toBe("2027-01-01");
  });
});

describe("msUntilNextOfficeDay", () => {
  const MARGIN = 1_000;

  it("conta até a meia-noite do escritório, mais a folga", () => {
    // 23h30 lá: faltam 30 minutos.
    expect(msUntilNextOfficeDay(new Date("2026-10-08T02:30:00Z"))).toBe(30 * 60_000 + MARGIN);
  });

  it("no último meio segundo do dia, faltam só esse meio segundo e a folga", () => {
    expect(msUntilNextOfficeDay(new Date("2026-10-08T02:59:59.500Z"))).toBe(500 + MARGIN);
  });

  it("logo à meia-noite, o próximo dia está a 24 horas", () => {
    expect(msUntilNextOfficeDay(new Date("2026-10-08T03:00:00Z"))).toBe(24 * 3_600_000 + MARGIN);
  });

  it("acordar com o atraso devolvido cai no dia seguinte", () => {
    const now = new Date("2026-10-08T14:12:34.567Z");
    const wake = new Date(now.getTime() + msUntilNextOfficeDay(now));
    expect(officeToday(wake)).toBe("2026-10-09");
    expect(officeToday(new Date(wake.getTime() - MARGIN - 1))).toBe("2026-10-08");
  });
});
