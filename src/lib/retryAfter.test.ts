import { describe, expect, it } from "vitest";
import {
  readableWait,
  tooManyAttemptsMessage,
  waitSeconds,
} from "./retryAfter";

const AGORA = new Date("2026-09-11T12:00:00Z");

describe("segundosDeEspera", () => {
  it("lê o formato que o backend manda: segundos", () => {
    expect(waitSeconds("45")).toBe(45);
    expect(waitSeconds(60)).toBe(60);
  });

  it("lê data HTTP, caso um proxy reescreva o header", () => {
    expect(waitSeconds("Fri, 11 Sep 2026 12:02:00 GMT", AGORA)).toBe(120);
  });

  it("ausente, vazio ou ilegível não vira número inventado", () => {
    // Devolver 0 aqui faria a tela prometer "tente em 0 segundos".
    for (const value of [null, undefined, "", "   ", "logo ali", "NaN"]) {
      expect(waitSeconds(value), String(value)).toBeNull();
    }
  });

  it("prazo já vencido ou zero não vira promessa", () => {
    expect(waitSeconds("0")).toBeNull();
    expect(waitSeconds("Fri, 11 Sep 2026 11:59:00 GMT", AGORA)).toBeNull();
  });
});

describe("esperaLegivel", () => {
  it("segundos abaixo de um minuto, com plural certo", () => {
    expect(readableWait("1")).toBe("em 1 segundo");
    expect(readableWait("45")).toBe("em 45 segundos");
  });

  it("a partir de um minuto, arredonda PARA CIMA", () => {
    // 61s virando "1 minuto" faria o usuário tentar aos 60 e tomar 429 de novo,
    // o que parece sistema quebrado. Sobrar alguns segundos é o erro barato.
    expect(readableWait("60")).toBe("em 1 minuto");
    expect(readableWait("61")).toBe("em 2 minutos");
    expect(readableWait("900")).toBe("em 15 minutos");
  });

  it("sem header, sem número", () => {
    expect(readableWait(null)).toBeNull();
  });
});

describe("mensagemDeMuitasTentativas", () => {
  it("diz quando voltar quando o header veio", () => {
    expect(tooManyAttemptsMessage("900")).toBe(
      "Muitas tentativas. Tente novamente em 15 minutos.",
    );
  });

  it("cai no texto genérico sem o header, em vez de omitir o aviso", () => {
    expect(tooManyAttemptsMessage(undefined)).toBe(
      "Muitas tentativas. Tente novamente em alguns minutos.",
    );
  });

  it("não diz se a conta existe nem se está bloqueada", () => {
    // Mensagem diferente para conta bloqueada e conta inexistente entregaria a
    // lista de quem tem login no escritório. O backend responde igual nos dois
    // casos; a tela não pode desfazer isso.
    const text = tooManyAttemptsMessage("60").toLowerCase();
    expect(text).not.toContain("bloquead");
    expect(text).not.toContain("não existe");
    expect(text).not.toContain("conta");
  });
});
