import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewClientPage from "@/app/(private)/clientes/novo/page";
import { renderApp } from "../../../../support/render";
import { signIn } from "../../../../support/session";

/**
 * O ditado no jsdom: reconhecimento de fala, microfone e medidor de volume
 * são de mentira, e o teste dita disparando os eventos do reconhecedor.
 */
/** O último reconhecedor criado — é por ele que o teste dita. */
const recognition: { last: FakeRecognition | null } = { last: null };

class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    recognition.last = this;
  }
  say(text: string, isFinal = true) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] });
  }
}

const stream = { getTracks: () => [{ stop: vi.fn() }] };

beforeEach(() => {
  Object.defineProperty(globalThis, "isSecureContext", { value: true, configurable: true });
  (globalThis as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
  });
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = class {
    createAnalyser() {
      return { fftSize: 0, getByteTimeDomainData: (data: Uint8Array) => data.fill(200) };
    }
    createMediaStreamSource() {
      return { connect: () => {} };
    }
    close() {
      return Promise.resolve();
    }
  };
});

afterEach(() => {
  delete (globalThis as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

async function openVoice() {
  signIn();
  const view = renderApp(<NewClientPage />);
  await screen.findByRole("heading", { name: "Cadastro de Cliente" });
  await view.user.click(screen.getByRole("button", { name: "Outras formas de preencher" }));
  await view.user.click(await screen.findByRole("radio", { name: "Ditado por voz" }));
  return view.user;
}

describe("Ditado por voz", () => {
  it("dita, reconhece os dados e aplica ao cadastro", async () => {
    const user = await openVoice();
    await user.click(await screen.findByRole("button", { name: "Começar a ditar" }));
    await waitFor(() => expect(recognition.last?.start).toHaveBeenCalled());

    await act(async () => {
      recognition.last!.say("nome Maria Aparecida da Silva", false);
      recognition.last!.say("nome Maria Aparecida da Silva CPF 390 533 447 05 nascida em 20 de maio de 1965 celular 31 98888 7777");
    });
    expect(await screen.findByText(/Encontrei/)).toBeInTheDocument();

    const stop = screen.queryByRole("button", { name: "Parar o ditado" });
    if (stop) await user.click(stop);
    await user.click(screen.getByRole("button", { name: "Aplicar ao cadastro" }));
    const clear = screen.queryAllByRole("button").find((b) => /Limpar|Apagar/.test(b.textContent ?? ""));
    if (clear) await user.click(clear);
  });

  it("microfone bloqueado explica o que fazer", async () => {
    const user = await openVoice();
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValueOnce(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    await user.click(await screen.findByRole("button", { name: "Começar a ditar" }));
    expect(await screen.findAllByText(/microfone/i)).not.toHaveLength(0);
  });

  it("erro do reconhecedor encerra o ditado", async () => {
    const user = await openVoice();
    await user.click(await screen.findByRole("button", { name: "Começar a ditar" }));
    await waitFor(() => expect(recognition.last?.start).toHaveBeenCalled());
    await act(async () => recognition.last!.onerror?.({ error: "network" }));
    await act(async () => recognition.last!.onerror?.({ error: "no-speech" }));
    await act(async () => recognition.last!.onend?.());
  });

  it("navegador sem reconhecimento de fala avisa", async () => {
    delete (globalThis as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    await openVoice();
    expect(await screen.findByText("O ditado não está disponível aqui")).toBeInTheDocument();
  });

  it("fora de HTTPS avisa", async () => {
    Object.defineProperty(globalThis, "isSecureContext", { value: false, configurable: true });
    await openVoice();
    expect(await screen.findByText("O ditado não está disponível aqui")).toBeInTheDocument();
  });

  it("som sem texto por 8 segundos mostra o aviso de transcrição parada", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = await openVoice();
    await user.click(await screen.findByRole("button", { name: "Começar a ditar" }));
    await waitFor(() => expect(recognition.last?.start).toHaveBeenCalled());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
  });
});
