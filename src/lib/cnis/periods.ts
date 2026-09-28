/**
 * Aritmética de calendário para contagem de tempo.
 *
 * ## Por que não `Date`
 *
 * `new Date("2010-03-01")` é meia-noite UTC. Em UTC-3 isso é 28/02 às 21h, e
 * `getDate()` devolve 28. Um vínculo que começa no dia 1º passaria a começar
 * no mês anterior — e a conta ainda fecharia, com um número plausível.
 *
 * Aqui tudo passa por **dia juliano**: a data vira um inteiro, a diferença é
 * subtração, e não existe fuso para errar.
 *
 * ## Contagem inclusiva
 *
 * Um vínculo de 01/01/2020 a 31/01/2020 tem **31** dias, não 30: o dia da
 * saída é trabalhado. É o art. 19-B da IN 128 e é o primeiro erro clássico de
 * quem implementa isso com uma subtração simples — some 1 por período, e num
 * currículo com 40 vínculos são 40 dias a menos, mais de um mês.
 */

import type { IsoDate } from "./types";

/** Dias no mês, com o ano bissexto do calendário gregoriano. */
export function daysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const table = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[month - 1];
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

/**
 * Dia juliano. Mora em `lib/period.ts` desde que a home passou a precisar dele
 * para medir há quantos dias um formulário está esperando — a aritmética é a
 * mesma, e duas cópias divergiriam na primeira correção.
 */
export { toDayNumber } from "@/lib/period";
// Import além do reexport: o módulo também usa a função internamente.
import { toDayNumber } from "@/lib/period";

/** Inverso de `toDayNumber` (`civil_from_days`). */
export function fromDayNumber(days: number): IsoDate {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra -
    (365 * yearOfEra +
      Math.floor(yearOfEra / 4) -
      Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  const finalYear = month <= 2 ? year + 1 : year;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${finalYear}-${pad(month)}-${pad(day)}`;
}

/** Intervalo fechado nos dois extremos, em dias absolutos. */
export interface DayInterval {
  start: number;
  end: number;
}

export function toInterval(from: IsoDate, to: IsoDate): DayInterval {
  return { start: toDayNumber(from), end: toDayNumber(to) };
}

/** Dias de um intervalo, contando os dois extremos. */
export const intervalDays = (interval: DayInterval): number =>
  interval.end - interval.start + 1;

/**
 * União de intervalos — o tratamento da **concomitância**.
 *
 * Dois empregos ao mesmo tempo são dois vínculos, mas um só tempo de
 * contribuição: o mesmo dia não pode ser contado duas vezes. Somar a duração
 * de cada vínculo é o erro que infla um currículo de carteira assinada dupla
 * em anos inteiros — e é justamente o caso que aparece muito.
 *
 * Intervalos que se encostam (`end + 1 === start`) também são fundidos: entre
 * 31/01 e 01/02 não há buraco.
 */
export function unionIntervals(intervals: DayInterval[]): DayInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  );

  const merged: DayInterval[] = [{ ...sorted[0] }];
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start <= last.end + 1) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

export const totalDays = (intervals: DayInterval[]): number =>
  unionIntervals(intervals).reduce(
    (sum, interval) => sum + intervalDays(interval),
    0,
  );

/** Tempo em anos, meses e dias. */
export interface TimeSpan {
  anos: number;
  meses: number;
  dias: number;
  /** O total bruto — é por ele que se confere a conta. */
  totalDias: number;
}

/**
 * Converte dias em anos/meses/dias pelo critério do INSS: 365 dias por ano,
 * 30 por mês.
 *
 * Não é o calendário — é a convenção da contagem previdenciária (IN 128/2022,
 * art. 19). Contar pelo calendário daria outro número, e o número que vale é
 * este. `totalDias` fica exposto justamente para a conferência não depender de
 * acreditar na conversão.
 */
export function toTimeSpan(days: number): TimeSpan {
  const anos = Math.floor(days / 365);
  const restoAno = days - anos * 365;
  const meses = Math.floor(restoAno / 30);
  const dias = restoAno - meses * 30;
  return { anos, meses, dias, totalDias: days };
}

/** "12 anos, 3 meses e 5 dias". */
export function formatTimeSpan(span: TimeSpan): string {
  const parts: string[] = [];
  if (span.anos) parts.push(`${span.anos} ${span.anos === 1 ? "ano" : "anos"}`);
  if (span.meses) parts.push(`${span.meses} ${span.meses === 1 ? "mês" : "meses"}`);
  if (span.dias) parts.push(`${span.dias} ${span.dias === 1 ? "dia" : "dias"}`);
  if (parts.length === 0) return "nenhum tempo";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

/**
 * Idade completa em anos numa data de referência.
 *
 * Comparação de texto `yyyy-MM-dd`: ordem lexicográfica e ordem cronológica
 * coincidem nesse formato, então não há conversão para errar.
 */
export function ageOn(birthDate: IsoDate, reference: IsoDate): number {
  const birthYear = Number(birthDate.slice(0, 4));
  const referenceYear = Number(reference.slice(0, 4));
  const hadBirthday = reference.slice(5) >= birthDate.slice(5);
  return referenceYear - birthYear - (hadBirthday ? 0 : 1);
}

/**
 * Idade em anos **fracionários**, para as regras cuja exigência tem meia
 * idade — a idade progressiva de 2026 é 59 anos e 6 meses para a mulher, e
 * arredondar isso para 59 ou 60 aprova ou reprova gente errada.
 */
export function ageFractionOn(birthDate: IsoDate, reference: IsoDate): number {
  const years = ageOn(birthDate, reference);
  const pad = (n: number) => String(n).padStart(2, "0");
  const anniversaryYear = Number(birthDate.slice(0, 4)) + years;
  const month = Number(birthDate.slice(5, 7));
  const day = Math.min(
    Number(birthDate.slice(8, 10)),
    daysInMonth(anniversaryYear, month),
  );
  const lastAnniversary = `${anniversaryYear}-${pad(month)}-${pad(day)}`;
  const elapsed = toDayNumber(reference) - toDayNumber(lastAnniversary);
  return years + elapsed / 365;
}

/** `MM/yyyy` → índice absoluto de meses, para ordenar e contar sem calendário. */
export function competenciaToIndex(competencia: string): number | null {
  const match = /^(\d{2})\/(\d{4})$/.exec(competencia.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return Number(match[2]) * 12 + (month - 1);
}

export function indexToCompetencia(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${String(month).padStart(2, "0")}/${year}`;
}

/** Competências de um período, inclusive — usado na carência por vínculo. */
export function competenciasBetween(from: IsoDate, to: IsoDate): string[] {
  const first = Number(from.slice(0, 4)) * 12 + (Number(from.slice(5, 7)) - 1);
  const last = Number(to.slice(0, 4)) * 12 + (Number(to.slice(5, 7)) - 1);
  const result: string[] = [];
  for (let index = first; index <= last; index += 1) {
    result.push(indexToCompetencia(index));
  }
  return result;
}
