"use client";

import { useEffect, useState } from "react";

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

const DEBOUNCE_MS = 450;

export type UseAppointmentConflictsOptions = {
  /** ISO-8601, ou `null` enquanto a data não está completa. */
  startAt: string | null;
  endAt: string | null;
  /** Compromisso sendo editado — não conflita consigo mesmo. */
  excludeId?: string;
  enabled?: boolean;
};

export type UseAppointmentConflictsResult = {
  conflicts: AppointmentResponse[];
  isChecking: boolean;
};

export function useAppointmentConflicts({
  startAt,
  endAt,
  excludeId,
  enabled = true,
}: UseAppointmentConflictsOptions): UseAppointmentConflictsResult {
  const [conflicts, setConflicts] = useState<AppointmentResponse[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [debounced, setDebounced] = useState<{
    startAt: string | null;
    endAt: string | null;
  }>({ startAt, endAt });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ startAt, endAt }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [startAt, endAt]);

  useEffect(() => {
    const from = debounced.startAt;
    const to = debounced.endAt;

    /**
     * Janela incompleta ou invertida não é consultada. O backend devolveria
     * lista vazia de qualquer forma — não perguntar poupa a viagem e evita
     * piscar "nenhum conflito" enquanto a pessoa ainda está digitando.
     */
    if (!enabled || !from || !to || to <= from) {
      setConflicts([]);
      setIsChecking(false);
      return;
    }

    // `active` evita que uma resposta antiga sobrescreva uma mais recente
    // quando a pessoa continua ajustando o horário.
    let active = true;
    setIsChecking(true);

    getAppointmentConflicts({ startAt: from, endAt: to, excludeId })
      .then((envelope) => {
        if (active) setConflicts(envelope?.data ?? []);
      })
      .catch(() => {
        // Falhar a checagem não pode atrapalhar quem está agendando: sem
        // conflito conhecido, a tela simplesmente não avisa nada.
        if (active) setConflicts([]);
      })
      .finally(() => {
        if (active) setIsChecking(false);
      });

    return () => {
      active = false;
    };
  }, [debounced, excludeId, enabled]);

  return { conflicts, isChecking };
}
