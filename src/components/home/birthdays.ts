import { daysBetween, toDayNumber, todayIso } from "@/lib/period";

/**
 * Os próximos aniversários — sempre os mesmos cinco, até eles chegarem.
 *
 * ## Por que a conta é em (mês, dia), não em datas
 *
 * Aniversário não é uma data: é uma data que se repete. A pergunta "faltam
 * quantos dias" se responde achando a PRÓXIMA ocorrência do par (mês, dia) a
 * partir de hoje — este ano se ainda não passou, o ano que vem se já passou.
 * É isso que faz 02/01 aparecer para quem olha a tela em 28/12.
 *
 * ## 29 de fevereiro
 *
 * Em ano comum não existe `yyyy-02-29`, e montar essa string daria uma data
 * que nenhuma aritmética de calendário aceita. Quem nasceu em 29/02 comemora
 * em 01/03 nos anos comuns — é a regra do Código Civil para contagem de prazo
 * (art. 132, §3º) e a que qualquer agenda usa.
 *
 * ## O dado
 *
 * `birthDate` vem de `GET /clients` — e, no contrato de hoje, o
 * `ClientListResponseDTO` **não** traz o campo (ver `docs/BACKEND_PANORAMA.md`
 * §7). Quem faltar com a data é ignorado em vez de virar linha sem
 * aniversário: a função trabalha com quem tem.
 */

/**
 * Quantos o cartão mostra.
 *
 * Não há janela de dias. Uma janela de 30 dias deixava o cartão vazio na
 * maior parte do ano em base pequena — e cartão vazio não é informação, é
 * espaço ocupado dizendo "nada aqui". Olhando sempre para os próximos N, o
 * cartão sempre responde "quem é o próximo", que é a pergunta que ele existe
 * para responder. Quando o próximo está longe, a contagem ao lado diz isso.
 */
export const BIRTHDAY_LIMIT = 5;

export type BirthdayPerson = {
  id: string;
  name: string;
  /** A data do próximo aniversário, em ISO (`yyyy-MM-dd`). */
  date: string;
  /** Dias até lá — `0` é hoje. */
  inDays: number;
  /**
   * Quantos anos completa. `null` quando a data de nascimento não permite
   * dizer (ano no futuro): melhor não afirmar idade do que afirmar errado.
   */
  turning: number | null;
};

/** O mínimo que a função precisa de um cliente — não o shape inteiro. */
export type BirthdaySource = {
  id?: string;
  fullName?: string;
  birthDate?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** Partes de um `yyyy-MM-dd` plausível, ou `null`. */
function parseBirthDate(iso: string | undefined) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** O aniversário dentro de `year` — 29/02 cai em 01/03 em ano comum. */
function occurrenceIn(year: number, month: number, day: number): string {
  if (month === 2 && day === 29 && !isLeapYear(year)) return `${year}-03-01`;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function upcomingBirthdays(
  clients: readonly BirthdaySource[],
  {
    today = todayIso(),
    limit = BIRTHDAY_LIMIT,
  }: { today?: string; limit?: number } = {},
): BirthdayPerson[] {
  const thisYear = Number(today.slice(0, 4));

  return clients
    .flatMap((client) => {
      const birth = parseBirthDate(client.birthDate);
      const name = client.fullName?.trim();
      if (!birth || !client.id || !name) return [];

      // Este ano se ainda não passou; o ano que vem se já passou.
      let date = occurrenceIn(thisYear, birth.month, birth.day);
      if (toDayNumber(date) < toDayNumber(today))
        date = occurrenceIn(thisYear + 1, birth.month, birth.day);

      const inDays = daysBetween(today, date);
      const turning = Number(date.slice(0, 4)) - birth.year;
      return [
        {
          id: String(client.id),
          name,
          date,
          inDays,
          turning: turning > 0 ? turning : null,
        },
      ];
    })
    // Mais perto primeiro; empate resolvido pelo nome, para a ordem não
    // depender da ordem em que a listagem veio.
    .sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}

/** "hoje", "amanhã", "em 5 dias" — o que o selo da linha diz. */
export function birthdayCountdown(inDays: number): string {
  if (inDays <= 0) return "hoje";
  if (inDays === 1) return "amanhã";
  return `em ${inDays} dias`;
}
