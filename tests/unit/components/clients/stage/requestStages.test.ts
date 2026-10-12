import { describe, expect, it } from "vitest";
import {
  REQUEST_STAGES,
  REQUEST_STAGE_JUSTIFICATION_MAX,
  REQUEST_STAGE_TRACK,
  requestStageChangedMessage,
  requestStageJustificationError,
  requestStageOf,
  requestStagePatch,
  requestStageTrack,
  requiresJustification,
} from "@/components/clients/stage/requestStages";

/**
 * A esteira do INSS na lista de Clientes: a leitura do rótulo da API e o
 * trilho de cinco pontos. O trilho é o que a pessoa lê de relance — se ele
 * errar, um indeferido parece estar a caminho do deferimento.
 */

const stage = (label: string) => requestStageOf(label);

describe("requestStageOf", () => {
  it("lê o rótulo da API e, por tolerância, a chave", () => {
    expect(stage("Cumprimento de exigência")?.key).toBe("CUMPRIMENTO_DE_EXIGENCIA");
    expect(requestStageOf("RECURSO")?.label).toBe("Recurso");
  });

  it("nulo é 'ainda não foi ao INSS', e não uma etapa", () => {
    expect(requestStageOf(null)).toBeNull();
    expect(requestStageOf(undefined)).toBeNull();
    expect(requestStageOf("Perícia")).toBeNull();
  });

  it("os dois desfechos dividem o mesmo ponto, como no backend", () => {
    const orders = Object.fromEntries(REQUEST_STAGES.map((s) => [s.key, s.order]));
    expect(orders.DEFERIMENTO).toBe(4);
    expect(orders.INDEFERIMENTO).toBe(4);
    expect(Math.max(...Object.values(orders))).toBe(REQUEST_STAGE_TRACK);
  });
});

describe("requestStageTrack", () => {
  it("sem requerimento, o trilho é todo cinza", () => {
    expect(requestStageTrack(null)).toEqual(Array(REQUEST_STAGE_TRACK).fill("upcoming"));
  });

  it("o caminho até a etapa em verde, ela na sua cor, o resto em cinza", () => {
    expect(requestStageTrack(stage("Exigência"))).toEqual(["done", "action", "upcoming", "upcoming", "upcoming"]);
    expect(requestStageTrack(stage("Cumprimento de exigência"))).toEqual([
      "done",
      "done",
      "waiting",
      "upcoming",
      "upcoming",
    ]);
  });

  it("deferido fecha o trilho inteiro em verde", () => {
    expect(requestStageTrack(stage("Deferimento"))).toEqual(Array(REQUEST_STAGE_TRACK).fill("done"));
  });

  it("indeferido fica vermelho no ponto da decisão; em recurso, a decisão continua vermelha", () => {
    expect(requestStageTrack(stage("Indeferimento"))).toEqual(["done", "done", "done", "denied", "upcoming"]);
    expect(requestStageTrack(stage("Recurso"))).toEqual(["done", "done", "done", "denied", "waiting"]);
  });
});

describe("requestStageChangedMessage", () => {
  it("diz que é a situação no INSS, para não confundir com a do benefício", () => {
    expect(requestStageChangedMessage("Maria", "EXIGENCIA")).toBe(
      'Situação no INSS de Maria atualizada para "Exigência".',
    );
  });
});

describe("justificativa da etapa no INSS", () => {
  it("exigência, indeferimento e recurso pedem; as outras, não — como no backend", () => {
    const asking = REQUEST_STAGES.filter((s) => requiresJustification(s.key)).map((s) => s.key);
    expect(asking).toEqual(["EXIGENCIA", "INDEFERIMENTO", "RECURSO"]);
  });

  it("nessas três, o texto é obrigatório, com um mínimo e o teto do backend", () => {
    expect(requestStageJustificationError("EXIGENCIA", "")).toBe("Informe a justificativa.");
    expect(requestStageJustificationError("RECURSO", "   ")).toBe("Informe a justificativa.");
    expect(requestStageJustificationError("INDEFERIMENTO", "curto")).toMatch(/pelo menos/);
    expect(requestStageJustificationError("INDEFERIMENTO", "Falta de carência.")).toBeNull();
    expect(requestStageJustificationError("EXIGENCIA", "x".repeat(REQUEST_STAGE_JUSTIFICATION_MAX + 1))).toMatch(
      /até 1000/,
    );
  });

  it("nas outras, nunca há erro", () => {
    expect(requestStageJustificationError("DEFERIMENTO", "")).toBeNull();
    expect(requestStageJustificationError("CUMPRIMENTO_DE_EXIGENCIA", "")).toBeNull();
  });

  it("o PATCH leva a justificativa limpa, e só quando a etapa pede", () => {
    expect(requestStagePatch("EXIGENCIA", "  CTPS original e PPP.  ")).toEqual({
      requestStage: "EXIGENCIA",
      requestStageJustification: "CTPS original e PPP.",
    });
    expect(requestStagePatch("DEFERIMENTO", "texto que ficou escondido")).toEqual({ requestStage: "DEFERIMENTO" });
    expect(requestStagePatch("REQUERIMENTO")).toEqual({ requestStage: "REQUERIMENTO" });
  });
});
