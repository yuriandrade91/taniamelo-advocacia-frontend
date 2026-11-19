"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "./shared";

const COUNT_MS = 2450;
const TEXT_REVEAL_MS = 650;

/** Rápido no começo, devagar na chegada: o número "assenta" no valor. */
const easeOut = (progress: number) => 1 - (1 - progress) ** 4;

/**
 * "+1.500" → prefixo "+", 1500, sufixo ""; "98%" → "", 98, "%". Valores sem
 * número, como "IA", aparecem depois de uma espera. O ponto é separador de milhar.
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
  const isText = parseCount(value) === null;

  useEffect(() => {
    const node = ref.current;
    const count = parseCount(value);
    if (!node || reduced || typeof IntersectionObserver === "undefined") return;

    const show = (current: number) => {
      if (!count) return;
      const { prefix, suffix } = count;
      node.textContent = `${prefix}${current.toLocaleString("pt-BR")}${suffix}`;
    };
    let timer = 0;
    let frame = 0;
    const run = () => {
      let startedAt = 0;
      let textRevealed = false;
      const tick = (now: number) => {
        startedAt ||= now;
        const progress = Math.min(1, (now - startedAt) / COUNT_MS);
        if (count) {
          if (progress < 1) show(Math.round(count.amount * easeOut(progress)));
          else node.textContent = value;
        } else if (
          !textRevealed &&
          progress >= (COUNT_MS - TEXT_REVEAL_MS) / COUNT_MS
        ) {
          node.textContent = value;
          node.classList.remove("pr-count-typing");
          node.classList.add("pr-count-revealing");
          textRevealed = true;
        }
        if (progress < 1) frame = requestAnimationFrame(tick);
        else node.classList.remove("pr-count-revealing");
      };
      frame = requestAnimationFrame(tick);
    };

    if (count) show(0);
    else node.classList.add("pr-count-typing");

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
      node.classList.remove("pr-count-typing");
      node.classList.remove("pr-count-revealing");
    };
  }, [value, delay, reduced]);

  return (
    <>
      <span className="sr-only">{value}</span>
      <span className={isText ? "relative inline-grid" : undefined}>
        <span
          ref={ref}
          aria-hidden="true"
          className={isText ? "col-start-1 row-start-1" : undefined}
        >
          {value}
        </span>
        {isText && (
          <span
            aria-hidden="true"
            className="pr-count-thinking col-start-1 row-start-1 hidden items-center justify-center gap-1"
          >
            <span className="pr-chat-dot h-1.5 w-1.5 rounded-full bg-secondary" />
            <span className="pr-chat-dot h-1.5 w-1.5 rounded-full bg-secondary" />
            <span className="pr-chat-dot h-1.5 w-1.5 rounded-full bg-secondary" />
          </span>
        )}
      </span>
    </>
  );
}
