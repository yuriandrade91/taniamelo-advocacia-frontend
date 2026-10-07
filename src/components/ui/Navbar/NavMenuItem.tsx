"use client";

import Link from "next/link";
import React from "react";
import { useSlideHover } from "@/hooks/useSlideHover";

/**
 * Item do menu.
 *
 * O fundo desliza no hover e o texto fica parado (`useSlideHover`, o mesmo
 * efeito dos botões segmentados dos filtros). `overflow-hidden` no link mantém
 * o fundo dentro da pílula ao deslizar.
 */

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
  const { handlers, showLayer, layer } = useSlideHover(isActive);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      {...handlers}
      className={`relative block overflow-hidden rounded-full px-7 py-3 text-base transition-colors ${
        isActive ? "font-medium text-white" : "text-white/70 hover:text-white"
      }`}
    >
      {showLayer && (
        <span {...layer} className={`${layer.className} rounded-full bg-white/15`} />
      )}

      {/* `relative` para o rótulo ficar acima da camada de fundo. */}
      <span className="relative">{label}</span>
    </Link>
  );
}
