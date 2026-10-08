"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@heroui/react";
import { SectionTitle } from "@/components/ui/layout/Card";
import { Pill } from "@/components/ui/feedback/Badges";

/**
 * Moldura de gráfico: título, legenda e a área de desenho.
 *
 * A legenda é **HTML, não a do Chart.js**, por um motivo específico: o texto
 * usa tinta de texto (`text-gray-100`) e a cor da série vive só no quadradinho
 * ao lado. Rótulo pintado com a cor da série vira decoração e cansa a leitura;
 * a identidade é do marcador.
 *
 * Legenda aparece a partir de **duas séries**. Com uma só, o título já diz o
 * que está plotado e uma caixa com um quadradinho apenas repete o título.
 */

export type ChartLegendItem = { label: string; color: string };

export type ChartCardProps = {
  title: string;
  subtitle?: string;
  legend?: ChartLegendItem[];
  /** Altura da área de desenho. O canvas precisa de altura definida. */
  height?: number;
  /** Mensagem quando não há o que desenhar — nunca um gráfico vazio. */
  emptyMessage?: string;
  isEmpty?: boolean;
  /**
   * Marca o gráfico como dado de exemplo.
   *
   * Existe porque a alternativa é pior: um gráfico plausível sem aviso vira
   * número que alguém repete numa reunião. O selo é discreto mas não some, e
   * quando as rotas subirem ele desaparece sozinho junto com o mock.
   */
  isSample?: boolean;
  /** Carregando: título e legenda ficam; subtítulo e área do gráfico viram skeleton. */
  isLoading?: boolean;
  children: ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  legend,
  height = 240,
  emptyMessage = "Sem dados para o período.",
  isEmpty = false,
  isSample = false,
  isLoading = false,
  children,
}: ChartCardProps) {
  const showLegend = (isLoading || !isEmpty) && legend && legend.length >= 2;

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* O mesmo título dos cartões da Home (`SectionTitle`, como no
              Balanço): os gráficos dividem a linha com a rosca, e dois
              tamanhos de título lado a lado liam como hierarquias diferentes.
              O sublinhado dourado vem junto. */}
          <span className="flex flex-wrap items-start gap-2">
            <SectionTitle>{title}</SectionTitle>
            {isSample && (
              <Pill tone="soft" className="mt-1 tracking-wide uppercase">
                dados de exemplo
              </Pill>
            )}
          </span>
          {isLoading ? (
            <Skeleton className="mt-2 h-3 w-48 rounded-md" />
          ) : (
            subtitle && <p className="mt-2 text-xs text-gray-100">{subtitle}</p>
          )}
        </div>

        {showLegend && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {legend.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-1.5 text-xs text-gray-100"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="mt-4" style={{ height }}>
        {isLoading ? (
          <Skeleton className="h-full w-full rounded-xl" />
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-page/60 text-sm text-gray-100/70">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
