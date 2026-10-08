/**
 * Os intervalos de deficiência no formulário: rascunho, validação e payload.
 *
 * Diferente das outras seções, esta **não** usa um `useSectionForm` por item.
 * A lista não tem limite fixo (endereços têm três), e hook não nasce dentro de
 * loop — três `useSectionForm` fixos resolvem o caso dos endereços justamente
 * porque o limite é regra de negócio. Aqui o estado é um array e as regras são
 * funções puras sobre ele, o que também as torna testáveis sem montar
 * componente, que é o recorte do Vitest deste projeto.
 *
 * As regras são as mesmas que o backend defende em
 * `ClientDisabilityPeriodService`. Repetidas aqui não por desconfiança, mas
 * porque a pessoa precisa ver o erro no campo antes de enviar — e porque
 * durante o cadastro ainda não existe cliente para validar contra. Quem decide
 * é sempre o servidor; isto é antecipação da resposta dele.
 */
import {
  type DisabilityGradeKey,
  getDisabilityGradeKeyByLabel,
} from "@/enums/disabilityGrade/DisabilityGrade";
import {
  type ConvertibleInterval,
  daysBetween,
  formatDateBR,
} from "@/lib/disabilityTime";

export type DisabilityPeriodDraft = {
  /** Chave de lista no React. Local, não vem do servidor. */
  key: string;
  /** `id` do backend; `null` até o intervalo ser gravado. */
  id: string | null;
  /** `""` enquanto nada foi escolhido. */
  grade: "" | DisabilityGradeKey;
  /** `YYYY-MM-DD` */
  startedOn: string;
  /** "Esta deficiência se mantém até a presente data". */
  ongoing: boolean;
  /** `YYYY-MM-DD`; ignorado quando `ongoing`. */
  endedOn: string;
};

export type DisabilityPeriodErrors = Partial<
  Record<"grade" | "startedOn" | "endedOn", string>
>;

let counter = 0;

/**
 * Um intervalo em branco.
 *
 * `ongoing` começa **verdadeiro**: a tela oferece "se mantém até a presente
 * data" como a primeira das duas opções, e é o caso mais comum de quem procura
 * o escritório — a deficiência em curso. Começar em falso obrigaria a pessoa a
 * desmarcar algo para descrever a situação normal.
 */
export function newDisabilityPeriod(): DisabilityPeriodDraft {
  counter += 1;
  return {
    key: `disability-${counter}`,
    id: null,
    grade: "",
    startedOn: "",
    ongoing: true,
    endedOn: "",
  };
}

/** A pessoa mexeu neste intervalo? Um em branco não reprova o cadastro. */
export function hasDisabilityInput(draft: DisabilityPeriodDraft): boolean {
  return Boolean(draft.grade || draft.startedOn || draft.endedOn);
}

/** Algum intervalo preenchido na lista. */
export function hasAnyDisabilityInput(
  drafts: readonly DisabilityPeriodDraft[],
): boolean {
  return drafts.some(hasDisabilityInput);
}

/**
 * Valida a lista inteira, devolvendo os erros por chave de intervalo.
 *
 * A lista inteira, e não um intervalo de cada vez, porque duas das regras são
 * relações entre intervalos: sobreposição e "um só em aberto". Validar item a
 * item deixaria passar exatamente o erro que estraga o cálculo.
 *
 * @param today `YYYY-MM-DD` — entra por parâmetro para o teste não depender do
 *   relógio, e para que "futuro" signifique o mesmo dia em toda a validação.
 */
