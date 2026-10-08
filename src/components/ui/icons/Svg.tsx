import type { ReactNode } from "react";

/**
 * A moldura de todo ícone de traço da casa: `currentColor` (quem usa o ícone
 * pinta pela classe de texto), pontas e junções redondas, `aria-hidden` (o
 * nome vai no botão, não no desenho). Server Component — só props para JSX.
 *
 * Os módulos de ícone (`actions`, `glyphs`, os da agenda e do navbar) tinham
 * cada um a sua cópia desta moldura; o traço de um ícone mudava de arquivo
 * para arquivo sem ninguém decidir.
 */

export type IconProps = { className?: string };

export function Svg({
  className = "h-4 w-4",
  strokeWidth = 1.8,
  viewBox = "0 0 24 24",
  children,
}: IconProps & { strokeWidth?: number; viewBox?: string; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}
