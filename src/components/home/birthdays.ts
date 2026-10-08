import { daysBetween } from "@/lib/period";
import { OFFICE_NAME } from "@/constants/office";
import type { UpcomingBirthdayResponse } from "@/interfaces/client/Client.interface";

/**
 * Os próximos aniversários — hoje e os que vêm, nunca os que já passaram.
 *
 * ## Quem faz a conta
 *
 * O backend (`GET /clients/upcoming-birthdays`). Ele sabe a base inteira, acha
 * a próxima ocorrência de cada aniversário no fuso do escritório e devolve os
 * N mais perto, já ordenados — com `nextBirthday`, `daysUntil` e `turningAge`.
 * Antes a Home baixava a listagem inteira para fazer essa conta aqui; agora é
 * uma requisição de cinco linhas. As regras de calendário (virada de ano,
 * 29/02 comemorado em 28/02 em ano comum) moram só lá, no `Birthdays.java`.
 *
 * ## O que sobra para a tela
 *
 * Manter a resposta honesta enquanto a página fica aberta. O `daysUntil` vale
 * para o dia em que o servidor respondeu: deixada aberta de um dia para o
 * outro, a Home diria "hoje" para o aniversário de ontem. Por isso a contagem
 * é refeita contra o dia atual a partir de `nextBirthday` (que não muda), e o
 * que ficou para trás sai da lista na hora — antes mesmo de a releitura do dia
 * novo chegar para completar os cinco.
 */

/**
 * Quantos o cartão mostra.
 *
 * Não há janela curta de dias. Uma janela de 30 dias deixava o cartão vazio na
 * maior parte do ano em base pequena — e cartão vazio não é informação, é
 * espaço ocupado dizendo "nada aqui". Olhando sempre para os próximos N, o
 * cartão sempre responde "quem é o próximo", que é a pergunta que ele existe
 * para responder. Quando o próximo está longe, a contagem ao lado diz isso.
 */
export const BIRTHDAY_LIMIT = 5;

/**
 * A janela pedida ao backend: o ano inteiro (o teto que ele aceita). É o
 * "sem janela" do cartão — qualquer cliente com data de nascimento tem um
 * próximo aniversário dentro de 365 dias.
 */
export const BIRTHDAY_WINDOW_DAYS = 365;

export type BirthdayPerson = {
  id: string;
  name: string;
  /** A data do próximo aniversário, em ISO (`yyyy-MM-dd`). */
  date: string;
  /** Dias até lá — `0` é hoje. */
  inDays: number;
  /**
   * Quantos anos completa. `null` quando o número não faz sentido (zero ou
   * negativo, com data de nascimento errada): melhor não afirmar idade do que
   * afirmar errado.
   */
  turning: number | null;
  /** Celular, para o parabéns pelo WhatsApp; `null` sem número. */
  phone: string | null;
  /** O cadastro diz que o celular é WhatsApp — muda só o rótulo do botão. */
  isWhatsapp: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * As linhas da API, contadas a partir de `today` (`yyyy-MM-dd`, no fuso do
 * escritório): sem os aniversários que já passaram, mais perto primeiro, até
 * `limit`.
 *
 * Linha sem id, nome ou `nextBirthday` legível é ignorada em vez de virar uma
 * linha quebrada no cartão.
 */
export function toBirthdayPeople(
  rows: readonly UpcomingBirthdayResponse[],
  today: string,
  limit = BIRTHDAY_LIMIT,
): BirthdayPerson[] {
  return rows
    .flatMap((row) => {
      const name = row.fullName?.trim();
      const date = row.nextBirthday?.slice(0, 10);
      if (!row.clientId || !name || !date || !ISO_DATE.test(date)) return [];

      const inDays = daysBetween(today, date);
      // Passou: o dia virou com a página aberta. Sai agora; a releitura do
      // dia novo traz a próxima ocorrência (no ano que vem) se ainda couber.
      if (inDays < 0) return [];

      return [
        {
          id: String(row.clientId),
          name,
          date,
          inDays,
          turning: row.turningAge > 0 ? row.turningAge : null,
          phone: row.mobilePhone?.trim() || null,
          isWhatsapp: row.isWhatsapp !== false,
        },
      ];
    })
    // O backend já ordena; ordenar de novo custa nada e não deixa a tela
    // depender disso. Empate resolvido pelo nome, como lá.
    .sort((a, b) => a.inDays - b.inDays || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, limit);
}

/** "hoje", "amanhã", "em 5 dias" — o que o selo da linha diz. */
export function birthdayCountdown(inDays: number): string {
  if (inDays <= 0) return "hoje";
  if (inDays === 1) return "amanhã";
  return `em ${inDays} dias`;
}

/**
 * O parabéns do dia, escrito em nome do escritório.
 *
 * Pelo primeiro nome, como numa conversa — o nome inteiro soa a cobrança. A
 * idade fica de fora: o número, em mensagem de escritório, não acrescenta
 * carinho e pode incomodar. O botão só aparece no dia, então a frase pode
 * dizer "hoje".
 *
 * Nada é enviado sozinho: o link abre a conversa com o texto pronto para
 * revisar.
 */
export function birthdayMessage(person: Pick<BirthdayPerson, "name">): string {
  const first = person.name.trim().split(/\s+/)[0] ?? person.name;
  return (
    `Olá, ${first}! 🎉 Hoje é o seu dia, e toda a equipe do escritório ${OFFICE_NAME} ` +
    `deseja a você um feliz aniversário, com muita saúde, paz e alegria. ` +
    `Agradecemos a confiança de sempre. Um grande abraço!`
  );
}
