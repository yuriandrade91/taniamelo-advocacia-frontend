"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

import { getAppointmentConflicts } from "@/services/appointmentService";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

/**
 * Compromissos que já ocupam a faixa de horário sendo escolhida.
 *
 * Existe pelo mesmo motivo do `useClientSearch`: um componente cujo trabalho é
 * renderizar campos não deveria abrir conexão HTTP. Aqui vale ainda mais,
 * porque o formulário de compromisso é usado em dois lugares — o card da home e
 * a página da agenda — e a checagem precisa se comportar igual nos dois.
 *
 * ## É aviso, não bloqueio
 *
 * O backend não recusa por conflito, e este hook também não impede nada:
 * perícia e audiência às vezes se sobrepõem de propósito. O resultado serve
 * para a tela mostrar *com quem* o horário bate e deixar quem agenda decidir.
 *
 * ## Por que o debounce
 *
 * As datas mudam a cada segmento digitado (dia, mês, hora, minuto). Sem espera,
 * escolher um horário dispararia uma dezena de requisições, e a maioria sobre
 * datas intermediárias que a pessoa nunca quis.
 */

type UseAppointmentConflictsOptions = {
  /** ISO-8601, ou `null` enquanto a data não está completa. */
  startAt: string | null;
  endAt: string | null;
  /** Compromisso sendo editado — não conflita consigo mesmo. */
  excludeId?: string;
  enabled?: boolean;
};

type UseAppointmentConflictsResult = {
  conflicts: AppointmentResponse[];
  isChecking: boolean;
};

export function useAppointmentConflicts({
  startAt,
  endAt,
  excludeId,
  enabled = true,
}: UseAppointmentConflictsOptions): UseAppointmentConflictsResult {
  /** A janela como texto: compara por valor e espera a digitação parar. */
  const key = useDebouncedValue(`${startAt ?? ""}|${endAt ?? ""}|${excludeId ?? ""}`);
  const [from, to] = key.split("|");
  /**
   * Janela incompleta ou invertida não é consultada: o backend devolveria
   * vazio, e não perguntar evita piscar "nenhum conflito" no meio da digitação.
   */
  const active = enabled && Boolean(from && to && to > from);
  const [result, setResult] = useState<{ key: string; conflicts: AppointmentResponse[] } | null>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    getAppointmentConflicts({ startAt: from, endAt: to, excludeId })
      // Falhar a checagem não atrapalha quem agenda: sem conflito conhecido, não há aviso.
      .then((envelope) => envelope?.data ?? [], () => [])
      .then((conflicts) => {
        if (alive) setResult({ key, conflicts });
      });
    return () => {
      alive = false;
    };
    // `from`, `to` e `excludeId` entram pela `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  const isCurrent = active && result?.key === key;
  return { conflicts: isCurrent ? result.conflicts : [], isChecking: active && !isCurrent };
}
