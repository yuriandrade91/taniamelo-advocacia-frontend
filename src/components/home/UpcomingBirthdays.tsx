"use client";

import { Skeleton } from "@heroui/react";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import { MONTH_SHORT } from "@/constants/date/months";
import { plural } from "@/lib/format";
import { BIRTHDAY_LIMIT, birthdayCountdown, type BirthdayPerson } from "./birthdays";

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
 * O ladrilho de data é o mesmo da Agenda (mês em cima, dia embaixo; azul
 * cheio quando é hoje): é a mesma pergunta — "quando" —, e duas respostas com
 * desenhos diferentes na mesma tela custam atenção sem dar nada.
 *
 * `items` em `null` é "ainda carregando": o cartão mostra linhas em skeleton,
 * nunca o "ninguém faz aniversário", que é uma afirmação diferente.
 */

export type UpcomingBirthdaysProps = {
  /** `null` enquanto a listagem não respondeu. */
  items: BirthdayPerson[] | null;
  /**
   * A listagem respondeu, mas sem `birthDate` em ninguém — o campo não está no
   * `ClientListResponseDTO` desta instância do backend.
   *
   * É um estado próprio porque "não sei" não é "não tem": dizer "nenhum
   * aniversário nos próximos 30 dias" com 124 clientes na base seria uma
   * afirmação falsa, e quem lê não tem como desconfiar dela.
   */
  isUnavailable?: boolean;
  className?: string;
};

/** O esqueleto ocupa o espaço do que vem: cinco linhas, não três. */
const SKELETON_ROWS = BIRTHDAY_LIMIT;

export default function UpcomingBirthdays({
  items,
  isUnavailable = false,
  className = "",
}: UpcomingBirthdaysProps) {
  const isLoading = items === null;

  return (
    <Card className={`flex flex-col ${className}`}>
      <header>
        <SectionTitle>Aniversariantes</SectionTitle>
        <p className="mt-2 text-xs text-gray-100/70">
          Os próximos {BIRTHDAY_LIMIT}
        </p>
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
      ) : isUnavailable ? (
        <p className="mt-4 py-6 text-sm text-gray-100/60">
          Os aniversários dependem da data de nascimento, que a listagem de
          clientes ainda não traz.
        </p>
      ) : items.length === 0 ? (
        // Sem janela, isto só acontece com a base vazia: qualquer cliente com
        // data de nascimento tem um próximo aniversário.
        <p className="mt-4 py-6 text-sm text-gray-100/60">
          Nenhum cliente com data de nascimento cadastrada.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {items.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-1 py-2">
              <BirthdayRow person={person} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Uma linha: quando, quem, quantos anos faz e quanto falta.
 *
 * Sem ação: não há como abrir a ficha de um cliente a partir de outra tela —
 * a listagem não lê id nem busca da URL. Um botão que não leva a lugar nenhum
 * é pior que texto, e era o que o cartão anterior fazia.
 */
function BirthdayRow({ person }: { person: BirthdayPerson }) {
  const [, month, day] = person.date.split("-").map(Number);
  const isToday = person.inDays <= 0;

  return (
    <>
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
        <span className="block truncate text-sm text-primary">{person.name}</span>
        {person.turning !== null && (
          <span className="block text-xs text-gray-100/70 tabular-nums">
            faz {plural(person.turning, "ano", "anos")}
          </span>
        )}
      </span>

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
