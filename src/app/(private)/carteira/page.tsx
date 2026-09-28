"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import MonthlyBalance from "@/components/home/MonthlyBalance";
import { ExpensesTable } from "@/components/wallet/ExpensesTable";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SemAcessoFinanceiro } from "@/components/ui/feedback/SemAcessoFinanceiro";
import { usePermissoes } from "@/hooks/usePermissoes";
import { EntryFormModal } from "@/components/wallet/EntryFormModal";
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
  getOfficeExpenseSummary,
  getOfficeExpenseTimeline,
  listOfficeExpenses,
} from "@/services/officeExpenseService";
import { WalletFlowChart } from "@/components/wallet/WalletFlowChart";
import { WalletBalanceChart } from "@/components/wallet/WalletBalanceChart";
import { sampleFlowTimeline } from "@/components/charts/sampleData";
import type {
  FlowTimelinePoint,
  OfficeExpenseResponse,
  OfficeExpenseSummary,
} from "@/interfaces/finance/OfficeExpense.interface";

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
 * | pergunta | "o que os clientes devem" | "como está o caixa" |
 * | recorte | vencimento (`dueDate`) | pagamento (`paidDate`) |
 * | escopo | só entradas | entradas **e** saídas |
 *
 * Somar recebimento por vencimento e chamar de "entrou" conta dinheiro que
 * não chegou — o erro mais comum em tela financeira, e silencioso, porque os
 * números parecem plausíveis.
 *
 * ## Estado do backend
 *
 * **Nenhuma das duas metades tem servidor.**
 *
 * - **Receita** é o honorário do escritório, e ele não tem tabela. Não é
 *   `client_payments`: aquela guarda o que o **INSS paga ao cliente**
 *   (atrasados, benefício), que é assunto de Pagamentos. Esta tela chegou a
 *   somar aquele total como faturamento, o que mostrava o dinheiro dos
 *   clientes como receita do escritório — plausível, positivo e falso.
 * - **Despesa** não existe nem como tabela.
 *
 * Os dois são o domínio `financial` do ADR-0003. Enquanto não subirem, a tela
 * diz o que falta em vez de mostrar saldo zero: zero é um número, e número
 * errado em tela financeira é pior que tela vazia.
 */

type LoadState = "loading" | "ready" | "partial" | "missing" | "error";

