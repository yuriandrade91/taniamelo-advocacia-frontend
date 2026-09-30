"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PendingForms from "@/components/home/PendingForms";
import { PendingLeadsModal } from "@/components/home/PendingLeadsModal";
import UpcomingRevenues from "@/components/home/UpcomingRevenues";
import ContributorPipeline, {
  type PipelineCard,
} from "@/components/home/ContributorPipeline";
import MonthlyBalance from "@/components/home/MonthlyBalance";
import PendingDocuments from "@/components/home/PendingDocuments";
import AppointmentsCard from "@/components/home/appointments/AppointmentsCard";
import { clients as fetchClients, patchClient } from "@/services/clientService";
import {
  getSituationKeyByLabel,
  type SituationKey,
} from "@/enums/situation/Situation";
import { privateRoutes } from "@/constants/paths/routes";
import { usePermissoes } from "@/hooks/usePermissoes";
import { listOfficePayments } from "@/services/officePaymentService";
import { getOfficeExpenseSummary } from "@/services/officeExpenseService";
import { toRevenueItems } from "@/components/home/proximasReceitas";
import {
  toBalanceSlices,
  type BalanceSlice,
} from "@/components/wallet/walletOverview";
import { currentMonth, monthName, monthRange } from "@/lib/period";
import type { RevenueItem } from "@/components/home/UpcomingRevenues";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
};

export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  /**
   * Quantos formulários estão pendentes.
   *
   * Vem da mesma consulta que a modal usa (`situation=FORMULARIO_PREENCHIDO`,
   * lendo `pagination.totalRecords`). Não é o tamanho da página: é o total do
   * filtro. Deixar o número fixo aqui faria o cartão dizer 6 e a modal abrir
   * com outra quantidade — e aí nenhum dos dois teria credibilidade.
   */
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  /** D3: dinheiro é só de quem administra. Sem isso, o cartão pede 403. */
  const { podeVerFinanceiro } = usePermissoes();
  const [proximasReceitas, setProximasReceitas] = useState<RevenueItem[]>([]);
  const [saidasDoMes, setSaidasDoMes] = useState<{
    total: number;
    slices: BalanceSlice[];
  }>({ total: 0, slices: [] });

  useEffect(() => {
    if (!podeVerFinanceiro) return;
    let ativo = true;
    const { from, to } = monthRange(currentMonth());

    /**
     * `allSettled`: são dois cartões independentes no meio de uma tela que
     * não é financeira. Com `all`, uma falha num deles apagaria o outro — e a
     * Home não pode ficar pela metade por causa de um cartão.
     */
    void Promise.allSettled([
      // Ordenada por vencimento no servidor: "próximas" é literal.
      listOfficePayments({ pageNumber: 1, pageSize: 10 }),
      getOfficeExpenseSummary({ paidFrom: from, paidTo: to }),
    ]).then(([recebimentos, despesas]) => {
      if (!ativo) return;
      if (recebimentos.status === "fulfilled") {
        setProximasReceitas(toRevenueItems(recebimentos.value.data ?? []));
      }
      if (despesas.status === "fulfilled") {
        const resumo = despesas.value.data;
        setSaidasDoMes({
          total: resumo?.paidAmount ?? 0,
          slices: toBalanceSlices(resumo?.byCategory ?? []),
        });
      }
    });

    return () => {
      ativo = false;
    };
  }, [podeVerFinanceiro]);

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
  }, 
  []);

  // ── Contador do cartão de formulários pendentes ──
  useEffect(() => {
    let active = true;

    // `pageSize: 1` porque só interessa o `totalRecords`: uma requisição
    // mínima em vez de trazer a lista inteira para contar no navegador.
    fetchClients({
      situation: ["FORMULARIO_PREENCHIDO"],
      pageNumber: 1,
      pageSize: 1,
    })
      .then((envelope) => {
        if (!active) return;
        setPendingCount(envelope?.pagination?.totalRecords ?? 0);
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
    <div className="flex flex-col gap-4 pb-12">
      {/* ── Formulários pendentes + Próximas receitas ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* TODO(backend): os três indicadores abaixo continuam ilustrativos —
            não há endpoint de métricas. O contador do topo, não: vem de
            `GET /clients?situation=FORMULARIO_PREENCHIDO`. */}
        <PendingForms
          count={pendingCount ?? "—"}
          period="Novembro"
          onContact={() => setIsLeadsOpen(true)}
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

        {/*
          O cartão fica na tela para todo mundo; o que depende de papel é o
          **dado**, não a moldura.

          Eu tinha escondido o cartão inteiro atrás de `podeVerFinanceiro`, e
          isso fazia duas coisas ruins de uma vez: abria um buraco na grade
          (que é fixa em `[2fr_1fr]`) e fazia a Home mudar de forma conforme
          quem entrava — o que lê como defeito, não como regra. Pior: o
          `usePermissoes` começa tudo `false` e só lê o storage no `useEffect`,
          então o cartão sumia e reaparecia em toda visita, inclusive para
          ADMIN.

          A regra D3 continua valendo no lugar certo: sem permissão a Home não
          CONSULTA (ver o `useEffect` acima), então não há 403 e não há valor
          nenhum para vazar — o cartão mostra o vazio que ele já sabe mostrar.
        */}
        <UpcomingRevenues
          items={proximasReceitas}
          onSeeAll={() => router.push("/pagamentos")}
        />
      </section>

      {/* ── Balanço + documentações + agenda ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Despesas pagas no mês, por categoria — o mesmo resumo da Carteira.
            Presente para todo mundo pelo mesmo motivo do cartão acima; sem
            permissão não há consulta, e ele desenha o próprio vazio.

            As cores saem de BALANCE_PALETTE (literais: o Chart.js desenha em
            canvas, onde `var(--…)` não resolve). */}
        <MonthlyBalance
          total={saidasDoMes.total}
          period={monthName(currentMonth())}
          slices={saidasDoMes.slices}
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

        <AppointmentsCard />
      </section>

      <PendingLeadsModal
        isOpen={isLeadsOpen}
        onClose={() => setIsLeadsOpen(false)}
      />

      {/* ── Esteira (drag & drop) ── */}
      <ContributorPipeline
        cards={cards}
        onMove={handleMove}
        onSeeFullFlow={() => router.push(privateRoutes.home)}
      />
    </div>
  );
}
