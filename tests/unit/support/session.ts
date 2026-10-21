import { applySession, clearSession } from "@/lib/session";

/**
 * Entra como alguém do escritório: grava a sessão pelo mesmo caminho do login
 * (`applySession`), então permissões, nome no menu e token saem do lugar de
 * verdade.
 */
export function signIn(role: "ADMIN" | "LAWYER" | "STAFF" = "ADMIN", fullName = "Tânia Melo") {
  applySession({
    token: "token-de-teste",
    expiresInSeconds: 3600,
    tenantId: "tenant-1",
    tenantSlug: "tania",
    fullName,
    email: "tania@exemplo.com",
    role,
  } as never);
}

export const signOut = () => clearSession();
