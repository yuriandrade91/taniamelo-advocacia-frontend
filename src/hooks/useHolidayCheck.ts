"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";

import type { HolidayCheck } from "@/interfaces/appointment/Appointment.interface";
import { createSessionCache } from "@/lib/requestCache";
import { getHolidayCheck } from "@/services/appointmentService";

/**
 * Feriado não muda: cada dia é perguntado uma vez por sessão, não a cada vez
 * que a pessoa passa por ele no formulário.
 */
const holidayCache = createSessionCache<HolidayCheck | null>();

/** Menos que isso é a digitação do ano ainda no meio (`0002`, `0020`, `0202`). */
const MIN_YEAR = 1000;

type UseHolidayCheckOptions = {
  /** `YYYY-MM-DD`, ou `""` enquanto não há dia — e para o dia que a pessoa já decidiu manter. */
  day: string;
  enabled?: boolean;
};

/**
 * O dia escolhido é feriado nacional? Só devolve a resposta quando ela é do
 * dia que está no campo **agora**: mexer na data some com a pergunta na hora e
 * a refaz, se for o caso, quando a digitação para.
 *
 * É aviso, não bloqueio — como `useAppointmentConflicts`: se a consulta falha,
 * não há feriado conhecido e quem agenda segue.
 *
 * O debounce existe porque os segmentos da data se confirmam um a um; sem ele,
 * "02/11/2026" perguntaria por todo ano intermediário que a digitação passa.
 */
export function useHolidayCheck({ day, enabled = true }: UseHolidayCheckOptions): {
  holiday: HolidayCheck | null;
} {
  const settled = useDebouncedValue(day);
  const active = enabled && Number(settled.slice(0, 4)) >= MIN_YEAR;
  const [result, setResult] = useState<{ day: string; holiday: HolidayCheck | null } | null>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    holidayCache
      .load(settled, () => getHolidayCheck(settled).then((envelope) => envelope?.data ?? null))
      // Falhar a consulta não atrapalha quem agenda: sem feriado conhecido, não há pergunta.
      .then((holiday) => holiday, () => null)
      .then((holiday) => {
        if (alive) setResult({ day: settled, holiday });
      });
    return () => {
      alive = false;
    };
  }, [active, settled]);

  const isCurrent = active && result?.day === day;
  return { holiday: isCurrent ? result.holiday : null };
}
