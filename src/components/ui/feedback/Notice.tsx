import type { ReactNode } from "react";

/**
 * Um aviso no lugar do conteúdo: a lista vazia ("Nenhum documento
 * adicionado."), a parte que não está no ar, a falha ao ler. Centrado, em
 * fundo claro; `danger` para a falha.
 *
 * As listas paginadas têm o seu (`ListEmpty`, tracejado): lá o vazio ocupa o
 * lugar de uma tabela inteira.
 */
export function Notice({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: "neutral" | "danger";
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={`rounded-2xl px-4 py-6 text-center text-sm ${
        tone === "danger" ? "bg-danger/5 text-danger" : "bg-page text-gray-100"
      } ${className}`}
    >
      {children}
    </p>
  );
}
