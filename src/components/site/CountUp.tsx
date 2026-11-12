"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./shared";

const COUNT_MS = 1800;

/** Rápido no começo, devagar na chegada: o número "assenta" no valor. */
const easeOut = (progress: number) => 1 - (1 - progress) ** 4;

/**
 * "+1.500" → prefixo "+", 1500, sufixo ""; "98%" → "", 98, "%". Sem número
 * ("IA"), `null`: não há o que contar. O ponto é separador de milhar (pt-BR).
 */
export function parseCount(value: string) {
  const match = /^(\D*)(\d[\d.]*)(\D*)$/.exec(value);
  if (!match) return null;
  return { prefix: match[1], amount: Number(match[2].replace(/\./g, "")), suffix: match[3] };
}

/**
 * Mostra o valor contando de zero até ele quando chega à tela.
 *
 * O HTML sai com o valor final: busca, leitor de tela e quem está sem
 * JavaScript veem o número certo, e é o que fica sem `IntersectionObserver` ou
 * com "reduzir movimento". A contagem escreve direto no elemento, como o
 * `Reveal`: cada quadro não precisa renderizar o componente de novo. O leitor
 * de tela ouve só o valor final, não os números do caminho.
 */
export function CountUp({
  value,
  delay = 0,
}: Readonly<{
  value: string;
  /** Atraso em ms depois de chegar à tela — para a contagem começar com o `Reveal` já visível. */
  delay?: number;
}>) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const node = ref.current;
    const count = parseCount(value);
    if (!node || !count || reduced || typeof IntersectionObserver === "undefined") return;

    const { prefix, amount, suffix } = count;
    const show = (current: number) => {
      node.textContent = `${prefix}${current.toLocaleString("pt-BR")}${suffix}`;
    };

    let timer = 0;
    let frame = 0;
    const run = () => {
      let startedAt = 0;
      const tick = (now: number) => {
        startedAt ||= now;
        const progress = Math.min(1, (now - startedAt) / COUNT_MS);
        if (progress < 1) {
          show(Math.round(amount * easeOut(progress)));
          frame = requestAnimationFrame(tick);
        } else {
          // O texto original, não o reformatado: o que está no conteúdo é o que fica.
          node.textContent = value;
        }
      };
      frame = requestAnimationFrame(tick);
    };

    show(0);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = window.setTimeout(run, delay);
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.5 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      node.textContent = value;
    };
  }, [value, delay, reduced]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
    </>
  );
}
