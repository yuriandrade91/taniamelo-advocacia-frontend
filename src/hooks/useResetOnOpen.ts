"use client";

import { useState } from "react";

/**
 * Roda `reset` a cada abertura de um diálogo — no render, e não num efeito:
 * o diálogo já abre limpo, sem um quadro com o estado da vez anterior
 * (o ajuste de estado por mudança de prop que o React recomenda).
 */
export function useResetOnOpen(isOpen: boolean, reset: () => void): void {
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) reset();
  }
}
