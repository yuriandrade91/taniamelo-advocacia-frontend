import { describe, expect, it } from "vitest";
import {
  formatDayHeader,
  groupByDay,
  localDayOf,
  localTimeOf,
  busyMinutes,
  durationMinutes,
  formatDuration,
  formatWhen,
  isOngoing,
  rulerSpan,
} from "./agendaGrouping";
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

describe("tempo de um compromisso", () => {
  const appt = (startAt: string, endAt: string, status = "Agendado") =>
    ({ ...at(startAt), startAt, endAt, status }) as AppointmentResponse;

  it("duração e ocupação do dia, sem contar cancelado", () => {
    const a = appt("2026-10-05T12:00:00Z", "2026-10-05T13:30:00Z");
    const b = appt("2026-10-05T15:00:00Z", "2026-10-05T16:00:00Z", "Cancelado");
    expect(durationMinutes(a)).toBe(90);
    expect(busyMinutes([a, b])).toBe(90);
  });

  it("formatDuration", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(90)).toBe("1h30");
  });

  it("acontecendo agora: agendado e dentro do horário", () => {
    const a = appt("2026-10-05T12:00:00Z", "2026-10-05T13:00:00Z");
    expect(isOngoing(a, Date.parse("2026-10-05T12:30:00Z"))).toBe(true);
    expect(isOngoing(a, Date.parse("2026-10-05T13:30:00Z"))).toBe(false);
    expect(isOngoing({ ...a, status: "Concluído" } as AppointmentResponse, Date.parse("2026-10-05T12:30:00Z"))).toBe(false);
  });

  it("régua do expediente (07h–20h): corta nas pontas e some fora dela", () => {
    const local = (h: number, m = 0) => new Date(2026, 9, 5, h, m).toISOString();
    expect(rulerSpan(appt(local(7), local(20)))).toEqual({ left: 0, width: 100 });
    expect(rulerSpan(appt(local(6), local(8)))?.left).toBe(0);
    expect(rulerSpan(appt(local(21), local(22)))).toBeNull();
  });

  it("formatWhen: hoje, amanhã ou a data, no fuso de quem olha", () => {
    const now = new Date(2026, 9, 5, 9, 0);
    expect(formatWhen(new Date(2026, 9, 5, 14, 30).toISOString(), now)).toBe("Hoje, às 14h30");
    expect(formatWhen(new Date(2026, 9, 6, 9, 5).toISOString(), now)).toBe("Amanhã, às 09h05");
    expect(formatWhen(new Date(2026, 8, 23, 15, 0).toISOString(), now)).toBe("23/09, às 15h00");
    expect(formatWhen("lixo", now)).toBe("-");
  });
});
