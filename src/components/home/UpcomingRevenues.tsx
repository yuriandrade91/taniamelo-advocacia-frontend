"use client";

import React from "react";
import type { PaymentStatusKey } from "@/enums/payment/Payment";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import { CalendarIcon } from "@/components/ui/icons/CalendarIcon";
import { SeeAllLink } from "./ui";
import { StatusBadge, type BadgeTone } from "@/components/ui/feedback/Badges";
import { Skeleton } from "@heroui/react";

/**
 * Status exibido na lista. `ATRASADO` não existe no enum do backend — é
 * derivado do campo `overdue` de `ClientPaymentResponse`.
 */
export type RevenueStatus = PaymentStatusKey | "ATRASADO";

const STATUS_STYLE: Record<
  RevenueStatus,
  { label: string; dot: string; tone: BadgeTone }
> = {
  ATRASADO: { label: "Atrasado", dot: "bg-danger", tone: "danger" },
  PENDENTE: { label: "A vencer", dot: "bg-gray-100/25", tone: "neutral" },
  PAGO: { label: "Pago", dot: "bg-success", tone: "success" },
  CANCELADO: { label: "Cancelado", dot: "bg-gray-100/20", tone: "neutral" },
};

export type RevenueItem = {
  id: string;
  name: string;
  /** Data já formatada (ex.: "28/12/2024"). */
  date: string;
  status: RevenueStatus;
};

export type UpcomingRevenuesProps = {
  items: RevenueItem[];
  onSeeAll?: () => void;
  className?: string;
  /** Carregando: linhas no formato do item, no lugar da lista. */
  isLoading?: boolean;
};

/** Lista "Próximas receitas" — alimentada por `clientPaymentService`. */
export default function UpcomingRevenues({
  items,
  onSeeAll,
  className = "",
  isLoading = false,
}: UpcomingRevenuesProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <SectionTitle>Próximas receitas</SectionTitle>

      <ul className="mt-5 flex flex-1 flex-col gap-4">
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3" aria-hidden="true">
              <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
              <span className="min-w-0 flex-1">
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </span>
              <Skeleton className="h-3.5 w-20 shrink-0 rounded-md" />
              <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
            </li>
          ))}

        {!isLoading && items.length === 0 && (
          <li className="text-sm text-gray-100/60">
            Nenhuma receita prevista.
          </li>
        )}

        {items.map((item) => {
          const style = STATUS_STYLE[item.status];
          return (
            <li key={item.id} className="flex items-center gap-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />

              <span className="min-w-0 flex-1 truncate text-sm text-primary">
                {item.name}
              </span>

              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-gray-100/70">
                <CalendarIcon />
                {item.date}
              </span>

              <StatusBadge label={style.label} tone={style.tone} />
            </li>
          );
        })}
      </ul>

      <SeeAllLink onClick={onSeeAll} />
    </Card>
  );
}