export function validateDisabilityPeriods(
  drafts: readonly DisabilityPeriodDraft[],
  today: string,
): Record<string, DisabilityPeriodErrors> {
  const result: Record<string, DisabilityPeriodErrors> = {};
  const filled = drafts.filter(hasDisabilityInput);

  for (const draft of filled) {
    const errors: DisabilityPeriodErrors = {};

    if (!draft.grade) {
      errors.grade = "Escolha o grau da deficiência.";
    }
    if (!draft.startedOn) {
      errors.startedOn = "Informe a data de início.";
    } else if (draft.startedOn > today) {
      errors.startedOn = "A deficiência não pode começar no futuro.";
    }

    if (!draft.ongoing) {
      if (!draft.endedOn) {
        // Desmarcar "se mantém" é afirmar que cessou; a data passa a ser
        // obrigatória, senão o intervalo não tem fim nem é em aberto.
        errors.endedOn = "Informe a data de cessação, ou marque que se mantém.";
      } else if (draft.startedOn && draft.endedOn < draft.startedOn) {
        errors.endedOn = "A cessação é anterior ao início.";
      } else if (draft.endedOn > today) {
        errors.endedOn =
          "A cessação não pode ser no futuro. Para uma deficiência em curso, marque que se mantém.";
      }
    }

    if (Object.keys(errors).length > 0) result[draft.key] = errors;
  }

  // Sobreposição: só entre intervalos que já têm início, e sem repetir a
  // acusação nos dois lados — quem chega depois na lista é quem recebe o erro.
  for (let i = 0; i < filled.length; i += 1) {
    const current = filled[i];
    if (!current.startedOn || result[current.key]?.startedOn) continue;

    for (let j = 0; j < i; j += 1) {
      const previous = filled[j];
      if (!previous.startedOn) continue;

      const currentEnd = current.ongoing || !current.endedOn ? today : current.endedOn;
      const previousEnd =
        previous.ongoing || !previous.endedOn ? today : previous.endedOn;

      const overlaps =
        current.startedOn <= previousEnd && previous.startedOn <= currentEnd;
      if (overlaps) {
        result[current.key] = {
          ...result[current.key],
          startedOn: `Este intervalo se sobrepõe ao que começa em ${formatDateBR(previous.startedOn)}.`,
        };
        break;
      }
    }
  }

  return result;
}

/**
 * Os intervalos completos o bastante para entrar no cálculo.
 *
 * Um intervalo pela metade não participa: mostrar um total que muda de valor
 * conforme a pessoa termina de digitar a data seria pior que não mostrar nada.
 */
export function convertibleIntervals(
  drafts: readonly DisabilityPeriodDraft[],
  today: string,
): ConvertibleInterval[] {
  return drafts
    .filter(
      (draft): draft is DisabilityPeriodDraft & { grade: DisabilityGradeKey } =>
        Boolean(draft.grade) &&
        Boolean(draft.startedOn) &&
        draft.startedOn <= today &&
        (draft.ongoing || Boolean(draft.endedOn)),
    )
    .filter(
      (draft) =>
        daysBetween(draft.startedOn, draft.ongoing ? today : draft.endedOn) > 0,
    )
    .map((draft) => ({
      grade: draft.grade,
      startedOn: draft.startedOn,
      endedOn: draft.ongoing ? null : draft.endedOn,
    }));
}

export type DisabilityPeriodRequest = {
  grade: string;
  startedOn: string;
  /** Ausente quando se mantém até a presente data. */
  endedOn?: string;
};

/**
 * O corpo do POST/PUT.
 *
 * `endedOn` é **omitido** quando o intervalo está em aberto, e não enviado como
 * `null`: no contrato do backend, ausência é a resposta afirmativa de "não
 * houve cessação". Enviar a chave com null daria no mesmo hoje, mas a omissão é
 * o que o contrato documenta.
 */
export function toDisabilityPeriodRequest(
  draft: DisabilityPeriodDraft,
): DisabilityPeriodRequest {
  const body: DisabilityPeriodRequest = {
    grade: draft.grade,
    startedOn: draft.startedOn,
  };
  if (!draft.ongoing && draft.endedOn) body.endedOn = draft.endedOn;
  return body;
}

/** A resposta do servidor de volta para rascunho — usado na edição da ficha. */
export function disabilityDraftFromResponse(source: {
  id?: string;
  grade?: string;
  startedOn?: string;
  endedOn?: string | null;
  ongoing?: boolean;
}): DisabilityPeriodDraft {
  counter += 1;
  const ongoing = source.ongoing ?? !source.endedOn;
  return {
    key: `disability-${counter}`,
    id: source.id ?? null,
    grade: getDisabilityGradeKeyByLabel(source.grade) ?? "",
    startedOn: source.startedOn ?? "",
    ongoing,
    endedOn: ongoing ? "" : (source.endedOn ?? ""),
  };
}
