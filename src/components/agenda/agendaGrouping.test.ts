import { describe, expect, it } from "vitest";
import { formatDayHeader, groupByDay, localDayOf, localTimeOf } from "./agendaGrouping";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

/**
 * Os instantes de teste ficam no MEIO do dia UTC (12h–18h) de propósito: assim
 * caem no mesmo dia local em qualquer fuso entre UTC-11 e UTC+11, e o teste
 * não passa a depender do relógio da máquina que roda a suíte.
 */
const at = (iso: string, id = iso): AppointmentResponse =>
  ({ id, title: id, type: "Reunião", startAt: iso, endAt: iso, status: "Agendado" }) as AppointmentResponse;

describe("groupByDay", () => {
  it("junta compromissos do mesmo dia local", () => {
    const groups = groupByDay([at("2026-03-12T15:00:00Z"), at("2026-03-12T12:00:00Z")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  it("ordena os itens do dia por horário de início", () => {
    const groups = groupByDay([
      at("2026-03-12T18:00:00Z", "tarde"),
      at("2026-03-12T12:00:00Z", "manha"),
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["manha", "tarde"]);
  });

  it("ordena os dias em ordem crescente", () => {
    const groups = groupByDay([
      at("2026-03-20T12:00:00Z"),
      at("2026-03-12T12:00:00Z"),
      at("2026-03-15T12:00:00Z"),
    ]);
    expect(groups.map((g) => g.date.slice(-2))).toEqual(["12", "15", "20"]);
  });

  it("lista vazia não vira grupo", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("instante inválido não cria grupo fantasma", () => {
    expect(groupByDay([at("nao-e-data")])).toEqual([]);
  });

  it("não muta a entrada", () => {
    const input = [at("2026-03-12T18:00:00Z", "b"), at("2026-03-12T12:00:00Z", "a")];
    groupByDay(input);
    expect(input.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("localDayOf / localTimeOf", () => {
  it("entrada inválida é sinalizada, não silenciada", () => {
    expect(localDayOf("xxx")).toBe("");
    expect(localTimeOf("xxx")).toBe("--:--");
  });

  it("devolve o formato esperado", () => {
    expect(localDayOf("2026-03-12T12:00:00Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(localTimeOf("2026-03-12T12:00:00Z")).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe("formatDayHeader", () => {
  it("nomeia o dia da semana", () => {
    // 12/03/2026 é uma quinta-feira.
    expect(formatDayHeader("2026-03-12")).toBe("Quinta-feira, 12/03");
  });

  it("entrada fora do formato volta como veio", () => {
    expect(formatDayHeader("12/03/2026")).toBe("12/03/2026");
  });
});
