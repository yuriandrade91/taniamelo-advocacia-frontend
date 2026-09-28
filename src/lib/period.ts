/**
 * Períodos mensais para as telas financeiras.
 *
 * Tudo em ISO `yyyy-MM-dd` e aritmética sobre UTC. Usar `new Date()` local e
 * `setMonth` parece mais simples e erra em dois lugares clássicos: 31 de março
 * menos um mês vira 3 de março (o dia não existe em fevereiro), e em UTC-3 a
 * virada do mês acontece três horas antes do calendário do usuário.
 *
 * Aqui o mês é sempre representado pelo par (ano, mês) e o intervalo é
 * derivado dele — nunca o contrário.
 */

export type MonthRef = { year: number; month: number }; // month: 1-12
/** `yyyy-MM-dd`, ou qualquer ISO que comece por ele. */
export type IsoDateLike = string;
export type DateRange = { from: string; to: string };

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const pad = (value: number) => String(value).padStart(2, "0");

/** Mês atual segundo o relógio local do usuário — só para posição inicial. */
/**
 * Hoje em `yyyy-MM-dd`, no fuso **local**.
 *
 * `toISOString()` daria UTC: às 21h em UTC-3 devolveria o dia seguinte, e um
 * lançamento feito à noite nasceria com a data de amanhã. Comparação de
 * `LocalDate` é comparação de texto, e este é o texto certo para comparar.
 */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Dias desde uma época fixa (`days_from_civil`, de Howard Hinnant).
 *
 * Inteiro puro: nem `Date`, nem fuso, nem horário de verão. É o que permite
 * subtrair duas datas sem que meia-noite UTC vire o dia anterior no Brasil.
 */
export function toDayNumber(iso: IsoDateLike): number {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));

  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear =
    Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/**
 * Dias inteiros entre duas datas. Negativo quando `to` é anterior a `from`.
 *
 * Aceita ISO com hora (`2026-03-12T18:00:00Z`) porque só lê os dez primeiros
 * caracteres — a parte da data. Para "há quantos dias isso aconteceu", o
 * horário não muda a resposta e considerá-lo só traria o fuso de volta.
 */
export const daysBetween = (from: IsoDateLike, to: IsoDateLike): number =>
  toDayNumber(to) - toDayNumber(from);

export function currentMonth(): MonthRef {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/**
 * Primeiro e último dia do mês, inclusive.
 *
 * O último dia sai do "dia 0 do mês seguinte", que o `Date` resolve sozinho —
 * é o que dá 28 ou 29 em fevereiro sem tabela de bissexto.
 */
export function monthRange({ year, month }: MonthRef): DateRange {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/** Anda `delta` meses, virando o ano quando passa de dezembro ou janeiro. */
export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  // Converte para um índice absoluto de meses: elimina o caso especial da
  // virada do ano, que é onde o `if (month > 12)` costuma faltar.
  const absolute = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(absolute / 12),
    month: (((absolute % 12) + 12) % 12) + 1,
  };
}

/** "Setembro de 2026". */
export function formatMonthLabel({ year, month }: MonthRef): string {
  return `${MONTH_NAMES[month - 1]} de ${year}`;
}

/** "Setembro" — para onde o ano já está claro pelo contexto. */
export function monthName({ month }: MonthRef): string {
  return MONTH_NAMES[month - 1];
}
