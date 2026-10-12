import { describe, expect, it } from "vitest";
import type { ClientRequestStageHistory } from "@/interfaces/client/Client.interface";
import {
  newestFirst,
  requestStageHistoryRows,
  requestStageStatus,
} from "@/components/clients/inss/requestStageHistory";

/**
 * O andamento no INSS na ficha: a etapa atual (desde quando, por quê) e as
 * linhas do histórico. O escritório é em São Paulo (UTC-3): meia-noite lá é
 * 03:00 UTC, e é por esse relógio que os dias contam.
 */

let seq = 0;
const entry = (
  currentStage: string,
  changedAt: string,
  extra: Partial<ClientRequestStageHistory> = {},
): ClientRequestStageHistory => ({
  id: `h${++seq}`,
  currentStage,
  changedAt,
  ...extra,
});

describe("newestFirst", () => {
  it("ordena pela data da mudança, sem confiar na ordem da página", () => {
    const list = [
      entry("Requerimento", "2026-09-01T12:00:00Z"),
      entry("Recurso", "2026-10-05T12:00:00Z"),
      entry("Exigência", "2026-09-20T12:00:00Z"),
    ];
    expect(newestFirst(list).map((item) => item.currentStage)).toEqual(["Recurso", "Exigência", "Requerimento"]);
  });
});

describe("requestStageStatus", () => {
  it("sem etapa, o cliente ainda não foi ao INSS", () => {
    expect(requestStageStatus(null, [], "2026-10-11")).toBeNull();
    expect(requestStageStatus("Arquivado", [], "2026-10-11")).toBeNull();
  });

  it("a etapa atual traz desde quando, há quantos dias e o motivo", () => {
    const status = requestStageStatus(
      "Exigência",
      [
        entry("Requerimento", "2026-09-01T12:00:00Z"),
        entry("Exigência", "2026-10-01T15:00:00Z", {
          previousStage: "Requerimento",
          justification: "  CTPS original e PPP.  ",
        }),
      ],
      "2026-10-11",
    );
    expect(status).toMatchObject({
      stage: { key: "EXIGENCIA" },
      tone: "action",
      since: "2026-10-01T15:00:00Z",
      days: 10,
      justification: "CTPS original e PPP.",
    });
    expect(status?.phrase).toMatch(/exigência/i);
  });

  it("conta os dias no fuso do escritório: 23h30 lá ainda é o dia anterior", () => {
    // 02:30 UTC de 05/10 é 23:30 de 04/10 em São Paulo.
    const status = requestStageStatus("Recurso", [entry("Recurso", "2026-10-05T02:30:00Z")], "2026-10-05");
    expect(status?.days).toBe(1);
  });

  it("só vale a mudança mais recente, e só se ela levou à etapa atual", () => {
    // Exigência, cumprimento e exigência de novo: o motivo é o da segunda.
    const again = requestStageStatus(
      "Exigência",
      [
        entry("Exigência", "2026-09-01T12:00:00Z", { justification: "a primeira" }),
        entry("Cumprimento de exigência", "2026-09-10T12:00:00Z"),
        entry("Exigência", "2026-09-20T12:00:00Z", { justification: "a segunda" }),
      ],
      "2026-10-11",
    );
    expect(again?.justification).toBe("a segunda");

    // A etapa veio de antes do histórico existir: sem "desde" e sem motivo, em vez de inventar.
    const stale = requestStageStatus("Deferimento", [entry("Exigência", "2026-09-01T12:00:00Z")], "2026-10-11");
    expect(stale).toMatchObject({ since: null, days: null, justification: null });
  });

  it("sem histórico, a etapa aparece sem data", () => {
    expect(requestStageStatus("Requerimento", [], "2026-10-11")).toMatchObject({
      stage: { key: "REQUERIMENTO" },
      since: null,
      days: null,
      justification: null,
    });
  });
});

describe("requestStageHistoryRows", () => {
  it("cada linha diz para onde foi, de onde veio, quanto ficou lá e por quê", () => {
    const [latest, first] = requestStageHistoryRows([
      entry("Requerimento", "2026-09-01T12:00:00Z", { changedByUserId: "u1" }),
      entry("Indeferimento", "2026-10-01T12:00:00Z", {
        previousStage: "Requerimento",
        diasNaEtapaAnterior: 30,
        justification: " Falta de carência. ",
      }),
    ]);

    expect(latest).toMatchObject({
      label: "Indeferimento",
      tone: "denied",
      previousLabel: "Requerimento",
      daysInPrevious: 30,
      justification: "Falta de carência.",
    });
    expect(first).toMatchObject({
      label: "Requerimento",
      previousLabel: null,
      daysInPrevious: null,
      justification: null,
      changedByUserId: "u1",
    });
  });

  it("justificativa em branco não vira caixa vazia", () => {
    const [row] = requestStageHistoryRows([entry("Deferimento", "2026-10-01T12:00:00Z", { justification: "   " })]);
    expect(row.justification).toBeNull();
  });

  it("etapa desconhecida aparece com o rótulo que veio", () => {
    const [row] = requestStageHistoryRows([entry("Perícia", "2026-10-01T12:00:00Z", { previousStage: "Outra" })]);
    expect(row).toMatchObject({ label: "Perícia", previousLabel: "Outra" });
  });
});
