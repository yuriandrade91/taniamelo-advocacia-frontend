"use client";

import React from "react";
import StatCard, { type StatCardProps } from "./StatCard";
import { Card, MonthPill, SectionTitle } from "./ui";

export type PendingFormsProps = {
  /**
   * Quantidade de formulários que ainda não viraram clientes.
   *
   * Aceita texto para o "—" de carregamento: mostrar `0` enquanto a contagem
   * não chega pisca "ninguém esperando" antes do número real, que é a
   * informação oposta da verdadeira.
   */
  count: number | string;
  period: string;
  /** Indicadores exibidos na base do card. */
  stats: StatCardProps[];
  onContact?: () => void;
  onChangePeriod?: () => void;
  className?: string;
};

/**
 * Card "Formulários pendentes" — destaque do topo da home.
 * Agrega o contador de leads e os três indicadores do período.
 */
export default function PendingForms({
  count,
  period,
  stats,
  onContact,
  onChangePeriod,
  className = "",
}: PendingFormsProps) {
  return (
    <Card className={className}>
      <header className="flex items-start justify-between gap-4">
        <SectionTitle>Formulários pendentes</SectionTitle>
        <MonthPill label={period} onClick={onChangePeriod} />
      </header>

      <div className="mt-5 flex items-center gap-4">
        {/* Contador em círculo com anel dourado, como no design. */}
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-secondary/50 text-2xl font-semibold text-primary">
          {count}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-gray-100">
            pessoas que ainda não se tornaram clientes
          </p>
          <button
            type="button"
            onClick={onContact}
            className="mt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Entrar em contato
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
    </Card>
  );
}
