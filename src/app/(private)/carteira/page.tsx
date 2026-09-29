"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import MonthlyBalance from "@/components/home/MonthlyBalance";
import { ExpensesTable } from "@/components/wallet/ExpensesTable";
import { RevenuesTable } from "@/components/wallet/RevenuesTable";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SemAcessoFinanceiro } from "@/components/ui/feedback/SemAcessoFinanceiro";
import { usePermissoes } from "@/hooks/usePermissoes";
import { EntryFormModal } from "@/components/wallet/EntryFormModal";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import {
  expenseFormFrom,
  incomeFormFrom,
  type EntryKind,
  type SharedValues,
} from "@/components/wallet/entryForms";
import { WalletSummary } from "@/components/wallet/WalletSummary";
import {
  buildFlowTimeline,
  buildWalletOverview,
  toBalanceSlices,
} from "@/components/wallet/walletOverview";
import {
  currentMonth,
  monthName,
  monthRange,
  shiftMonth,
  type MonthRef,
} from "@/lib/period";
import {
  deleteOfficeExpense,
  getOfficeExpenseSummary,
  getOfficeExpenseTimeline,
  listOfficeExpenses,
} from "@/services/officeExpenseService";
import {
  deleteOfficeRevenue,
  getOfficeRevenueSummary,
  getOfficeRevenueTimeline,
  listOfficeRevenues,
} from "@/services/officeRevenueService";
import { WalletFlowChart } from "@/components/wallet/WalletFlowChart";
import { WalletBalanceChart } from "@/components/wallet/WalletBalanceChart";
import type {
  FlowTimelinePoint,
  OfficeExpenseResponse,
  OfficeExpenseSummary,
} from "@/interfaces/finance/OfficeExpense.interface";
import type {
  OfficeRevenueResponse,
  OfficeRevenueSummary,
} from "@/interfaces/finance/OfficeRevenue.interface";

/**
 * Carteira — o financeiro do escritório.
 *
 * ## Por que é outra tela, e não um filtro de Pagamentos
 *
 * As duas olham para dinheiro, mas respondem perguntas diferentes e com
 * recortes de data diferentes:
 *
 * | | Pagamentos | Carteira |
 * |---|---|---|
 * | pergunta | "o que os clientes têm a receber" | "como está o caixa" |
 * | recorte | vencimento (`dueDate`) | pagamento (`paidDate`) |
 * | escopo | só entradas do cliente | entradas **e** saídas do escritório |
 *
 * Somar recebimento por vencimento e chamar de "entrou" conta dinheiro que
 * não chegou — o erro mais comum em tela financeira, e silencioso, porque os
 * números parecem plausíveis.
 *
 * ## O que é entrada aqui, e o que não é
 *
 * Entrada é `office_revenues`: honorário, parecer avulso, reembolso. **Não é**
 * `client_payments` — aquilo é o que o INSS paga ao cliente (atrasados,
 * benefício), dinheiro dele, que não passa por este caixa. Esta tela chegou a
 * somar aquele total como faturamento, e o resultado era plausível, positivo e
 * falso, inflado por um fator que dependia só do tamanho dos atrasados. Por
 * isso as duas metades vêm de serviços diferentes e nunca se encontram aqui.
 *
 * ## Por que `allSettled` e não `all`
 *
 * Receita e despesa são dois recursos independentes: um 500 na despesa não é
 * motivo para esconder a receita que respondeu. Com `all`, uma falha derruba a
 * tela inteira; com `allSettled`, a tela mostra a metade que tem e diz que a
 * outra falhou — que é informação, não ruído.
 */

type LoadState = "loading" | "ready" | "partial" | "error";

/** Quantas linhas as duas tabelas do mês trazem antes de pedir a próxima página. */
const LINHAS_DO_MES = 50;

