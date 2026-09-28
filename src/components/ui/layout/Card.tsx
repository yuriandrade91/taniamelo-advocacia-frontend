import React from "react";

/**
 * Primitivos de layout dos cards.
 *
 * Server Components: só recebem props e devolvem JSX. Estavam junto com
 * badges, ícones e controles num arquivo `home/ui.tsx` — um nome genérico
 * atrai código sem dono e vira arquivo de mil linhas.
 */

/** Card branco padrão das telas internas. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** Título de seção com o sublinhado dourado da marca. */
export function SectionTitle({
  children,
  as: Tag = "h2",
  className = "",
}: {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag className={`inline-flex flex-col gap-1.5 ${className}`}>
      <span className="text-lg font-medium text-primary">{children}</span>
      <span className="h-[2px] w-10 rounded-full bg-secondary" />
    </Tag>
  );
}
