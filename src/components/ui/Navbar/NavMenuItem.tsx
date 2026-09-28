"use client";

import Link from "next/link";
import React, { useCallback, useState } from "react";

/**
 * Item do menu.
 *
 * Quem se move é **só o fundo**: uma camada atrás do rótulo que entra por
 * `animate__slideInLeft` no hover e sai por `animate__slideOutRight` ao tirar o
 * mouse. O texto fica parado — antes era ele que deslizava, o que embaralhava a
 * leitura.
 *
 * A camada só existe enquanto há interação (ou enquanto o item está ativo);
 * fora disso ela é desmontada, senão a animação de entrada dispararia sozinha
 * no primeiro render de cada item.
 *
 * `overflow-hidden` no link mantém o fundo dentro da pílula ao deslizar.
 */

type Phase = "idle" | "entering" | "leaving";

const DURATION_MS = 300;

export type NavMenuItemProps = {
  href: string;
  label: string;
  isActive: boolean;
};

export default function NavMenuItem({
  href,
  label,
  isActive,
}: NavMenuItemProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  const enter = useCallback(() => setPhase("entering"), []);
  const leave = useCallback(
    () => setPhase((current) => (current === "entering" ? "leaving" : current)),
    [],
  );

  /** Fim da saída: desmonta a camada. O fim da entrada não muda nada. */
  const handleAnimationEnd = useCallback(() => {
    setPhase((current) => (current === "leaving" ? "idle" : current));
  }, []);

  // No item ativo o fundo é permanente — não anima, só está lá.
  const showBackground = isActive || phase !== "idle";

  const backgroundAnimation = isActive
    ? ""
    : phase === "entering"
      ? "animate__animated animate__slideInLeft"
      : phase === "leaving"
        ? "animate__animated animate__slideOutRight"
        : "";

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      className={`relative block overflow-hidden rounded-full px-7 py-3 text-base transition-colors ${
        isActive ? "font-medium text-white" : "text-white/70 hover:text-white"
      }`}
    >
      {showBackground && (
        <span
          aria-hidden="true"
          onAnimationEnd={handleAnimationEnd}
          style={{ ["--animate-duration" as string]: `${DURATION_MS}ms` }}
          className={`absolute inset-0 rounded-full bg-white/15 ${backgroundAnimation}`}
        />
      )}

      {/* `relative` para o rótulo ficar acima da camada de fundo. */}
      <span className="relative">{label}</span>
    </Link>
  );
}
