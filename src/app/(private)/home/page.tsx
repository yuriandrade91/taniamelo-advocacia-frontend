"use client";

import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import MonthlyBalance from "@/components/home/MonthlyBalance";
import { useSettled, settledValue } from "@/hooks/useSettled";
import { formatDateBR } from "@/lib/format";
import type { Clients } from "@/interfaces/Clients.interface";
import PendingForms from "@/components/home/PendingForms";
import UpcomingRevenues from "@/components/home/UpcomingRevenues";
import ContributorPipeline, {
  type PipelineCard,
} from "@/components/home/ContributorPipeline";
import UpcomingBirthdays from "@/components/home/UpcomingBirthdays";
import { useUpcomingBirthdays } from "@/components/home/useUpcomingBirthdays";
import AppointmentsCard from "@/components/home/appointments/AppointmentsCard";
import { clients as fetchClients, patchClient } from "@/services/clientService";
import {
  getSituationKeyByLabel,
  type SituationKey,
} from "@/enums/situation/Situation";
import { usePermissions } from "@/hooks/usePermissions";
import { listOfficePayments } from "@/services/officePaymentService";
import { getOfficeExpenseSummary } from "@/services/officeExpenseService";
import { toRevenueItems } from "@/components/home/revenueItems";
import { toBalanceSlices } from "@/components/wallet/walletOverview";
import { currentMonth, monthRange, type MonthRef } from "@/lib/period";
import type { StatCardProps } from "@/components/home/StatCard";

/** Modais: fora do pacote da página, como as outras (ver CLAUDE.md). */
const PendingLeadsModal = dynamic(
  () => import("@/components/home/PendingLeadsModal").then((m) => m.PendingLeadsModal),
  { ssr: false },
);
const ClientDetailsModal = dynamic(
  () => import("@/components/clients/details/ClientDetailsModal"),
  { ssr: false },
);

/** Indicadores do topo — ainda ilustrativos (não há endpoint de métricas). */
const PENDING_STATS: StatCardProps[] = [
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
];

/** A esteira: clientes reais agrupados por situação (a API devolve o rótulo da situação). */
const toPipelineCards = (clients: Clients[]): PipelineCard[] =>
  clients.flatMap((client) => {
    const situation = getSituationKeyByLabel(client.situation);
    return client.id && situation
      ? [{ id: String(client.id), name: client.fullName, date: formatDateBR(client.createdAt), situation }]
      : [];
  });

