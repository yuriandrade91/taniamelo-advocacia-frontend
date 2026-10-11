"use client";

import { Skeleton } from "@heroui/react";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import { ContactAction } from "@/components/ui/actions/ContactAction";
import { WhatsappIcon } from "@/components/ui/icons/ContactIcons";
import { whatsappLink } from "@/lib/contactLinks";
import { MONTH_SHORT } from "@/constants/date/months";
import { plural } from "@/lib/format";
import {
  BIRTHDAY_LIMIT,
  birthdayCountdown,
  birthdayMessage,
  type BirthdayPerson,
} from "./birthdays";

/**
 * Aniversariantes — quem completa idade nos próximos dias.
 *
 * Um telefonema no dia certo é a manutenção mais barata de relacionamento que
 * um escritório tem, e a informação só serve ANTES: por isso o cartão olha
 * para frente e põe "hoje" e "amanhã" por escrito, em vez de deixar a pessoa
 * calcular a diferença entre duas datas.
 *
 * São sempre os **próximos cinco** (`BIRTHDAY_LIMIT`), perto ou longe. A
 * versão anterior só mostrava quem estivesse dentro de 30 dias, e numa base
 * pequena isso era um cartão vazio quase o ano inteiro — "nenhum nos próximos
 * 30 dias" é verdade e não serve para nada. Quem é o próximo serve sempre, e
 * a contagem ao lado já diz se ele está longe.
 *
 * E a lista anda com o calendário: quem fez aniversário ontem sai quando o
 * dia vira, mesmo com a página aberta desde ontem, e os cinco são relidos
 * para o dia novo (`useUpcomingBirthdays`).
 *
 * O ladrilho de data é o mesmo da Agenda (mês em cima, dia embaixo; azul
 * cheio quando é hoje): é a mesma pergunta — "quando" —, e duas respostas com
 * desenhos diferentes na mesma tela custam atenção sem dar nada.
 *
 * `items` em `null` é "ainda carregando": o cartão mostra linhas em skeleton,
 * nunca o "ninguém faz aniversário", que é uma afirmação diferente.
 *
 * Clicar na pessoa abre a ficha dela (`onViewClient`).
 */

export type UpcomingBirthdaysProps = {
  /**
   * `null` enquanto a primeira leitura não respondeu. Já vem sem quem fez
   * aniversário antes de hoje — ver `useUpcomingBirthdays`.
   */
  items: BirthdayPerson[] | null;
  /**
   * A leitura falhou (o interceptor já avisou).
   *
   * É um estado próprio porque "não sei" não é "não tem": dizer "nenhum
   * cliente com data de nascimento" com a base cheia seria uma afirmação
   * falsa, e quem lê não tem como desconfiar dela.
   */
  failed?: boolean;
  /** Abre a ficha do cliente. */
  onViewClient: (person: BirthdayPerson) => void;
  className?: string;
};

/** O esqueleto ocupa o espaço do que vem: cinco linhas, não três. */
const SKELETON_ROWS = BIRTHDAY_LIMIT;

export default function UpcomingBirthdays({
  items,
  failed = false,
  onViewClient,
  className = "",
}: UpcomingBirthdaysProps) {
  const isLoading = items === null;

  return (
    <Card className={`flex flex-col ${className}`}>
      <header>
        <SectionTitle>Aniversariantes</SectionTitle>
      </header>

      {isLoading ? (
        <ul className="mt-4 flex flex-col gap-1" aria-hidden="true">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-1 py-2">
              <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40 max-w-full rounded-md" />
                <Skeleton className="h-2.5 w-20 rounded-md" />
              </span>
              <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      ) : failed ? (
        <p className="mt-4 py-6 text-sm text-gray-100/60">
          Não foi possível carregar os aniversariantes agora.
        </p>
      ) : items.length === 0 ? (
        // A janela é o ano inteiro: isto só acontece quando nenhum cliente
        // ativo tem data de nascimento — todo aniversário cai em 365 dias.
        <p className="mt-4 py-6 text-sm text-gray-100/60">
          Nenhum cliente com data de nascimento cadastrada.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {items.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-1 py-2">
              <BirthdayRow person={person} onView={() => onViewClient(person)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Uma linha: quando, quem, quantos anos faz, quanto falta — e o parabéns.
 *
 * No dia do aniversário, o WhatsApp — antes do selo — abre a conversa com a
 * mensagem do escritório já escrita (`birthdayMessage`); nada sai sozinho, a
 * pessoa revisa e envia. Sem celular no cadastro, o botão não aparece em vez
 * de virar link quebrado.
 */
function BirthdayRow({ person, onView }: { person: BirthdayPerson; onView: () => void }) {
  const [, month, day] = person.date.split("-").map(Number);
  const isToday = person.inDays <= 0;

  return (
    <>
      {/* O ladrilho e o nome são um botão só: o alvo é a linha, não as letras. */}
      <button
        type="button"
        onClick={onView}
        aria-label={`Abrir a ficha de ${person.name}`}
        className="-my-1 -ml-1 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl py-1 pl-1 text-left transition outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-secondary/60"
      >
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl ${
            isToday ? "bg-primary text-white" : "bg-page text-primary"
          }`}
        >
          <span className="text-[9px] tracking-wider uppercase opacity-70">
            {MONTH_SHORT[month - 1]}
          </span>
          <span className="text-base leading-none font-semibold tabular-nums">
            {String(day).padStart(2, "0")}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-primary">
            {person.name}
          </span>
          {person.turning !== null && (
            <span className="block text-xs text-gray-100/70 tabular-nums">
              faz {plural(person.turning, "ano", "anos")}
            </span>
          )}
        </span>
      </button>

      {/* Só no dia: parabéns antes da data soa a lembrete, não a carinho. */}
      {isToday && (
        <ContactAction
          href={whatsappLink(person.phone ?? undefined, birthdayMessage(person))}
          label={
            person.isWhatsapp
              ? `Mandar parabéns para ${person.name} no WhatsApp`
              : `Chamar ${person.name} no WhatsApp para dar parabéns`
          }
          tone="success"
        >
          <WhatsappIcon className="h-5 w-5" />
        </ContactAction>
      )}

      {/* "hoje" ganha o dourado da marca; o resto é um selo neutro, para a
          contagem não competir com o nome. */}
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
          isToday ? "bg-secondary text-white" : "bg-light-gray text-gray-100"
        }`}
      >
        {birthdayCountdown(person.inDays)}
      </span>
    </>
  );
}
