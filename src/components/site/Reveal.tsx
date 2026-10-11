"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Entra em cena quando chega à tela: sobe, ganha opacidade e foco.
 *
 * Uma vez visível, fica — rolar de volta não esconde o que já foi lido. Sem
 * `IntersectionObserver` (ou com "reduzir movimento", pelo CSS), o conteúdo
 * aparece direto: a animação é enfeite, nunca condição para ler.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Atraso em ms — para cartões de uma grade entrarem em cascata. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // O estado vive no próprio elemento (`data-visible`): marcar a entrada não
  // precisa renderizar o componente de novo.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.visible = "true";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.visible = "true";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ "--site-delay": `${delay}ms` } as CSSProperties}
      className={`site-reveal ${className}`}
    >
      {children}
    </div>
  );
}
