/**
 * Sessão de ditado sobre a Web Speech API — sem React, para poder ser
 * testada com um reconhecedor falso.
 *
 * O que ela resolve, e a API crua não:
 *
 * - **Não parar sozinha.** O Chrome encerra o reconhecimento depois de alguns
 *   segundos de silêncio (e, mesmo falando, por volta de um minuto). Enquanto
 *   a pessoa não apertar "parar", a sessão religa sozinha — no meio de um
 *   atendimento ninguém quer clicar no microfone a cada pausa.
 * - **Erro passageiro × erro de verdade.** "no-speech" (silêncio) e "aborted"
 *   são rotina: religa. Microfone negado, sem microfone, sem rede (o Chrome
 *   transcreve nos servidores da Google) param e explicam o porquê.
 * - **Clique duplo.** Chamar `start()` com o reconhecimento já ligado lança
 *   `InvalidStateError`; aqui isso é ignorado.
 */

/** O mínimo da Web Speech API que usamos. */
export type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
export type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<RecognitionResult>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};
export type RecognitionCtor = new () => RecognitionLike;

export type DictationError =
  | "not-allowed"
  | "no-microphone"
  | "busy"
  | "network"
  | "insecure"
  | "unsupported"
  | "unknown";

export const DICTATION_ERROR_MESSAGES: Record<DictationError, string> = {
  "not-allowed":
    "O microfone está bloqueado para este site. Clique no cadeado da barra de endereço, permita o microfone e tente de novo.",
  "no-microphone":
    "Nenhum microfone foi encontrado. Conecte um microfone (ou fone com microfone) e tente de novo.",
  busy: "O microfone está em uso por outro programa (Teams, Zoom, WhatsApp…). Feche o outro uso e tente de novo.",
  network:
    "O ditado precisa de internet: o navegador transcreve a fala num serviço online. Verifique a conexão.",
  insecure:
    "O ditado só funciona em endereço seguro (https). Abra o sistema pelo endereço com https.",
  unsupported:
    "Este navegador não tem ditado. Use o Chrome ou o Edge — ou digite abaixo, que a leitura funciona igual.",
  unknown: "O ditado parou por um erro inesperado. Tente de novo.",
};

/**
 * Traduz o código de erro da API. `null` = passageiro (silêncio, interrupção
 * nossa): a sessão segue e religa.
 */
export function errorFromRecognition(code: string): DictationError | null {
  switch (code) {
    case "no-speech":
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "audio-capture":
      return "no-microphone";
    case "network":
      return "network";
    case "language-not-supported":
      return "unsupported";
    default:
      return "unknown";
  }
}

/** Erro do `getUserMedia` (checagem do microfone antes de ditar). */
export function errorFromMedia(name: string): DictationError {
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "not-allowed";
    // Sem dispositivo de áudio: NotFound na maioria, NotSupported em alguns.
    case "NotFoundError":
    case "NotSupportedError":
    case "OverconstrainedError":
      return "no-microphone";
    // O sistema não entrega o áudio: outro programa está com o microfone.
    case "NotReadableError":
    case "AbortError":
      return "busy";
    default:
      return "unknown";
  }
}

export type DictationHandlers = {
  /** Trecho que o reconhecedor deu como final — acrescentar ao texto. */
  onFinal: (text: string) => void;
  /** O que está sendo reconhecido agora (ainda pode mudar). */
  onInterim: (text: string) => void;
  /** Ligou ou desligou de fato (não pisca nas religadas automáticas). */
  onListeningChange: (listening: boolean) => void;
  /** `code`: o código cru do navegador, para diagnóstico do "inesperado". */
  onError: (error: DictationError, code: string) => void;
};

