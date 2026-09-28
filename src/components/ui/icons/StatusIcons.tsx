import React from "react";

/**
 * Ícones de selo/status — indicadores só de leitura (com tooltip), sem ação
 * de clique. Categoria separada de `actions.tsx`, que é para botões.
 */

export function DollarCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle opacity="0.5" cx="12" cy="12" r="10" />
      <path d="M12 17V17.5V18" />
      <path d="M12 6V6.5V7" />
      <path d="M15 9.5C15 8.11929 13.6569 7 12 7C10.3431 7 9 8.11929 9 9.5C9 10.8807 10.3431 12 12 12C13.6569 12 15 13.1193 15 14.5C15 15.8807 13.6569 17 12 17C10.3431 17 9 15.8807 9 14.5" />
    </svg>
  );
}
