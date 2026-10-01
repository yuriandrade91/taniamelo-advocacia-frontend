/**
 * Conversão do tempo de contribuição entre graus de deficiência (LC 142/2013).
 *
 * <h2>Por que existe uma cópia disto no frontend</h2>
 *
 * O cálculo também vive no backend (`DisabilityTimeConversion.java`), e isto é
 * duplicação consciente, não descuido. A tela precisa mostrar o tempo
 * convertido **enquanto a pessoa digita** — inclusive antes de o cliente
 * existir, no meio do cadastro, quando não há `clientId` para consultar. A
 * alternativa seria uma requisição por tecla digitada, que além de lenta não
 * funcionaria no caso que importa.
 *
 * As duas cópias são mantidas idênticas pela mesma asserção dos dois lados: as
 * 32 células das duas tabelas, conferidas em `disabilityTime.test.ts` aqui e em
 * `DisabilityTimeConversionTest.java` lá. Se uma divergir, um dos dois quebra.
 *
 * Quem grava é sempre o servidor; isto é projeção para a tela.
 *
 * <h2>O multiplicador é uma divisão</h2>
 *
 * O fator é o tempo exigido no destino dividido pelo exigido na origem. Mulher,
 * de grave (20 anos) para a regra geral (30): 1,50. Homem, de 25 para 35: 1,40.
 *
 * O sentido se confere pelo significado: dez anos com deficiência grave são
 * metade de uma carreira de 20, e meia carreira de 30 são 15 — então o fator de
 * 20 para 30 tem de ser maior que 1. Tempo cumprido sob deficiência mais severa
 * vale MAIS quando convertido para uma base menos severa.
 */
import {
  REQUIRED_YEARS,
  type DisabilityGradeKey,
} from "@/enums/disabilityGrade/DisabilityGrade";

/** Dias por ano e por mês na contagem de tempo de contribuição. */
const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30;

/**
 * As duas colunas da LC 142/2013. Não há terceira: ver {@link requiredYears}.
 */
export type ConversionBasis = "FEMININO" | "MASCULINO";

/**
 * Converte o sexo na base de conversão, ou `null` quando a lei não tem coluna
 * para ele.
 *
 * Aceita as duas formas porque as duas circulam: o formulário guarda a CHAVE do
 * enum (`FEMININO`), e a API devolve o RÓTULO (`Feminino`). Exigir uma só
 * obrigaria quem chama a saber de onde o valor veio — e o dia em que errasse, a
 * conversão simplesmente não apareceria, sem erro nenhum para investigar.
 */
export function basisFromGender(gender?: string | null): ConversionBasis | null {
  if (!gender) return null;
  const normalized = gender.trim().toLowerCase();
  if (normalized === "feminino" || normalized === "f") return "FEMININO";
  if (normalized === "masculino" || normalized === "m") return "MASCULINO";
  return null;
}

/**
 * Anos exigidos num grau, para a base informada.
 *
 * A LC 142/2013 tem duas colunas, mulher e homem — não há linha para
 * "não-binário" nem "outro". Cair no masculino por omissão seria um arbítrio
 * jurídico invisível: o número sairia certo na tela e errado no processo. Por
 * isso a base é um tipo de dois valores e quem não tem base não chega aqui —
 * `basisFromGender` devolve `null` e a tela diz por quê.
 */
export function requiredYears(
  grade: DisabilityGradeKey,
  basis: ConversionBasis,
): number {
  const [woman, man] = REQUIRED_YEARS[grade];
  return basis === "FEMININO" ? woman : man;
}

/**
 * O multiplicador entre dois graus, com duas casas — é este número que a
 * tabela mostra e que a tela exibe ao lado do intervalo.
 *
 * Serve para explicar o resultado, não para produzi-lo: {@link convertDays}
 * não passa por ele. `1,1666…` em ponto flutuante, usado como passo
 * intermediário, produz uma diferença que não se explica para quem contesta o
 * cálculo.
 */