export class DictationSession {
  private recognition: RecognitionLike | null = null;
  private wanted = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly Ctor: RecognitionCtor,
    private readonly handlers: DictationHandlers,
    private readonly restartDelayMs = 250,
  ) {}

  get isWanted() {
    return this.wanted;
  }

  start() {
    if (this.wanted) return;
    this.wanted = true;
    this.handlers.onListeningChange(true);
    this.launch();
  }

  stop() {
    this.wanted = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
    this.handlers.onInterim("");
    this.recognition?.stop();
    this.handlers.onListeningChange(false);
  }

  /** Para tudo sem avisar ninguém — desmontagem da tela. */
  dispose() {
    this.wanted = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    const r = this.recognition;
    this.recognition = null;
    if (r) {
      r.onend = null;
      r.onerror = null;
      r.onresult = null;
      (r.abort ?? r.stop).call(r);
    }
  }

  private create() {
    const r = new this.Ctor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let finals = "";
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finals += result[0].transcript;
        else pending += result[0].transcript;
      }
      if (finals.trim()) this.handlers.onFinal(finals.trim());
      this.handlers.onInterim(pending.trim());
    };
    r.onerror = (event) => {
      const error = errorFromRecognition(event.error);
      if (!error) return; // silêncio/interrupção: o onend religa
      this.wanted = false;
      this.handlers.onError(error, event.error);
    };
    r.onend = () => {
      this.handlers.onInterim("");
      if (this.wanted) {
        // Fim por silêncio ou tempo: religa sem a pessoa perceber.
        this.restartTimer = setTimeout(
          () => this.launch(),
          this.restartDelayMs,
        );
      } else {
        this.handlers.onListeningChange(false);
      }
    };
    return r;
  }

  private launch() {
    if (!this.wanted) return;
    this.recognition ??= this.create();
    try {
      this.recognition.start();
    } catch {
      // Já estava ligado (InvalidStateError): nada a fazer.
    }
  }
}

/* ───────────────────────── fala → texto legível ───────────────────────── */

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Ajusta o texto ditado para o extrator: datas por extenso, "barra",
 * "arroba", "ponto com", números ditados em blocos ("31 98888 7777"),
 * "número 123".
 */
export function normalizeDictation(text: string) {
  let out = text;
  // "20 de maio de 1965" → "20/05/1965"
  out = out.replace(
    new RegExp(
      `\\b(\\d{1,2})\\s+de\\s+(${MONTHS.join("|")})\\s+de\\s+(\\d{4})\\b`,
      "gi",
    ),
    (_, day: string, month: string, year: string) =>
      `${day.padStart(2, "0")}/${String(MONTHS.indexOf(month.toLowerCase()) + 1).padStart(2, "0")}/${year}`,
  );
  out = out
    .replace(/(\d)\s+barra\s+(\d)/gi, "$1/$2")
    .replace(/(\d)\s+(?:traço|hífen|hifen)\s+(\d)/gi, "$1-$2")
    .replace(/\s+(?:underline|underscore)\s+/gi, "_")
    .replace(/\s+arroba\s+/gi, "@")
    .replace(/\s+ponto\s+com\b/gi, ".com")
    .replace(/\s+ponto\s+br\b/gi, ".br")
    // "maria ponto silva@…": o ponto antes do @ também é do e-mail.
    .replace(/\s+ponto\s+(?=\S*@)/gi, ".")
    // "número 123" no endereço.
    .replace(/\s+n[úu]mero\s+(\d)/gi, ", nº $1");
  // Fala não tem pontuação: quebra a linha antes de cada rótulo falado, para
  // o valor de um ("mãe Ana Rosa") não engolir o próximo ("celular …").
  out = out
    .replace(
      /\s+(?=(?:cpf|rg|nit|pis|cep|celular|telefone|whats(?:app)?|e-?mail|m[ãa]e|filh[ao] de|nascid[ao]|data de nascimento|profiss[ãa]o|trabalha como|rua|avenida|bairro|estado civil|casad[ao]|solteir[ao]|divorciad[ao]|vi[úu]v[ao]|aposentadoria|benef[íi]cio)\b)/gi,
      "\n",
    )
    .replace(/(^|\n)\s*nome(?: completo)?\s+(?![:\-–])/gi, "$1Nome: ");
  // Blocos de dígitos ditados separados por espaço viram um número só
  // ("31 98888 7777", "390 533 447 05").
  out = out.replace(/(\d)\s+(?=\d)/g, "$1");
  return out;
}
