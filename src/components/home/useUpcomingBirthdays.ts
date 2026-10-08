"use client";

import { useMemo } from "react";
import { useOfficeToday } from "@/hooks/useOfficeToday";
import { settledValue, useSettled } from "@/hooks/useSettled";
import { toDayNumber } from "@/lib/period";
import { listUpcomingBirthdays } from "@/services/clientService";
import {
  BIRTHDAY_LIMIT,
  BIRTHDAY_WINDOW_DAYS,
  toBirthdayPeople,
  type BirthdayPerson,
} from "./birthdays";

export type UpcomingBirthdaysState = {
  /** `null` enquanto a primeira leitura não respondeu. */
  items: BirthdayPerson[] | null;
  /** A leitura falhou (o interceptor já avisou): "não sei" não é "ninguém". */
  failed: boolean;
};

/**
 * Os próximos aniversariantes, sempre a partir de hoje.
 *
 * Dois relógios mantêm o cartão certo com a página aberta:
 *
 * - **a lista na tela** é recontada contra o dia atual (`useOfficeToday`) a
 *   cada render — quando o dia vira, quem fez aniversário ontem sai na hora;
 * - **a leitura** é refeita uma vez por dia: o dia entra como `version` do
 *   `useSettled`, então a virada pede os cinco do dia novo e a lista anterior
 *   (já sem os de ontem) fica na tela até a resposta chegar, sem voltar ao
 *   skeleton.
 */
export function useUpcomingBirthdays(limit = BIRTHDAY_LIMIT): UpcomingBirthdaysState {
  const today = useOfficeToday();
  const settled = useSettled(
    `upcoming-birthdays:${limit}`,
    () =>
      Promise.allSettled([
        listUpcomingBirthdays({ days: BIRTHDAY_WINDOW_DAYS, limit }),
      ]),
    toDayNumber(today),
  );

  return useMemo(() => {
    if (!settled) return { items: null, failed: false };
    const result = settled[0];
    const rows = settledValue(result, null)?.data ?? [];
    return {
      items: toBirthdayPeople(rows, today, limit),
      failed: result?.status === "rejected",
    };
  }, [settled, today, limit]);
}
