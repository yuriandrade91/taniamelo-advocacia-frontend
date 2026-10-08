"use client";

import { useSyncExternalStore } from "react";
import { sessionUserSnapshot, type SessionUser } from "@/lib/sessionUser";
import { STORED_VALUE_EVENT } from "@/hooks/useStoredValue";

/**
 * O usuário da sessão, acompanhando mudanças.
 *
 * O menu lia uma vez, num efeito de montagem — e o navbar não remonta ao
 * navegar. Quem salvava "Meus dados" via o nome antigo no avatar até sair e
 * entrar de novo, e concluía que não tinha salvado. Aqui a leitura é uma
 * assinatura: `patchSessionUser` avisa, e quem mostra o nome redesenha.
 *
 * No HTML pré-gerado não existe `localStorage`: o servidor devolve `null` e o
 * valor entra na hidratação, sem divergência.
 */
export function useSessionUser(): SessionUser | null {
  return useSyncExternalStore(subscribe, sessionUserSnapshot, () => null);
}

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORED_VALUE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORED_VALUE_EVENT, onChange);
  };
};
