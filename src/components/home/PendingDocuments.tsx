"use client";

import React from "react";
import { Card, SectionTitle, StatusBadge } from "./ui";

export type PendingDocumentItem = {
  id: string;
  /** Nome do cliente. */
  name: string;
  /** Pendência (ex.: "RG Expirado", "CNIS incompleto"). */
  issue: string;
  /** `true` destaca em vermelho (documento inválido/vencido). */
  isCritical?: boolean;
};

export type PendingDocumentsProps = {
  items: PendingDocumentItem[];
  onSelect?: (id: string) => void;
  className?: string;
};

/** Lista de clientes com documentação pendente. */
export default function PendingDocuments({
  items,
  onSelect,
  className = "",
}: PendingDocumentsProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <SectionTitle>Documentações pendentes</SectionTitle>

      <ul className="mt-4">
        {items.length === 0 && (
          <li className="py-6 text-sm text-gray-100/50">
            Nenhuma pendência de documentação.
          </li>
        )}

        {items.map((item) => (
          <li key={item.id} className="border-t border-black/5 first:border-t-0">
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              className="flex w-full items-center justify-between gap-4 rounded-lg px-2 py-3 text-left hover:bg-light-gray/50"
            >
              <span className="min-w-0 truncate text-sm text-primary">
                {item.name}
              </span>
              <StatusBadge
                label={item.issue}
                tone={item.isCritical ? "danger" : "neutral"}
              />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
