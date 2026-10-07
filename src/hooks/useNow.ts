"use client";

import { useEffect, useState } from "react";

/**
 * O relógio da tela: `Date.now()` que se atualiza sozinho.
 *
 * Existe porque "agora" não é um valor, é um evento. Quem lê `Date.now()` no
 * render congela o instante da montagem: a linha do compromisso das 14h
 * continua dizendo "em 5 minutos" às 14h30, porque nada mandou o React
 * desenhar de novo. O intervalo é o que faz o tempo passar na tela.
 *
 * Um minuto por padrão — é a menor unidade que a interface mostra ("em 3
 * minutos", "há 2 horas"). Mais curto seria redesenhar a lista para escrever
 * o mesmo texto.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