export function factor(
  from: DisabilityGradeKey,
  to: DisabilityGradeKey,
  basis: ConversionBasis,
): number {
  const ratio = requiredYears(to, basis) / requiredYears(from, basis);
  return Math.round(ratio * 100) / 100;
}

/** O fator formatado como a tabela escreve: "1,50". */
export function formatFactor(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

/**
 * Converte dias de um grau para outro: uma multiplicação e uma divisão,
 * arredondando ao dia. Mesmo grau devolve o valor intacto, sem arredondar.
 */
export function convertDays(
  days: number,
  from: DisabilityGradeKey,
  to: DisabilityGradeKey,
  basis: ConversionBasis,
): number {
  if (from === to) return days;
  return Math.round(
    (days * requiredYears(to, basis)) / requiredYears(from, basis),
  );
}

/** Dias corridos entre duas datas ISO, contando o primeiro e o último dia. */
export function daysBetween(startISO: string, endISO: string): number {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const end = Date.parse(`${endISO}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export type TimeBreakdown = {
  totalDays: number;
  years: number;
  months: number;
  days: number;
  /** "33 anos, 11 meses e 5 dias" — omite o que for zero. */
  label: string;
};

export function breakdownOfDays(totalDays: number): TimeBreakdown {
  const total = Math.max(Math.trunc(totalDays), 0);
  const years = Math.floor(total / DAYS_PER_YEAR);
  const afterYears = total % DAYS_PER_YEAR;
  const months = Math.floor(afterYears / DAYS_PER_MONTH);
  const days = afterYears % DAYS_PER_MONTH;
  return { totalDays: total, years, months, days, label: timeLabel(years, months, days) };
}

/** "33 anos, 11 meses e 5 dias"; "0 dias" quando tudo é zero. */
export function timeLabel(years: number, months: number, days: number): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (parts.length === 0) return "0 dias";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

/** Um intervalo, no mínimo que o cálculo precisa saber dele. */
export type ConvertibleInterval = {
  grade: DisabilityGradeKey;
  /** `YYYY-MM-DD` */
  startedOn: string;
  /** `YYYY-MM-DD`, ou `null`/`""` quando se mantém até a presente data. */
  endedOn?: string | null;
};

export type ConversionLine = {
  grade: DisabilityGradeKey;
  gradeYears: number;
  days: number;
  factor: number;
  convertedDays: number;
};

export type ConversionResult = {
  convertedTo: DisabilityGradeKey;
  targetYears: number;
  lines: ConversionLine[];
  total: TimeBreakdown;
};

/**
 * Converte cada intervalo pelo **seu** grau e soma.
 *
 * É o ponto do mecanismo. Somar primeiro e converter depois daria outro
 * número, e errado: não existe um grau único que descreva uma carreira com
 * graus diferentes — um ano sob deficiência grave e um ano sob deficiência leve
 * não valem o mesmo.
 *
 * A conta volta aberta (uma linha por intervalo, com fator e resultado) porque
 * este número vai para dentro de um requerimento, e quem o defende precisa
 * poder mostrar de onde saiu.
 *
 * @param today `YYYY-MM-DD` — o fim de um intervalo em aberto. Entra por
 *   parâmetro em vez de ser lido aqui para que todas as linhas usem o mesmo
 *   dia, e para que o cálculo seja testável sem relógio.
 */
export function convertIntervals(
  intervals: readonly ConvertibleInterval[],
  to: DisabilityGradeKey,
  basis: ConversionBasis,
  today: string,
): ConversionResult {
  const lines = intervals.map((interval) => {
    const end = interval.endedOn ? interval.endedOn : today;
    const days = daysBetween(interval.startedOn, end);
    return {
      grade: interval.grade,
      gradeYears: requiredYears(interval.grade, basis),
      days,
      factor: factor(interval.grade, to, basis),
      convertedDays: convertDays(days, interval.grade, to, basis),
    };
  });

  const totalDays = lines.reduce((sum, line) => sum + line.convertedDays, 0);
  return {
    convertedTo: to,
    targetYears: requiredYears(to, basis),
    lines,
    total: breakdownOfDays(totalDays),
  };
}
