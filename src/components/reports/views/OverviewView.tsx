"use client";

import type { ReactNode } from "react";
import MonthlyBalance from "@/components/home/MonthlyBalance";
import { PaymentsTimelineChart } from "../charts/PaymentsTimelineChart";
import { PaymentsTrendChart } from "../charts/PaymentsTrendChart";
import { WalletFlowChart } from "../charts/WalletFlowChart";
import { WalletBalanceChart } from "../charts/WalletBalanceChart";
import { ClientsBySituationChart } from "../charts/ClientsBySituationChart";
import { ClientIntakeChart } from "../charts/ClientIntakeChart";
import { AppointmentsByMonthChart } from "../charts/AppointmentsByMonthChart";
import type { ReportViewProps } from "./types";

/**
 * Visão geral — os gráficos (Chart.js) por bloco. O financeiro vem primeiro;
 * sem permissão ele nem é montado, e a visão começa em Clientes e agenda.
 * Os dois blocos de dinheiro dizem o recorte no título: Pagamentos é o que o
 * INSS paga ao cliente (vencimento), Carteira é o caixa (pagamento).
 */
export function OverviewView({
  canSeeFinance,
  payments,
  flow,
  expenses,
  expenseSlices,
  situations,
  intake,
  agenda,
  month,
  isLoading,
  isFinanceLoading,
}: ReportViewProps) {
  return (
    <>
      {canSeeFinance && (
        <>
          <Block title="Pagamentos aos clientes" note="por vencimento">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <PaymentsTimelineChart points={payments} isLoading={isFinanceLoading} />
              <PaymentsTrendChart points={payments} isLoading={isFinanceLoading} />
            </div>
          </Block>
          {/* Entradas e saídas na linha inteira; composição e acumulado dividem a de baixo. */}
          <Block title="Carteira" note="por pagamento">
            <WalletFlowChart points={flow} isLoading={isFinanceLoading} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MonthlyBalance total={expenses?.paidAmount ?? 0} slices={expenseSlices} isLoading={isFinanceLoading} />
              <WalletBalanceChart points={flow} isLoading={isFinanceLoading} />
            </div>
          </Block>
        </>
      )}
      {/* `lg:` e não `md:`: três gráficos num tablet deixam os rótulos das etapas sem espaço. */}
      <Block title="Clientes e agenda" note="etapa atual · cadastros por mês · compromissos no ano até o mês">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ClientsBySituationChart items={situations} isLoading={isLoading} />
          <ClientIntakeChart points={intake} isLoading={isLoading} />
          <AppointmentsByMonthChart points={agenda} year={month.year} isLoading={isLoading} />
        </div>
      </Block>
    </>
  );
}

function Block({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium text-primary">{title}</h2>
        <span className="text-xs text-gray-100">{note}</span>
      </div>
      {children}
    </section>
  );
}