export default function WalletPage() {
  /**
   * Mesmo corte de Pagamentos (D3): honorário é dinheiro do escritório, e
   * quem vê é quem administra. Aqui a guarda é só da tela — as rotas de
   * receita e despesa ainda não existem no backend, então não há 403 para
   * confirmar a regra do outro lado. Quando existirem, nascem `@RequerAdmin`.
   */
  const { podeVerFinanceiro } = usePermissoes();
  const [month, setMonth] = useState<MonthRef>(() => currentMonth());
  const [expenses, setExpenses] = useState<OfficeExpenseSummary | null>(null);
  const [expenseItems, setExpenseItems] = useState<OfficeExpenseResponse[]>([]);
  const [flow, setFlow] = useState<FlowTimelinePoint[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);

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

    /**
     * `allSettled` e não `all`: as duas metades têm disponibilidade diferente
     * hoje (pagamentos está especificado, despesa não existe nem no banco).
     * Com `all`, a que falta derrubaria a que existe e a tela não mostraria
     * nada — quando poderia mostrar metade e dizer qual metade falta.
     */
    const [expensesResult, itemsResult] = await Promise.allSettled([
      getOfficeExpenseSummary({ paidFrom: range.from, paidTo: range.to }),
      // A tabela usa VENCIMENTO: a pergunta ali é "o que há para pagar no
      // mês", que inclui o que ainda não foi pago.
      listOfficeExpenses({
        dueFrom: range.from,
        dueTo: range.to,
        pageSize: 50,
      }),
    ]);

    const nextExpenses =
      expensesResult.status === "fulfilled"
        ? (expensesResult.value.data ?? null)
        : null;

    // Série de 6 meses, em regime de caixa como os cards. A metade das
    // receitas vai vazia: não há rota de honorário para consultar.
    const [expenseSeries] = await Promise.allSettled([
      getOfficeExpenseTimeline({ ...flowRange, basis: "paid" }),
    ]);
    setFlow(
      buildFlowTimeline(
        [],
        expenseSeries.status === "fulfilled"
          ? (expenseSeries.value.data ?? [])
          : [],
      ),
    );

    setExpenses(nextExpenses);
    setExpenseItems(
      itemsResult.status === "fulfilled" ? (itemsResult.value.data ?? []) : [],
    );

    // Nunca "ready": a metade das receitas não tem fonte. "partial" quando ao
    // menos as despesas responderam.
    setState(nextExpenses ? "partial" : "missing");
  }, [range, flowRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const overview = useMemo(
    // `null` nas receitas: honorário não tem tabela nem rota hoje. Passar o
    // resumo de `client_payments` aqui — como esta tela fazia — somava o
    // dinheiro que o INSS paga aos clientes como faturamento do escritório.
    () => buildWalletOverview(null, expenses),
    [expenses],
  );

  /**
   * Sem as rotas de série, os gráficos caem no exemplo — com o selo "dados de
   * exemplo" no card. Dois retângulos vazios não deixam avaliar escala nem
   * legibilidade, que é o que interessa antes de o backend subir.
   */
  const isSampleChart = flow.length === 0;
  const flowPoints = isSampleChart ? sampleFlowTimeline() : flow;

  const realSlices = useMemo(
    () => toBalanceSlices(expenses?.byCategory ?? []),
    [expenses],
  );

  /** Composição de exemplo enquanto não há despesa cadastrada. */
  const SAMPLE_SLICES = [
    { label: "Aluguel e condomínio", percentage: 34 },
    { label: "Salários e encargos", percentage: 28 },
    { label: "Software e assinaturas", percentage: 14 },
    { label: "Contabilidade e jurídico", percentage: 12 },
    { label: "Marketing e captação", percentage: 8 },
    { label: "Outros", percentage: 4 },
  ];
  const slices = realSlices.length > 0 ? realSlices : SAMPLE_SLICES;
  const isSampleSlices = realSlices.length === 0;

  const isLoading = state === "loading";

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
        <WalletFlowChart points={flowPoints} isSample={isSampleChart} />
        <WalletBalanceChart points={flowPoints} isSample={isSampleChart} />
      </div>

      {(state === "missing" || state === "partial") && (
        <div
          role="status"
          className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">
            {state === "missing"
              ? "Aguardando o servidor"
              : "Dados parciais"}
          </p>
          <p className="mt-1 text-gray-100">
            {state === "missing" ? (
              <>
                Esta área depende do domínio financeiro do escritório — receita
                de honorários e despesas —, que ainda não existe no backend.
                Nada aqui é dado de exemplo: os valores ficam zerados até as
                rotas subirem.
              </>
            ) : (
              <>
                As <strong>entradas estão zeradas por falta de fonte</strong>,
                não por falta de receita: honorário do escritório ainda não tem
                tabela. Os valores que os clientes recebem do INSS ficam em{" "}
                <Link
                  href="/pagamentos"
                  className="font-medium text-secondary underline underline-offset-2"
                >
                  Pagamentos
                </Link>{" "}
                e não entram aqui — são dinheiro deles, não do escritório.
              </>
            )}
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* O `MonthlyBalance` não tem selo próprio; com dado de exemplo o
            período diz "exemplo" para o número do centro não passar por real. */}
        <MonthlyBalance
          total={isSampleSlices ? 27400 : overview.outflowAmount}
          period={isSampleSlices ? "exemplo" : monthName(month)}
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
            emptyMessage={
              state === "missing" || state === "partial"
                ? "O lançamento de despesas ainda não existe no servidor."
                : "Nenhuma despesa com vencimento neste mês."
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="text-lg font-medium text-primary">Entradas do mês</h2>
        <p className="mt-1 text-sm text-gray-100">
          A entrada do escritório é o honorário. Ele ainda não tem onde ser
          registrado — e como os contratos variam (percentual do êxito, valor
          fixo, parcelado), o modelo precisa ser desenhado antes de a tela
          existir. A especificação está em{" "}
          <code>docs/ESPEC_FINANCEIRO.md</code>.
        </p>
        <p className="mt-2 text-sm text-gray-100">
          Não confunda com{" "}
          <Link
            href="/pagamentos"
            className="font-medium text-secondary underline underline-offset-2"
          >
            Pagamentos
          </Link>
          : lá é o que o INSS paga ao cliente. Esse dinheiro é do cliente e não
          passa pelo caixa daqui.
        </p>
      </section>

      <EntryFormModal
        isOpen={isEntryFormOpen}
        onOpenChange={setIsEntryFormOpen}
        onSaved={() => void load()}
      />
    </div>
  );
}
