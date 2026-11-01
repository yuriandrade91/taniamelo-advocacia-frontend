"use client";

import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import MonthlyBalance from "@/components/home/MonthlyBalance";
import { useSettled, settledValue } from "@/hooks/useSettled";
import { formatDateBR } from "@/lib/format";
import type { ClientListItem } from "@/interfaces/client/Client.interface";
import PendingForms from "@/components/home/PendingForms";
import UpcomingRevenues from "@/components/home/UpcomingRevenues";
import ContributorPipeline, {
  type PipelineCard,
} from "@/components/home/ContributorPipeline";
import UpcomingBirthdays from "@/components/home/UpcomingBirthdays";
import { useUpcomingBirthdays } from "@/components/home/useUpcomingBirthdays";
import AppointmentsCard from "@/components/home/AppointmentsCard";
import { situationChangedMessage } from "@/components/clients/stage/stages";
import { clients as fetchClients, patchClient } from "@/services/clientService";
import {
  getSituationKeyByLabel,
  type SituationKey,
} from "@/enums/situation/Situation";
import { useConstant } from "@/hooks/useConstant";
import { usePermissions } from "@/hooks/usePermissions";
import { listOfficePayments } from "@/services/officePaymentService";
import { getOfficeExpenseSummary } from "@/services/officeExpenseService";
import { toRevenueItems } from "@/components/home/revenueItems";
import { toBalanceSlices } from "@/components/reports/financeSeries";
import { currentMonth, monthName, monthRange, shiftMonth, type MonthRef } from "@/lib/period";
import { createdRange } from "@/components/reports/reportSeries";
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

/**
 * Indicadores do topo ainda ilustrativos (não há endpoint de métricas).
 * "Formulários preenchidos" saiu daqui: é contado de verdade (`filledFormsStat`).
 */
const PENDING_STATS: StatCardProps[] = [
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

/**
 * Formulários preenchidos no mês: cada formulário vira um cliente, então são
 * os cadastros criados no mês (`createdFrom/To`) — não há endpoint de métricas.
 * O selo compara com o mês anterior. `null` = contando; `undefined` = falhou.
 */
const filledFormsStat = (month: MonthRef, current: number | null | undefined, previous: number | null | undefined): StatCardProps => ({
  title: "Formulários preenchidos",
  value: current === null ? null : (current ?? "—"),
  period: monthName(month),
  delta: typeof current === "number" && typeof previous === "number" ? current - previous : undefined,
  highlighted: true,
});

/** A esteira: clientes reais agrupados por situação (a API devolve o rótulo da situação). */
const toPipelineCards = (clients: ClientListItem[]): PipelineCard[] =>
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
   * A ficha do cliente, aberta da fila de formulários pendentes ou dos
   * aniversariantes.
   *
   * Vinda da fila, a fila sai da tela enquanto a ficha está aberta e volta
   * quando ela fecha: são duas camadas sobre a mesma página, e empilhar uma na
   * outra deixa duas molduras e dois "fechar" competindo pelo Esc.
   */
  const [clientSheet, setClientSheet] = useState<{ id: string; name: string; fromLeads: boolean } | null>(null);
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
  // Dois meses: o atual e o anterior (para o selo de variação). Chave com o
  // mês, como o balanço: virar o mês é outra leitura.
  const thisMonth = useConstant(() => currentMonth());
  const filledForms = useSettled("filled-forms", () =>
    Promise.allSettled([
      fetchClients({ ...createdRange(thisMonth), pageNumber: 1, pageSize: 1 }),
      fetchClients({ ...createdRange(shiftMonth(thisMonth, -1)), pageNumber: 1, pageSize: 1 }),
    ]),
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

  const stats = useMemo(() => {
    const total = (index: number) =>
      filledForms && settledValue(filledForms[index], null)?.pagination?.totalRecords;
    // `filledForms` nulo = contando; falha de uma das leituras = `undefined`.
    const count = (index: number) => (filledForms === null ? null : total(index));
    return [filledFormsStat(thisMonth, count(0), count(1)), ...PENDING_STATS];
  }, [filledForms, thisMonth]);

  /** Arrastar um card = PATCH /api/v1/clients/{id} { situation }. */
  const handleMove = useCallback(
    (cardId: string, situation: SituationKey) => {
      const name = cards.find((card) => card.id === cardId)?.name ?? "cliente";
      patchClient(cardId, { situation }, { successMessage: situationChangedMessage(name, situation) }).catch(() => {
        /* erro já sinalizado pelo interceptor; a UI revalida no próximo load */
      });
    },
    [cards],
  );

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* ── Formulários pendentes + Próximas receitas ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Pendente no backend (docs/ROADMAP.md): os dois últimos indicadores abaixo continuam ilustrativos —
            não há endpoint de métricas. O contador do topo, não: vem de
            `GET /clients?situation=FORMULARIO_PREENCHIDO`. */}
        <PendingForms
          count={pendingCount}
          period="Novembro"
          onContact={() => setIsLeadsOpen(true)}
          stats={stats}
        />

        {/*
          O cartão fica na tela para qualquer papel; o que depende de papel é o
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
          failed={payments?.[0]?.status === "rejected"}
          onSeeAll={() => router.push("/pagamentos")}
        />
      </section>

      {/* ── Balanço + aniversariantes + agenda ── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Despesas pagas no mês, por categoria — o mesmo resumo da Carteira.
            Presente para qualquer papel pelo mesmo motivo do cartão acima; sem
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
          failed={outflowSummary?.[0]?.status === "rejected"}
        />

        {/* No lugar das "Documentações pendentes", que eram três linhas
            inventadas enquanto não há endpoint de documento faltante. Este
            cartão responde algo que a base já sabe — e serve para uma ligação
            no dia certo. */}
        <UpcomingBirthdays
          items={birthdays}
          failed={birthdaysFailed}
          onViewClient={(person) => setClientSheet({ id: person.id, name: person.name, fromLeads: false })}
        />

        <AppointmentsCard />
      </section>

      {/* ── Esteira (arrastar, ou o seletor de etapa) ── */}
      <ContributorPipeline
        cards={cards}
        isLoading={pipeline === null}
        failed={pipeline?.[0]?.status === "rejected"}
        onMove={handleMove}
      />

      <PendingLeadsModal
        isOpen={isLeadsOpen}
        onClose={() => setIsLeadsOpen(false)}
        onViewClient={(lead) => {
          setIsLeadsOpen(false);
          setClientSheet({ id: lead.id, name: lead.name, fromLeads: true });
        }}
      />

      {clientSheet && (
        <ClientDetailsModal
          isOpen
          clientId={clientSheet.id}
          clientName={clientSheet.name}
          onClose={() => {
            setClientSheet(null);
            if (clientSheet.fromLeads) setIsLeadsOpen(true);
          }}
        />
      )}
    </div>
  );
}
