"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PendingForms from "@/components/home/PendingForms";
import UpcomingRevenues from "@/components/home/UpcomingRevenues";
import ContributorPipeline, {
  type PipelineCard,
} from "@/components/home/ContributorPipeline";
import MonthlyBalance from "@/components/home/MonthlyBalance";
import PendingDocuments from "@/components/home/PendingDocuments";
import { clients as fetchClients, patchClient } from "@/services/clientService";
import {
  getSituationKeyByLabel,
  type SituationKey,
} from "@/enums/situation/Situation";
import { privateRoutes } from "@/constants/paths/routes";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
};

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<PipelineCard[]>([]);

  // ── Esteira: clientes reais agrupados por situação ──
  useEffect(() => {
    let active = true;

    fetchClients({ pageNumber: 1, pageSize: 50 })
      .then((envelope) => {
        if (!active) return;
        const items = envelope?.data ?? [];

        setCards(
          items
            .map((client) => {
              // A API devolve o LABEL do enum (@JsonValue); convertemos para a chave.
              const situation = getSituationKeyByLabel(client.situation);
              if (!client.id || !situation) return null;
              return {
                id: String(client.id),
                name: client.fullName,
                date: formatDate(client.createdAt),
                situation,
              } satisfies PipelineCard;
            })
            .filter((c): c is PipelineCard => c !== null),
        );
      })
      .catch(() => {
        /* o axiosService já exibe o toast de erro */
      });

    return () => {
      active = false;
    };
  }, []);

  /** Arrastar um card = PATCH /api/v1/clients/{id} { situation }. */
  const handleMove = useCallback((cardId: string, situation: SituationKey) => {
    patchClient(cardId, { situation }).catch(() => {
      /* erro já sinalizado pelo interceptor; a UI revalida no próximo load */
    });
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* ── Formulários pendentes + Próximas receitas ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* TODO(backend): não há endpoint de métricas — valores ilustrativos. */}
        <PendingForms
          count={6}
          period="Novembro"
          stats={[
            {
              title: "Formulários preenchidos",
              value: 20,
              total: 30,
              period: "Novembro",
              delta: 10,
              highlighted: true,
            },
            {
              title: "Clientes contemplados",
              value: 10,
              total: 20,
              period: "Novembro",
              delta: -10,
            },
            {
              title: "Clientes em exigência",
              value: 10,
              total: 20,
              period: "Novembro",
              delta: -10,
            },
          ]}
        />

        {/* TODO(backend): agregar de clientPaymentService quando houver endpoint. */}
        <UpcomingRevenues
          items={[
            { id: "1", name: "Yuri Andrade", date: "28/12/2024", status: "ATRASADO" },
            { id: "2", name: "Anderson Reis", date: "28/12/2024", status: "ATRASADO" },
            { id: "3", name: "Eumazaro Reis", date: "10/02/2025", status: "PENDENTE" },
            { id: "4", name: "Tania Melo", date: "03/04/2024", status: "PAGO" },
          ]}
        />
      </section>

      {/* ── Esteira (drag & drop) ── */}
      <ContributorPipeline
        cards={cards}
        onMove={handleMove}
        onSeeFullFlow={() => router.push(privateRoutes.home)}
      />

      {/* ── Balanço + pendências ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        {/* TODO(backend): derivar de clientPaymentService.
            As cores saem de BALANCE_PALETTE (literais: o Chart.js desenha em
            canvas, onde `var(--…)` não resolve). */}
        <MonthlyBalance
          total={2684}
          period="Novembro"
          slices={[
            { label: "Honorários", percentage: 46 },
            { label: "Custas", percentage: 25 },
            { label: "Acordos", percentage: 16 },
            { label: "Consultas", percentage: 8 },
            { label: "Outros", percentage: 5 },
          ]}
        />
        {/* TODO(backend): derivar de clientFileService (documentos faltantes). */}
        <PendingDocuments
          items={[
            {
              id: "1",
              name: "Davis Souza Martins",
              issue: "RG Expirado",
              isCritical: true,
            },
            { id: "2", name: "Mariana Fontes", issue: "CNIS incompleto" },
          ]}
        />
      </section>
    </div>
  );
}
