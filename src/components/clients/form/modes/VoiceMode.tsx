"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import {
  DICTATION_ERROR_MESSAGES,
  DictationSession,
  errorFromMedia,
  normalizeDictation,
  type DictationError,
  type RecognitionCtor,
} from "./dictation";
import { ExtractionPanel } from "./ExtractionPanel";
import type { FillModeProps } from "./shared";
import { extractClientData } from "./smartFill";

const recognitionCtor = (): RecognitionCtor | null => {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

function MicIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Medidor de volume ao vivo: prova que o microfone está captando som, que
 * é a primeira dúvida quando "o ditado não funciona".
 */
function LevelMeter({ level }: { level: number }) {
  const bars = [0.35, 0.6, 0.85, 1, 0.85, 0.6, 0.35];
  return (
    <div aria-hidden="true" className="flex h-8 items-center gap-1">
      {bars.map((weight, i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-secondary transition-[height] duration-75"
          style={{
            height: `${Math.max(4, Math.min(32, level * weight * 90))}px`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Modo "Ditado por voz": a pessoa fala os dados do cliente e eles viram
 * texto ao vivo, que o extrator do "Colar e preencher" transforma em
 * cadastro.
 *
 * A sessão (`dictation.ts`, testada com reconhecedor falso) religa sozinha
 * nas pausas e separa erro passageiro de erro de verdade. Antes de ditar, a
 * tela pede o microfone com `getUserMedia`: é o que mostra o pedido de
 * permissão do navegador e diz com clareza "bloqueado" ou "sem microfone" —
 * e o mesmo áudio alimenta o medidor de volume.
 */
export function VoiceMode(props: FillModeProps) {
  const [support, setSupport] = useState<"checking" | "ok" | DictationError>(
    "checking",
  );
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<DictationError | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [level, setLevel] = useState(0);
  /**
   * Som chegando, texto não: o serviço de transcrição do navegador não está
   * respondendo (rede, navegador sem o serviço). Sem este aviso a tela
   * ficaria em "Ouvindo…" para sempre.
   */
  const [stalled, setStalled] = useState(false);
  const lastTextAt = useRef(0);
  const heardSoundAt = useRef(0);

  const session = useRef<DictationSession | null>(null);
  const audio = useRef<{
    stream: MediaStream;
    context: AudioContext;
    frame: number;
  } | null>(null);

  const stopMeter = () => {
    const current = audio.current;
    audio.current = null;
    if (!current) return;
    cancelAnimationFrame(current.frame);
    current.stream.getTracks().forEach((track) => track.stop());
    void current.context.close();
    setLevel(0);
  };

  useEffect(() => {
    if (!window.isSecureContext) setSupport("insecure");
    else if (!recognitionCtor()) setSupport("unsupported");
    else setSupport("ok");
    return () => {
      session.current?.dispose();
      stopMeter();
    };
  }, []);

  // Vigia: houve som depois do último texto e já se passaram 8 s sem nada.
  useEffect(() => {
    if (!listening) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setStalled(
        heardSoundAt.current > lastTextAt.current &&
          now - lastTextAt.current > 8000,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [listening]);

  const fields = useMemo(
    () => extractClientData(normalizeDictation(text)),
    [text],
  );

  const startMeter = (stream: MediaStream) => {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const sample of data) sum += ((sample - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / data.length);
      if (rms > 0.03) heardSoundAt.current = Date.now();
      setLevel(rms);
      if (audio.current) audio.current.frame = requestAnimationFrame(tick);
    };
    audio.current = { stream, context, frame: requestAnimationFrame(tick) };
  };

  const start = async () => {
    const Ctor = recognitionCtor();
    if (!Ctor || starting) return;
    setError(null);
    setErrorCode("");
    setStalled(false);
    lastTextAt.current = Date.now();
    heardSoundAt.current = 0;
    setStarting(true);
    try {
      // Pede o microfone explicitamente: dispara o pedido de permissão e
      // separa "bloqueado" de "não existe microfone".
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startMeter(stream);
    } catch (reason) {
      setStarting(false);
      setError(errorFromMedia((reason as { name?: string })?.name ?? ""));
      return;
    }

    session.current ??= new DictationSession(Ctor, {
      onFinal: (finalText) => {
        lastTextAt.current = Date.now();
        setStalled(false);
        setText((current) =>
          current && !/\s$/.test(current)
            ? `${current} ${finalText}`
            : current + finalText,
        );
      },
      onInterim: (pending) => {
        if (pending) {
          lastTextAt.current = Date.now();
          setStalled(false);
        }
        setInterim(pending);
      },
      onListeningChange: (value) => {
        setListening(value);
        if (!value) stopMeter();
      },
      onError: (dictationError, code) => {
        setError(dictationError);
        setErrorCode(code);
        setStalled(false);
        setListening(false);
        stopMeter();
      },
    });
    session.current.start();
    setStarting(false);
  };

  const stop = () => session.current?.stop();

  const blocked = support !== "ok" && support !== "checking";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-light-gray">
        <div className="relative flex h-36 w-36 items-center justify-center">
          {listening && (
            <span
              aria-hidden="true"
              className="absolute rounded-full bg-secondary/20 transition-all duration-100 motion-reduce:transition-none"
              style={{
                inset: `${Math.max(0, 22 - level * 160)}px`,
              }}
            />
          )}
          <button
            type="button"
            onClick={listening ? stop : () => void start()}
            disabled={blocked || starting}
            aria-pressed={listening}
            aria-label={listening ? "Parar o ditado" : "Começar a ditar"}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100 ${
              listening ? "bg-secondary" : "bg-primary hover:bg-primary/90"
            }`}
          >
            <MicIcon />
          </button>
        </div>

        <div className="mt-2 h-8">
          {listening && <LevelMeter level={level} />}
        </div>

        <h3
          className="mt-2 text-lg font-semibold text-primary"
          aria-live="polite"
        >
          {blocked
            ? "O ditado não está disponível aqui"
            : starting
              ? "Pedindo acesso ao microfone…"
              : listening
                ? "Ouvindo… pode falar com pausas"
                : "Toque no microfone e fale"}
        </h3>
        <p className="mt-1 max-w-md text-sm text-gray-100">
          {blocked
            ? DICTATION_ERROR_MESSAGES[support as DictationError]
            : listening
              ? "As barras mostram que o som está chegando. Toque de novo para parar."
              : "Ex.: “nome Maria Aparecida da Silva, CPF 390 533 447 05, nascida em 20 de maio de 1965, mãe Ana Rosa, celular 31 98888 7777, aposentadoria por idade.”"}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-3 max-w-md rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {DICTATION_ERROR_MESSAGES[error]}
            {error === "unknown" && errorCode && (
              <span className="mt-1 block text-xs opacity-70">
                Código do navegador: {errorCode}
              </span>
            )}
          </p>
        )}
        {listening && stalled && (
          <p
            role="status"
            className="mt-3 max-w-md rounded-2xl bg-light-secondary px-4 py-3 text-sm text-secondary"
          >
            O microfone está captando som, mas o navegador não está devolvendo
            texto. Verifique a internet — a transcrição é feita por um serviço
            online — ou use o Chrome ou o Edge atualizados.
          </p>
        )}

        <div className="mt-6 w-full text-left">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-gray-100/70 uppercase">
              Transcrição — pode corrigir
            </span>
            {text && (
              <ChipButton tone="danger" onClick={() => setText("")}>
                Limpar
              </ChipButton>
            )}
          </div>
          <textarea
            aria-label="Transcrição do ditado"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="O que você ditar aparece aqui. Também dá para digitar."
            className="min-h-40 w-full resize-y rounded-2xl bg-page px-5 py-4 text-sm leading-relaxed text-primary outline-none placeholder:text-gray-100/40 focus:bg-floral focus:ring-2 focus:ring-secondary/40"
          />
          {interim && (
            <p className="mt-2 text-sm text-gray-100/60 italic">{interim}…</p>
          )}
        </div>
      </section>

      <ExtractionPanel fields={fields} forms={props} />
    </div>
  );
}