export default function WalletPage() {
  /**
   * Mesmo corte de Pagamentos (D3): dinheiro do escritório é de quem
   * administra. A guarda aqui é só da tela — as rotas são `@RequerAdmin` e
   * respondem 403 por conta própria, então esconder o menu é conveniência, não
   * a regra.
   */
  const { podeVerFinanceiro } = usePermissoes();
  const [month, setMonth] = useState<MonthRef>(() => currentMonth());
  const [revenues, setRevenues] = useState<OfficeRevenueSummary | null>(null);
  const [revenueItems, setRevenueItems] = useState<OfficeRevenueResponse[]>([]);
  const [expenses, setExpenses] = useState<OfficeExpenseSummary | null>(null);
  const [expenseItems, setExpenseItems] = useState<OfficeExpenseResponse[]>([]);
  const [flow, setFlow] = useState<FlowTimelinePoint[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editing, setEditing] = useState<{
    kind: EntryKind;
    id: string;
    values: SharedValues;
    descricao: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: EntryKind;
    id: string;
    descricao: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const range = useMemo(() => monthRange(month), [month]);

  /**
   * O gráfico mostra 6 meses terminando no mês selecionado: o card responde
   * "quanto sobrou este mês", o gráfico responde "isso é normal ou fora da
   * curva". Um mês isolado não responde a segunda.
   */
  const flowRange = useMemo(
    () => ({
      from: monthRange(shiftMonth(month, -5)).from,
      to: monthRange(month).to,
    }),
    [month],
  );

  const load = useCallback(async () => {
    setState("loading");

    const [revenueSummary, expenseSummary, revenueList, expenseList] =
      await Promise.allSettled([
        // Os cards são CAIXA: recorte por data de pagamento nos dois lados, com
        // o mesmo par de datas. Misturar os recortes é o que dá saldo falso.
        getOfficeRevenueSummary({ paidFrom: range.from, paidTo: range.to }),
        getOfficeExpenseSummary({ paidFrom: range.from, paidTo: range.to }),
        // As tabelas usam VENCIMENTO: ali a pergunta é "o que há no mês",
        // que inclui o que ainda não foi pago.
        listOfficeRevenues({
          dueFrom: range.from,
          dueTo: range.to,
          pageSize: LINHAS_DO_MES,
        }),
        listOfficeExpenses({
          dueFrom: range.from,
          dueTo: range.to,
          pageSize: LINHAS_DO_MES,
        }),
      ]);

    const nextRevenues =
      revenueSummary.status === "fulfilled"
        ? (revenueSummary.value.data ?? null)
        : null;
    const nextExpenses =
      expenseSummary.status === "fulfilled"
        ? (expenseSummary.value.data ?? null)
        : null;

    // Série de 6 meses, em regime de caixa como os cards.
    const [revenueSeries, expenseSeries] = await Promise.allSettled([
      getOfficeRevenueTimeline({ ...flowRange, basis: "paid" }),
      getOfficeExpenseTimeline({ ...flowRange, basis: "paid" }),
    ]);
    setFlow(
      buildFlowTimeline(
        revenueSeries.status === "fulfilled"
          ? (revenueSeries.value.data ?? [])
          : [],
        expenseSeries.status === "fulfilled"
          ? (expenseSeries.value.data ?? [])
          : [],
      ),
    );

    setRevenues(nextRevenues);
    setExpenses(nextExpenses);
    setRevenueItems(
      revenueList.status === "fulfilled" ? (revenueList.value.data ?? []) : [],
    );
    setExpenseItems(
      expenseList.status === "fulfilled" ? (expenseList.value.data ?? []) : [],
    );

    if (nextRevenues && nextExpenses) setState("ready");
    else if (nextRevenues || nextExpenses) setState("partial");
    else setState("error");
  }, [range, flowRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = useMemo(
    () => buildWalletOverview(revenues, expenses),
    [revenues, expenses],
  );

  const slices = useMemo(
    () => toBalanceSlices(expenses?.byCategory ?? []),
    [expenses],
  );

  /**
   * Excluir é soft delete e não tem rota de restaurar nestas duas tabelas —
   * por isso o caminho é confirmar antes, e não a janela de desfazer que a
   * agenda usa. Desfazer depois do fato só poderia falhar.
   */
  const confirmarExclusao = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.kind === "entrada") {
        await deleteOfficeRevenue(deleteTarget.id);
      } else {
        await deleteOfficeExpense(deleteTarget.id);
      }
      setDeleteTarget(null);
      await load();
    } catch {
      // O axiosService já mostrou o erro; o alvo fica para nova tentativa.
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = state === "loading";
  /**
   * A série vem preenchida mês a mês pelo servidor, inclusive os meses sem
   * movimento. Vazia só acontece quando as duas chamadas falharam — e aí o
   * gráfico fica vazio de propósito. Não existe mais dado de exemplo nesta
   * tela: número plausível sem fonte é como ele acaba repetido em reunião.
   */
  const semSerie = !isLoading && flow.length === 0;

  if (!podeVerFinanceiro) {
    return <SemAcessoFinanceiro titulo="Carteira" />;
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Carteira"
        description="Receitas e despesas do escritório — pelo que foi efetivamente pago no mês."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker
              value={month}
              onChange={setMonth}
              maxMonth={currentMonth()}
              tone="dark"
            />
            {/* Um botão só: o tipo (entrada ou saída) é escolhido dentro do
                modal. Dois botões obrigariam a decidir antes de ver o que o
                formulário pede, e errar o tipo custaria fechar e recomeçar. */}
            <Button
              type="button"
              variant="outline"
              className="on-primary-button"
              onPress={() => setIsEntryFormOpen(true)}
            >
              Registrar lançamento
            </Button>
          </div>
        }
      />

      <WalletSummary overview={overview} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WalletFlowChart points={flow} />
        <WalletBalanceChart points={flow} />
      </div>

      {(state === "partial" || state === "error" || semSerie) && (
        <div
          role="status"
          className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">
            {state === "error" ? "Não foi possível carregar" : "Dados parciais"}
          </p>
          <p className="mt-1 text-gray-100">
            {state === "error" ? (
              <>
                Nem as receitas nem as despesas responderam. Os valores estão
                zerados por falta de resposta, não por falta de movimento —
                recarregue a página antes de tirar qualquer conclusão deles.
              </>
            ) : (
              <>
                Uma das metades não respondeu, então o saldo acima está
                incompleto. Ele soma só o que chegou.
              </>
            )}
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MonthlyBalance
          total={overview.outflowAmount}
          period={monthName(month)}
          slices={slices}
        />

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium text-primary">
              Despesas do mês
            </h2>
            {/* Rótulo explícito: os cards acima são caixa (pago), esta tabela
                é agenda (vencimento). Sem dizer, os números não batem e
                parece defeito. */}
            <span className="text-xs text-gray-100">por vencimento</span>
          </div>
          <ExpensesTable
            items={expenseItems}
            isLoading={isLoading}
            emptyMessage="Nenhuma despesa com vencimento neste mês."
            onEdit={(item) =>
              setEditing({
                kind: "saida",
                id: item.id,
                values: expenseFormFrom(item),
                descricao: item.description,
              })
            }
            /* Sem guarda extra: chegar aqui já exige podeVerFinanceiro, que é
               só ADMIN — o mesmo papel que o @RequerAdmin do DELETE exige.
               Um `podeDestruir` (ADMIN|LAWYER) aqui seria sempre verdadeiro e
               sugeriria um corte que não existe nesta tela. */
            onDelete={(item) =>
              setDeleteTarget({
                kind: "saida",
                id: item.id,
                descricao: item.description,
              })
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-medium text-primary">Entradas do mês</h2>
          <span className="text-xs text-gray-100">por vencimento</span>
        </div>
        <RevenuesTable
          items={revenueItems}
          isLoading={isLoading}
          emptyMessage="Nenhuma receita com vencimento neste mês."
          onEdit={(item) =>
            setEditing({
              kind: "entrada",
              id: item.id,
              values: incomeFormFrom(item),
              descricao: item.description,
            })
          }
          onDelete={(item) =>
            setDeleteTarget({
              kind: "entrada",
              id: item.id,
              descricao: item.description,
            })
          }
        />
        <p className="mt-3 text-sm text-gray-100">
          Entrada aqui é honorário, parecer avulso, reembolso — dinheiro do
          escritório. Não confunda com{" "}
          <Link
            href="/pagamentos"
            className="font-medium text-secondary underline underline-offset-2"
          >
            Pagamentos
          </Link>
          : lá é o que o INSS paga ao cliente, e esse dinheiro não passa pelo
          caixa daqui.
        </p>
      </section>

      <EntryFormModal
        isOpen={isEntryFormOpen}
        onOpenChange={setIsEntryFormOpen}
        onSaved={() => void load()}
      />

      {/* Modal separado do de cadastro, e montado só com alvo: um modal só,
          reaproveitado, precisaria limpar o estado da edição anterior ao
          fechar — e o dia em que esquecesse abriria "novo" já preenchido. */}
      {editing && (
        <EntryFormModal
          isOpen
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          onSaved={() => void load()}
          editing={editing}
        />
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        tone="danger"
        heading={
          deleteTarget?.kind === "entrada" ? "Excluir entrada?" : "Excluir saída?"
        }
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description={
          deleteTarget ? (
            <>
              <span className="font-medium">{deleteTarget.descricao}</span> sai
              da Carteira e deixa de contar no saldo do mês. Não há como
              restaurar por aqui.
            </>
          ) : null
        }
        onConfirm={() => void confirmarExclusao()}
      />
    </div>
  );
}
