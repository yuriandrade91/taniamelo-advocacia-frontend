"use client";

import type { LoginResponse } from "@/interfaces/auth/Auth.interface";

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

export type SessionUser = {
  fullName: string;
  email: string;
  role: string;
  tenantSlug: string;
};

/** Iniciais para o avatar: "Tânia Melo" -> "TM". */
export function initialsOf(fullName?: string): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

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

export function clearSessionUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada a fazer */
  }
}
