"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout as authLogout } from "@/services/authService";
import { publicRoutes } from "@/constants/paths/routes";
import {
  getSessionUser,
  initialsOf,
  type SessionUser,
} from "@/lib/sessionUser";
import { useAnimatedPresence } from "@/hooks/useAnimatedPresence";
import { LogoutIcon, UserIcon } from "./icons";

/**
 * Avatar + painel com os dados do usuário logado.
 *
 * ⚠️ Requer um ancestral posicionado (`relative`) — no navbar, o grupo de
 * ações. O painel ancora nele, e não neste botão, para abrir na mesma posição
 * da central de notificações.
 *
 * Os dados vêm de `lib/sessionUser`, gravado no login/refresh a partir do
 * `LoginResponse` — antes o `fullName`/`email`/`role` chegavam e eram
 * descartados, e o avatar exibia um "TM" fixo no código.
 *
 * A leitura acontece em `useEffect` (e não no `useState` inicial) porque
 * `localStorage` não existe no servidor: ler durante a renderização causaria
 * divergência de hidratação.
 */

export type UserMenuProps = {
  className?: string;
};

export default function UserMenu({ className = "" }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mesma gramática de movimento da central de notificações: o painel desce
  // do gatilho ao abrir e sobe ao fechar.
  const panel = useAnimatedPresence(isOpen, {
    enter: "animate__slideInDown",
    exit: "animate__slideOutUp",
    durationMs: 320,
  });

  useEffect(() => {
    setUser(getSessionUser());
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  /** POST /api/v1/auth/logout — revoga o refresh token e limpa a sessão. */
  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await authLogout();
    } finally {
      setIsSigningOut(false);
      router.push(publicRoutes.login);
    }
  };

  const initials = initialsOf(user?.fullName) || "TM";

  return (
    /* Sem `relative` pelo mesmo motivo da central: ambos ancoram no grupo de
       ações do navbar, para abrirem na mesma posição. */
    <div ref={containerRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={
          user?.fullName ? `Menu de ${user.fullName}` : "Menu do usuário"
        }
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-medium text-white hover:bg-white/25 cursor-pointer"
      >
        {initials}
      </button>

      {panel.shouldRender && (
        /* Mesmo recorte da central de notificações: sem ele o `slideInDown`
           partiria de 100% da altura do painel, muito acima do avatar. O fade
           sincroniza a sombra com a saída — senão sobra uma caixa vazia
           sombreada enquanto o conteúdo já subiu. */
        <div
          style={panel.style}
          className={`absolute right-0 z-30 mt-3 w-64 overflow-hidden rounded-2xl shadow-xl animate__animated ${
            panel.isLeaving ? "animate__fadeOut" : "animate__fadeIn"
          }`}
        >
          <div
            ref={panel.ref}
            style={panel.style}
            role="menu"
            className={`overflow-hidden rounded-2xl border border-black/5 bg-white ${panel.className}`}
          >
          {/* ── Identificação ── */}
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-primary">
                {user?.fullName || "Sessão ativa"}
              </span>
              <span className="block truncate text-xs text-gray-100/70">
                {user?.email || "—"}
              </span>
              {user?.role && (
                <span className="mt-1 inline-flex rounded-md bg-light-secondary px-2 py-0.5 text-[11px] font-medium text-secondary">
                  {user.role}
                </span>
              )}
            </span>
          </div>

          {/* ── Escritório (multi-tenancy) ── */}
          {user?.tenantSlug && (
            <div className="border-b border-black/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-100/50">
                Escritório
              </p>
              <p className="mt-0.5 truncate text-sm text-primary">
                {user.tenantSlug}
              </p>
            </div>
          )}

          {/* ── Ações ── */}
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-primary hover:bg-light-gray/50 cursor-pointer"
            >
              <UserIcon className="h-4 w-4 text-gray-100/60" />
              Meus dados
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={isSigningOut}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger hover:bg-danger/5 disabled:opacity-50 cursor-pointer"
            >
              <LogoutIcon className="h-4 w-4" />
              {isSigningOut ? "Saindo..." : "Sair"}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
