import { describe, expect, it } from "vitest";
import { buildDailyCounts, buildTypeBreakdown } from "./agendaSeries";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

// Instantes ao meio-dia UTC: mesmo dia local em qualquer fuso usual.
const at = (iso: string): AppointmentResponse =>
  ({ id: iso, title: iso, type: "Reunião", startAt: iso, endAt: iso, status: "Agendado" }) as AppointmentResponse;

describe("buildDailyCounts", () => {
  it("cobre o mês inteiro, inclusive os dias vazios", () => {
    const series = buildDailyCounts([], { year: 2026, month: 4 });
    expect(series.counts).toHaveLength(30);
    expect(series.labels[0]).toBe("1");
    expect(series.labels.at(-1)).toBe("30");
    expect(series.peak).toBe(0);
  });

  it("resolve fevereiro bissexto", () => {
    expect(buildDailyCounts([], { year: 2024, month: 2 }).counts).toHaveLength(29);
    expect(buildDailyCounts([], { year: 2026, month: 2 }).counts).toHaveLength(28);
  });

  it("conta no dia certo", () => {
    const series = buildDailyCounts(
      [at("2026-04-10T12:00:00Z"), at("2026-04-10T15:00:00Z"), at("2026-04-02T12:00:00Z")],
      { year: 2026, month: 4 },
    );
    expect(series.counts[9]).toBe(2); // dia 10
    expect(series.counts[1]).toBe(1); // dia 2
    expect(series.peak).toBe(2);
  });

  it("ignora compromisso de outro mês", () => {
    const series = buildDailyCounts(
      [at("2026-03-31T12:00:00Z"), at("2026-05-01T12:00:00Z")],
      { year: 2026, month: 4 },
    );
    expect(series.counts.every((c) => c === 0)).toBe(true);
  });

  it("instante inválido não derruba a série", () => {
    const series = buildDailyCounts([at("nao-e-data")], { year: 2026, month: 4 });
    expect(series.counts).toHaveLength(30);
    expect(series.peak).toBe(0);
  });
});

describe("buildTypeBreakdown", () => {
  const withType = (type: string, id: string): AppointmentResponse =>
    ({ id, title: id, type, startAt: "2026-04-10T12:00:00Z", endAt: "2026-04-10T13:00:00Z", status: "Agendado" }) as AppointmentResponse;

  it("conta por tipo e ordena por volume", () => {
    const result = buildTypeBreakdown([
      withType("Reunião", "1"),
      withType("Perícia", "2"),
      withType("Reunião", "3"),
      withType("Reunião", "4"),
      withType("Perícia", "5"),
    ]);
    expect(result.labels).toEqual(["Reunião", "Perícia"]);
    expect(result.counts).toEqual([3, 2]);
  });

  it("tipo ausente vira rótulo explícito, não string vazia", () => {
    const result = buildTypeBreakdown([withType("", "1")]);
    expect(result.labels).toEqual(["Sem tipo"]);
  });

  it("lista vazia não vira gráfico", () => {
    expect(buildTypeBreakdown([])).toEqual({ labels: [], counts: [] });
  });
});
