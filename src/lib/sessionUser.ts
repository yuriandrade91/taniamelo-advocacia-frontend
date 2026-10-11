"use client";

import type { LoginResponse } from "@/interfaces/auth/Auth.interface";
import { STORED_VALUE_EVENT } from "@/hooks/useStoredValue";

/**
 * Usuário da sessão, persistido localmente.
 *
 * O `LoginResponse` traz `fullName`, `email` e `role`, mas nada disso era
 * guardado — depois do login a informação se perdia, e a única forma de
 * recuperá-la seria decodificar o JWT (que não é contrato público) ou chamar a
 * API a cada render. Guardamos aqui o mínimo para a UI.
 *
 * Não é fonte de verdade de autorização: quem autoriza é o backend. Isto serve
 * só para exibição (nome no menu, iniciais no avatar).
 */

const STORAGE_KEY = "session_user";

/** Avisa quem está na tela que o usuário da sessão mudou. */
function announce(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORED_VALUE_EVENT));
}

export type SessionUser = {
  fullName: string;
  email: string;
  role: string;
  tenantSlug: string;
};

export function saveSessionUser(response: LoginResponse): void {
  if (typeof window === "undefined") return;
  const user: SessionUser = {
    fullName: response.fullName ?? "",
    email: response.email ?? "",
    role: response.role ?? "",
    tenantSlug: response.tenantSlug ?? "",
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    announce();
  } catch {
    // Modo privativo ou storage cheio: seguir sem persistir é aceitável,
    // a UI cai no estado "sem dados".
  }
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    // Conteúdo do storage é dado externo: só aceitamos se tiver o mínimo.
    if (typeof parsed?.fullName !== "string") return null;
    return {
      fullName: parsed.fullName,
      email: parsed.email ?? "",
      role: parsed.role ?? "",
      tenantSlug: parsed.tenantSlug ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Atualiza só o que mudou, mantendo o resto.
 *
 * Existe porque "Meus dados" salva nome e e-mail sem passar por um login novo:
 * sem isto o menu continuaria com o nome antigo até a pessoa sair e entrar, e
 * a tela pareceria não ter salvado.
 */
export function patchSessionUser(partial: Partial<SessionUser>): void {
  if (typeof window === "undefined") return;
  const current = getSessionUser();
  if (!current) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...partial }),
    );
    announce();
  } catch {
    /* mesmo caso do save: seguir sem persistir */
  }
}

export function clearSessionUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    announce();
  } catch {
    /* nada a fazer */
  }
}

/*
 * Leitura com referência estável.
 *
 * `getSessionUser` monta um objeto novo a cada chamada, e `useSyncExternalStore`
 * compara por identidade: devolver um objeto diferente a cada leitura o faria
 * concluir "mudou" para sempre, em laço. Guardamos o texto cru e só remontamos
 * quando ele muda de verdade.
 */
let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

export function sessionUserSnapshot(): SessionUser | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = getSessionUser();
  }
  return cachedUser;
}