export default function Home() {
  const router = useRouter();
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  /**
   * A ficha aberta a partir da fila de formulários pendentes.
   *
   * A fila sai da tela enquanto a ficha está aberta, e volta quando ela fecha:
   * são duas camadas sobre a mesma página, e empilhar uma na outra deixa duas
   * molduras e dois "fechar" competindo pelo Esc.
   */
  const [leadSheet, setLeadSheet] = useState<{ id: string; name: string } | null>(null);
  /**
   * O mês do cartão Balanço. Mora aqui, e não no cartão, porque quem consulta
   * é a página: trocar o mês é uma leitura nova de `GET /expenses/summary`.
   */
  const [balanceMonth, setBalanceMonth] = useState<MonthRef>(() => currentMonth());

  /** D3: dinheiro é só de quem administra. Sem isso, os cartões pediriam 403. */
  const { canSeeFinance } = usePermissions();

  /**
   * Cada cartão lê a sua consulta, e uma falha não apaga os outros. `null` =
   * ainda carregando — o cartão mostra o seu skeleton no lugar do vazio.
   */
  const financeKey = canSeeFinance ? "finance" : null;
  // Ordenada por vencimento no servidor: "próximas" é literal.
  const payments = useSettled(financeKey, () =>
    Promise.allSettled([listOfficePayments({ pageNumber: 1, pageSize: 10 })]),
  );
  // A chave carrega o mês: trocar de mês é outra leitura, e o cartão volta ao
  // skeleton em vez de mostrar o total do mês anterior com o rótulo novo.
  const outflowSummary = useSettled(
    financeKey && `${financeKey}:${balanceMonth.year}-${balanceMonth.month}`,
    () => {
      const { from, to } = monthRange(balanceMonth);
      return Promise.allSettled([getOfficeExpenseSummary({ paidFrom: from, paidTo: to })]);
    },
  );
  const pipeline = useSettled("pipeline", () =>
    Promise.allSettled([fetchClients({ pageNumber: 1, pageSize: 50 })]),
  );
  /**
   * Quantos formulários estão pendentes: o `totalRecords` da mesma consulta da
   * modal (`pageSize: 1` — só o total interessa), para cartão e modal
   * baterem.
   */
  const pending = useSettled("pending", () =>
    Promise.allSettled([fetchClients({ situation: ["FORMULARIO_PREENCHIDO"], pageNumber: 1, pageSize: 1 })]),
  );
  /**
   * Aniversariantes: os cinco próximos, hoje incluso, de
   * `GET /clients/upcoming-birthdays`. Quando o dia vira, quem já passou sai
   * e a lista é relida — ver `useUpcomingBirthdays`.
   */
  const { items: birthdays, failed: birthdaysFailed } = useUpcomingBirthdays();

  const upcomingPayments = useMemo(() => settledValue(payments?.[0], null)?.data ?? [], [payments]);
  const upcomingRevenues = useMemo(() => toRevenueItems(upcomingPayments), [upcomingPayments]);
  const monthOutflows = useMemo(() => {
    const summary = settledValue(outflowSummary?.[0], null)?.data;
    return { total: summary?.paidAmount ?? 0, slices: toBalanceSlices(summary?.byCategory ?? []) };
  }, [outflowSummary]);
  const cards = useMemo(() => toPipelineCards(settledValue(pipeline?.[0], null)?.data ?? []), [pipeline]);
  // `null` contando; `undefined` falhou (o interceptor já avisou).
  const pendingCount = pending && settledValue(pending[0], null)?.pagination?.totalRecords;

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
          count={pendingCount}
          period="Novembro"
          onContact={() => setIsLeadsOpen(true)}
          stats={PENDING_STATS}
        />

        {/*
          O cartão fica na tela para todo mundo; o que depende de papel é o
          **dado**, não a moldura.

          Eu tinha escondido o cartão inteiro atrás de `canSeeFinance`, e
          isso fazia duas coisas ruins de uma vez: abria um buraco na grade
          (que é fixa em `[2fr_1fr]`) e fazia a Home mudar de forma conforme
          quem entrava — o que lê como defeito, não como regra. Pior: o
          `usePermissions` começa tudo `false` e só lê o storage no `useEffect`,
          então o cartão sumia e reaparecia em toda visita, inclusive para
          ADMIN.

          A regra D3 continua valendo no lugar certo: sem permissão a Home não
          CONSULTA (ver o `useEffect` acima), então não há 403 e não há valor
          nenhum para vazar — o cartão mostra o vazio que ele já sabe mostrar.
        */}
        <UpcomingRevenues
          items={upcomingRevenues}
          isLoading={canSeeFinance && payments === null}
          onSeeAll={() => router.push("/pagamentos")}
        />
      </section>

      {/* ── Balanço + aniversariantes + agenda ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Despesas pagas no mês, por categoria — o mesmo resumo da Carteira.
            Presente para todo mundo pelo mesmo motivo do cartão acima; sem
            permissão não há consulta, e ele desenha o próprio vazio.

            O mês é navegável: `balanceMonth` troca a chave da leitura, e o
            cartão volta ao skeleton até o resumo do mês novo chegar.

            As cores saem de BALANCE_PALETTE (literais: o Chart.js desenha em
            canvas, onde `var(--…)` não resolve). */}
        <MonthlyBalance
          total={monthOutflows.total}
          month={balanceMonth}
          onMonthChange={setBalanceMonth}
          slices={monthOutflows.slices}
          isLoading={canSeeFinance && outflowSummary === null}
        />

        {/* No lugar das "Documentações pendentes", que eram três linhas
            inventadas enquanto não há endpoint de documento faltante. Este
            cartão responde algo que a base já sabe — e serve para uma ligação
            no dia certo. */}
        <UpcomingBirthdays items={birthdays} failed={birthdaysFailed} />

        <AppointmentsCard />
      </section>

      {/* ── Esteira (arrastar, ou o seletor de etapa) ── */}
      <ContributorPipeline
        cards={cards}
        isLoading={pipeline === null}
        onMove={handleMove}
      />

      <PendingLeadsModal
        isOpen={isLeadsOpen}
        onClose={() => setIsLeadsOpen(false)}
        onViewClient={(lead) => {
          setIsLeadsOpen(false);
          setLeadSheet({ id: lead.id, name: lead.name });
        }}
      />

      {leadSheet && (
        <ClientDetailsModal
          isOpen
          clientId={leadSheet.id}
          clientName={leadSheet.name}
          onClose={() => {
            setLeadSheet(null);
            setIsLeadsOpen(true);
          }}
        />
      )}
    </div>
  );
}
