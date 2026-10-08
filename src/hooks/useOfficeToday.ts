"use client";

import { useEffect, useState } from "react";
import { msUntilNextOfficeDay, officeToday } from "@/lib/officeClock";

/**
 * Que dia é no escritório (`yyyy-MM-dd`) — e o valor muda sozinho quando o
 * dia vira.
 *
 * Irmão do `useNow`, para o que só se importa com a data: em vez de acordar a
 * cada minuto para escrever o mesmo dia, agenda um único timer para a próxima
 * meia-noite do escritório.
 *
 * Timer só não basta. Navegador estrangula timer de aba em segundo plano, e
 * computador que dorme não conta o tempo dormido: a aba aberta ontem à tarde e
 * acordada hoje de manhã dispararia o timer horas depois. Por isso o dia
 * também é relido quando a aba volta a ficar visível ou ganha foco — é o
 * momento em que alguém vai olhar para a tela.
 *
 * Reler o mesmo dia não redesenha nada: o React descarta `setState` com o
 * mesmo valor.
 */
export function useOfficeToday(): string {
  const [today, setToday] = useState(() => officeToday());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const sync = () => {
      clearTimeout(timer);
      setToday(officeToday());
      timer = setTimeout(sync, msUntilNextOfficeDay());
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    timer = setTimeout(sync, msUntilNextOfficeDay());
    document.addEventListener("visibilitychange", syncWhenVisible);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return today;
}
