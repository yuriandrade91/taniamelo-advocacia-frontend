"use client";

import { useState } from "react";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { useViewModel } from "@/components/ui/models/ViewModels";
import { REPORT_VIEWS } from "@/components/reports/views";
import { ReportViewSwitcher } from "@/components/reports/ReportViewSwitcher";
import { useReportViewOrder } from "@/components/reports/useReportViewOrder";
import { useReportsData } from "@/components/reports/useReportsData";
import { usePermissions } from "@/hooks/usePermissions";
import { currentMonth, type MonthRef } from "@/lib/period";

/**
 * Relatórios — os gráficos do escritório num lugar só: o financeiro
 * (Pagamentos e Carteira) e clientes e agenda (que nasceram de cartões da
 * Home).
 *
 * ## Cinco visões, o financeiro sempre primeiro
 *
 * O usuário escolhe como ler o mesmo dado — Visão geral (o padrão),
 * Indicadores, Jornada do cliente, Mês a mês e Proporções — e também a ordem
 * das abas, da primeira à última. As duas escolhas ficam lembradas no
 * navegador. Em todas, de cima para baixo, o dinheiro do
 * escritório vem antes de clientes e agenda: é a pergunta que traz o
 * administrador até aqui.
 *
 * ## Quem vê o quê
 *
 * Clientes e agenda são de todo mundo, como na Home. O financeiro é só do
 * administrador (D3): sem permissão as seções de dinheiro nem são montadas e
 * as chamadas nem saem — não há 403 para tratar nem valor para vazar. A página
 * é a mesma para todos; o que depende de papel é o dado, não a moldura.
 *
 * ## Por que os gráficos saíram das telas de origem
 *
 * Pagamentos e Carteira são telas de operação: achar uma parcela, lançar,
 * editar, excluir. Os gráficos respondem outra pergunta ("como isso andou") e
 * disputavam espaço com as tabelas. Aqui ficam juntos, e a operação fica
 * enxuta lá.
 *
 * ## Os dois blocos continuam separados
 *
 * Mesmo lado a lado, os recortes não se misturam: Pagamentos é o que o INSS
 * paga ao cliente, por **vencimento**; Carteira é o caixa do escritório, por
 * **pagamento**. Cada bloco diz o seu recorte no título — somar um com o outro
 * é o erro que a separação das telas existe para impedir.
 *
 * ## Um seletor de mês para a página
 *
 * Todas as séries mostram 6 meses terminando no mês escolhido, e a rosca é o
 * mês escolhido. Um seletor por bloco permitiria comparar janelas diferentes
 * sem perceber.
 *
 * A carga (e o que não se repete) está em `useReportsData`; as visões só
 * desenham.
 */

export default function ReportsPage() {
  const { canSeeFinance } = usePermissions();
  const [month, setMonth] = useState<MonthRef>(() => currentMonth());
  const data = useReportsData(month, canSeeFinance);
  /** As abas na ordem do usuário; sem visão escolhida, abre a primeira. */
  const viewOrder = useReportViewOrder(REPORT_VIEWS);
  const { model: view, choose: chooseView } = useViewModel("relatorios:modelo", viewOrder.ordered, viewOrder.ordered[0]?.id);
  const View = view.Component;

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Relatórios"
        description="Como o financeiro, os clientes e a agenda andaram até o mês escolhido."
        actions={<MonthPicker value={month} onChange={setMonth} maxMonth={currentMonth()} tone="dark" />}
      />

      {(data.state === "partial" || data.state === "error") && (
        <div role="status" className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary">
          <p className="font-medium">{data.state === "error" ? "Não foi possível carregar" : "Dados parciais"}</p>
          <p className="mt-1 text-gray-100">
            {data.state === "error"
              ? "Nenhuma série respondeu. Os gráficos estão vazios por falta de resposta, não por falta de movimento."
              : "Alguma série não respondeu, e o gráfico dela está vazio por isso — não por falta de movimento."}
          </p>
        </div>
      )}

      <ReportViewSwitcher
        views={viewOrder.ordered}
        value={view.id}
        onChange={chooseView}
        onMove={viewOrder.move}
        onResetOrder={viewOrder.reset}
        isCustomOrder={viewOrder.isCustom}
      />

      <View month={month} {...data} />
    </div>
  );
}
