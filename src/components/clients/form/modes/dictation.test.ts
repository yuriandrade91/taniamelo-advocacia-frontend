import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DictationSession,
  errorFromMedia,
  errorFromRecognition,
  normalizeDictation,
  type DictationHandlers,
  type RecognitionLike,
} from "./dictation";
import { extractClientData } from "./smartFill";

/**
 * Reconhecedor falso, com as manias do Chrome: `start()` com ele já ligado
 * lança, e ele "termina" sozinho (silêncio) quando o teste manda.
 */
class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  running = false;
  starts = 0;
  onresult: RecognitionLike["onresult"] = null;
  onend: RecognitionLike["onend"] = null;
  onerror: RecognitionLike["onerror"] = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    if (this.running) throw new Error("InvalidStateError");
    this.running = true;
    this.starts += 1;
  }
  stop() {
    this.running = false;
    this.onend?.();
  }
  /** O Chrome encerrando por silêncio. */
  endBySilence() {
    this.onerror?.({ error: "no-speech" });
    this.running = false;
    this.onend?.();
  }
  fail(error: string) {
    this.onerror?.({ error });
    this.running = false;
    this.onend?.();
  }
  say(transcript: string, isFinal = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript } }],
    });
  }
}

const handlers = () => {
  const calls = {
    finals: [] as string[],
    interim: [] as string[],
    listening: [] as boolean[],
    errors: [] as string[],
  };
  const h: DictationHandlers = {
    onFinal: (text) => calls.finals.push(text),
    onInterim: (text) => calls.interim.push(text),
    onListeningChange: (value) => calls.listening.push(value),
    onError: (error) => calls.errors.push(error),
  };
  return { h, calls };
};

beforeEach(() => {
  FakeRecognition.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("a sessão de ditado", () => {
  it("liga em pt-BR, contínuo e com resultado parcial", () => {
    const { h, calls } = handlers();
    new DictationSession(FakeRecognition, h).start();
    const r = FakeRecognition.instances[0];
    expect(r.lang).toBe("pt-BR");
    expect(r.continuous).toBe(true);
    expect(r.interimResults).toBe(true);
    expect(r.running).toBe(true);
    expect(calls.listening).toEqual([true]);
  });

  it("religa sozinha quando o navegador para por silêncio", () => {
    const { h, calls } = handlers();
    new DictationSession(FakeRecognition, h, 250).start();
    const r = FakeRecognition.instances[0];

    r.endBySilence();
    expect(r.running).toBe(false);
    vi.advanceTimersByTime(250);

    expect(r.running).toBe(true);
    expect(r.starts).toBe(2);
    // Para quem olha, nunca desligou.
    expect(calls.listening).toEqual([true]);
    expect(calls.errors).toEqual([]);
  });

  it("parar de verdade não religa", () => {
    const { h, calls } = handlers();
    const session = new DictationSession(FakeRecognition, h, 250);
    session.start();
    session.stop();
    vi.advanceTimersByTime(1000);
    expect(FakeRecognition.instances[0].running).toBe(false);
    expect(calls.listening.at(-1)).toBe(false);
  });

  it("microfone negado para e explica, sem religar", () => {
    const { h, calls } = handlers();
    new DictationSession(FakeRecognition, h, 250).start();
    const r = FakeRecognition.instances[0];
    r.fail("not-allowed");
    vi.advanceTimersByTime(1000);
    expect(calls.errors).toEqual(["not-allowed"]);
    expect(r.running).toBe(false);
    expect(calls.listening.at(-1)).toBe(false);
  });

  it("clique duplo não quebra", () => {
    const { h } = handlers();
    const session = new DictationSession(FakeRecognition, h);
    session.start();
    expect(() => session.start()).not.toThrow();
    expect(FakeRecognition.instances).toHaveLength(1);
  });

  it("entrega o final para acrescentar e o parcial para mostrar", () => {
    const { h, calls } = handlers();
    new DictationSession(FakeRecognition, h).start();
    const r = FakeRecognition.instances[0];
    r.say("maria aparecida", false);
    r.say("maria aparecida da silva", true);
    expect(calls.interim).toContain("maria aparecida");
    expect(calls.finals).toEqual(["maria aparecida da silva"]);
  });

  it("desmontar a tela para tudo sem disparar avisos", () => {
    const { h, calls } = handlers();
    const session = new DictationSession(FakeRecognition, h, 250);
    session.start();
    session.dispose();
    vi.advanceTimersByTime(1000);
    expect(FakeRecognition.instances[0].running).toBe(false);
    expect(calls.listening).toEqual([true]);
  });
});

describe("os códigos de erro", () => {
  it("silêncio e interrupção são passageiros", () => {
    expect(errorFromRecognition("no-speech")).toBeNull();
    expect(errorFromRecognition("aborted")).toBeNull();
  });
  it("traduz os que param o ditado", () => {
    expect(errorFromRecognition("not-allowed")).toBe("not-allowed");
    expect(errorFromRecognition("service-not-allowed")).toBe("not-allowed");
    expect(errorFromRecognition("audio-capture")).toBe("no-microphone");
    expect(errorFromRecognition("network")).toBe("network");
    expect(errorFromMedia("NotFoundError")).toBe("no-microphone");
    expect(errorFromMedia("NotAllowedError")).toBe("not-allowed");
    expect(errorFromMedia("NotSupportedError")).toBe("no-microphone");
    expect(errorFromMedia("NotReadableError")).toBe("busy");
  });
});

describe("fala virando texto que o extrator entende", () => {
  it("data por extenso, barra, e-mail falado e número em blocos", () => {
    const text = normalizeDictation(
      "nome Maria Aparecida da Silva nascida em 20 de maio de 1965 cpf 390 533 447 05 celular 31 98888 7777 email maria ponto silva arroba gmail ponto com rua das flores número 123",
    );
    expect(text).toContain("20/05/1965");
    expect(text).toContain("39053344705");
    expect(text).toContain("31988887777");
    expect(text).toContain("maria.silva@gmail.com");
    expect(text).toContain("rua das flores, nº 123");
    expect(text).toContain("Nome: Maria Aparecida da Silva");

    const fields = extractClientData(text);
    const value = (key: string) => fields.find((f) => f.key === key)?.value;
    expect(value("birthDate")).toBe("1965-05-20");
    expect(value("cpf")).toBe("390.533.447-05");
    expect(value("mobilePhone")).toBe("(31) 98888-7777");
    expect(value("email")).toBe("maria.silva@gmail.com");
    expect(value("addressNumber")).toBe("123");
  });

  it("sem pontuação, cada rótulo falado começa um dado novo", () => {
    const fields = extractClientData(
      normalizeDictation(
        "nome maria aparecida da silva mãe ana rosa da silva celular 31 98888 7777 aposentadoria por idade",
      ),
    );
    const value = (key: string) => fields.find((f) => f.key === key)?.value;
    expect(value("fullName")).toBe("Maria Aparecida da Silva");
    expect(value("motherName")).toBe("Ana Rosa da Silva");
    expect(value("mobilePhone")).toBe("(31) 98888-7777");
    expect(value("benefit")).toBe("APOSENTADORIA_POR_IDADE");
  });

  it("20 barra 05 barra 1965 vira data", () => {
    expect(normalizeDictation("nascida em 20 barra 05 barra 1965")).toContain(
      "20/05/1965",
    );
  });
});
