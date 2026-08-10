"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout as authLogout } from "@/services/authService";
import { publicRoutes } from "@/constants/paths/routes";

const MENU_ITEMS = [
  { label: "Início", href: "/home" },
  { label: "Clientes", href: "/clientes" },
  { label: "Documentos", href: "#documentos" },
  { label: "Pagamentos", href: "#pagamentos" },
  { label: "Carteira", href: "#carteira" },
  { label: "Calendário", href: "#calendario" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /** POST /api/v1/auth/logout — revoga o refresh token e limpa a sessão. */
  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await authLogout();
    } finally {
      setSigningOut(false);
      router.push(publicRoutes.login);
    }
  };

  return (
    <header className="mb-6 flex h-16 items-center justify-between gap-4 rounded-2xl bg-primary px-4 text-white md:px-6">
      {/* Logo + divisória dourada */}
      <div className="flex shrink-0 items-center gap-4">
        <Image
          src="../svg/white-logo.svg"
          alt="Tânia Melo Advocacia"
          height={96}
          width={96}
          className="h-9 w-auto"
        />
        <span className="hidden h-8 w-px bg-secondary md:block" />
      </div>

      {/* Menu — o item ativo ganha fundo claro translúcido */}
      <nav className="hidden flex-1 md:block">
        <ul className="flex items-center justify-center gap-1">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-white/15 font-medium text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Avatar + menu do usuário */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Menu do usuário"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-medium text-white hover:bg-white/25"
        >
          TM
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-xl border border-black/5 bg-white py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={signingOut}
              className="w-full px-4 py-2 text-left text-sm text-primary hover:bg-light-gray/60 disabled:opacity-50"
            >
              {signingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
