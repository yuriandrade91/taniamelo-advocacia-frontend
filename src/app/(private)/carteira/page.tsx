"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";

import { WalletEntryList, type WalletEntryActions } from "@/components/wallet/WalletEntryList";
import { WalletFilterBar } from "@/components/wallet/WalletFilterBar";
import { WalletMonthSummary } from "@/components/wallet/summary/WalletMonthSummary";
import dynamic from "next/dynamic";
import type { EntryDetailsTarget } from "@/components/wallet/EntryDetailsDrawer";
import { KIND_META } from "@/components/wallet/entryKind";
import {
  expenseFormFrom,
  incomeFormFrom,
  type EntryKind,
} from "@/components/wallet/entryForms";
import type { EntryEditing } from "@/components/wallet/useEntryForm";
import { expenseFilters as EXPENSE_FILTERS, revenueFilters as REVENUE_FILTERS } from "@/components/wallet/walletFilters";
import { useWalletMonth } from "@/components/wallet/useWalletMonth";
import { bucketQuery, type PaymentBucket } from "@/components/payments/paymentBuckets";
import { editWarning } from "@/components/payments/editWarning";
import { useEditConfirmation } from "@/components/payments/useEditConfirmation";
import { TablePagination } from "@/components/ui/table/TablePagination";
import { MonthPicker } from "@/components/ui/filters/MonthPicker";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { NoFinanceAccess } from "@/components/ui/feedback/NoFinanceAccess";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
import { useFilters } from "@/hooks/useFilters";
import { usePagedList } from "@/hooks/usePagedList";
import { pageFromEnvelope } from "@/lib/pagination";
import { usePermissions } from "@/hooks/usePermissions";
import { currentMonth, monthRange, todayIso, type MonthRef } from "@/lib/period";
import type { PaymentMethodInput } from "@/enums/payment/Payment";
import type { ExpenseCategoryInput } from "@/enums/expenseCategory/ExpenseCategory";
import { deleteOfficeExpense, listOfficeExpenses } from "@/services/officeExpenseService";
import { deleteOfficeRevenue, listOfficeRevenues } from "@/services/officeRevenueService";

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

/** Formulário e painel de detalhe só existem depois do clique: fora do JS inicial. */
const EntryFormModal = dynamic(() => import("@/components/wallet/EntryFormModal").then((m) => m.EntryFormModal), { ssr: false });
const EntryDetailsDrawer = dynamic(
  () => import("@/components/wallet/EntryDetailsDrawer").then((m) => m.EntryDetailsDrawer),
  { ssr: false },
);

/** Linhas por página nas duas listas. */
const PAGE_SIZE = 10;

/**
 * Filtros da aba → parâmetros da lista, dentro do mês do seletor. O balde
 * vira status + corte de vencimento intersectado com o mês (`bucketQuery`);
 * `null` quando a interseção é vazia ("Atrasado" num mês futuro): aí não há
 * o que perguntar ao servidor.
 */
function listParams(
  filters: { bucket: string; paymentMethod: string[]; category?: string[] },
  searchTerm: string,
  range: { from: string; to: string },
) {
  const bucket = bucketQuery(filters.bucket as PaymentBucket | "", { dueFrom: range.from, dueTo: range.to }, todayIso());
  if (bucket.empty) return null;
  return {
    searchTerm: searchTerm || undefined,
    status: bucket.status,
    dueFrom: bucket.dueFrom,
    dueTo: bucket.dueTo,
    paymentMethod: filters.paymentMethod.length ? (filters.paymentMethod as PaymentMethodInput[]) : undefined,
    category: filters.category?.length ? (filters.category as ExpenseCategoryInput[]) : undefined,
  };
}

type Params = NonNullable<ReturnType<typeof listParams>>;

type Target = { kind: EntryKind; id: string; description: string };

export default function WalletPage() {
  /**
   * Dinheiro do escritório é de quem administra (D3). A guarda aqui é da tela
   * — as rotas são `@RequerAdmin` — e segura as chamadas até a permissão ser
   * conhecida: sem ela, saíam no mount e tomavam 403 de quem não é ADMIN.
   */
  const { canSeeFinance } = usePermissions();
  const [month, setMonth] = useState<MonthRef>(() => currentMonth());
  const range = useMemo(() => monthRange(month), [month]);
  /** Aba da lista. Despesa primeiro: é a que pede ação (pagar). */
  const [tab, setTab] = useState<EntryKind>("expense");
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [editing, setEditing] = useState<(EntryEditing & { description: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<EntryDetailsTarget | null>(null);
  /** Recebido/pago ou cancelado: o lápis confirma antes de editar. */
  const confirmEdit = useEditConfirmation();

  const monthData = useWalletMonth(range, canSeeFinance);

  /** Cada aba com os seus filtros: categoria só existe em despesa. */
  const expenseFilters = useFilters(EXPENSE_FILTERS);
  const revenueFilters = useFilters(REVENUE_FILTERS);
  const { bucket: expenseBucket, paymentMethod: expenseMethod, category } = expenseFilters.values;
  const { bucket: revenueBucket, paymentMethod: revenueMethod } = revenueFilters.values;
  const expenseParams = useMemo(
    () => listParams({ bucket: expenseBucket, paymentMethod: expenseMethod, category }, expenseFilters.search, range),
    [expenseBucket, expenseMethod, category, expenseFilters.search, range],
  );
  const revenueParams = useMemo(
    () => listParams({ bucket: revenueBucket, paymentMethod: revenueMethod }, revenueFilters.search, range),
    [revenueBucket, revenueMethod, revenueFilters.search, range],
  );

  /*
   * As listas usam VENCIMENTO ("o que há no mês", inclusive o não pago) e cada
   * uma só vai ao servidor com a aba dela aberta: a Carteira abre pedindo as
   * despesas, e as entradas só no clique. A contagem das abas vem do resumo.
   */
  const expenses = usePagedList({
    enabled: canSeeFinance && tab === "expense",
    params: expenseParams,
    fetchPage: (params: Params, page) => listOfficeExpenses({ ...params, pageNumber: page, pageSize: PAGE_SIZE }).then(pageFromEnvelope),
  });
  const revenues = usePagedList({
    enabled: canSeeFinance && tab === "income",
    params: revenueParams,
    fetchPage: (params: Params, page) => listOfficeRevenues({ ...params, pageNumber: page, pageSize: PAGE_SIZE }).then(pageFromEnvelope),
  });

  /** Gravou ou excluiu: muda o saldo e a lista daquele lado — só dele. */
  const reloadAfterChange = (kind: EntryKind) => {
    monthData.reload(kind);
    (kind === "income" ? revenues : expenses).invalidate();
  };

  /**
   * Excluir é soft delete sem rota de restaurar: confirma antes, em vez da
   * janela de desfazer da agenda — desfazer depois do fato só poderia falhar.
   */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await (deleteTarget.kind === "income" ? deleteOfficeRevenue : deleteOfficeExpense)(deleteTarget.id);
      setDeleteTarget(null);
      reloadAfterChange(deleteTarget.kind);
    } catch {
      // O axiosService já mostrou o erro; o alvo fica para nova tentativa.
    } finally {
      setIsDeleting(false);
    }
  };

  const entryActions: WalletEntryActions = {
    expense: {
      onView: (item) => setDetailsTarget({ kind: "expense", id: item.id, description: item.description }),
      onEdit: (item) =>
        confirmEdit.request(editWarning(item, "pago"), () =>
          setEditing({ kind: "expense", id: item.id, values: expenseFormFrom(item), description: item.description }),
        ),
      onDelete: (item) => setDeleteTarget({ kind: "expense", id: item.id, description: item.description }),
    },
    revenue: {
      onView: (item) => setDetailsTarget({ kind: "income", id: item.id, description: item.description }),
      onEdit: (item) =>
        confirmEdit.request(editWarning(item, "recebido"), () =>
          setEditing({ kind: "income", id: item.id, values: incomeFormFrom(item), description: item.description }),
        ),
      onDelete: (item) => setDeleteTarget({ kind: "income", id: item.id, description: item.description }),
    },
  };

  if (!canSeeFinance) return <NoFinanceAccess title="Carteira" />;

  const list = tab === "expense" ? expenses : revenues;
  const filters = tab === "expense" ? expenseFilters : revenueFilters;
  const noun = KIND_META[tab].noun;
  const emptyMessage = list.failed
    ? `Não foi possível carregar as ${noun}s. Tente novamente.`
    : filters.hasActive
      ? `Nenhuma ${noun} encontrada para os filtros escolhidos.`
      : `Nenhuma ${noun} com vencimento neste mês.`;

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Carteira"
        description="Receitas e despesas do escritório — pelo que foi efetivamente pago no mês."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker value={month} onChange={setMonth} maxMonth={currentMonth()} tone="dark" />
            {/* Um botão só: o tipo é escolhido no modal, depois de ver o que ele pede. */}
            <Button type="button" variant="ghost" className="on-primary-button bg-secondary" onPress={() => setIsEntryFormOpen(true)}>
              Registrar lançamento
            </Button>
          </div>
        }
      />

      {/* O financeiro do mês vem primeiro; a lista, depois. */}
      <WalletMonthSummary summary={monthData.summary} isLoading={monthData.state === "loading"} month={month} />

      {(monthData.state === "partial" || monthData.state === "error") && (
        <div role="status" className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary">
          <p className="font-medium">{monthData.state === "error" ? "Não foi possível carregar" : "Dados parciais"}</p>
          <p className="mt-1 text-gray-100">
            {monthData.state === "error"
              ? "Nem as receitas nem as despesas responderam. Os valores estão zerados por falta de resposta, não por falta de movimento — recarregue a página antes de tirar qualquer conclusão deles."
              : "Uma das metades não respondeu, então o saldo acima está incompleto. Ele soma só o que chegou."}
          </p>
        </div>
      )}

      {/* Filtro → lista → paginação, da aba aberta: cada aba guarda os seus filtros. */}
      <section className="flex flex-col gap-4">
        <WalletFilterBar tab={tab} onTabChange={setTab} counts={monthData.counts} filters={filters} />
        {tab === "expense" ? (
          <WalletEntryList kind="expense" items={expenses.items} isLoading={expenses.isLoading} emptyMessage={emptyMessage} actions={entryActions} />
        ) : (
          <WalletEntryList kind="income" items={revenues.items} isLoading={revenues.isLoading} emptyMessage={emptyMessage} actions={entryActions} />
        )}
        <TablePagination
          pageNumber={list.page}
          pageSize={PAGE_SIZE}
          total={list.total}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          noun={[noun, `${noun}s`]}
        />
        {tab === "income" && (
          <p className="px-1 text-sm text-gray-100">
            Entrada aqui é honorário, parecer avulso, reembolso — dinheiro do escritório. Não confunda com{" "}
            <Link href="/pagamentos" className="font-medium text-secondary underline underline-offset-2">
              Pagamentos
            </Link>
            : lá é o que o INSS paga ao cliente, e esse dinheiro não passa pelo caixa daqui.
          </p>
        )}
      </section>

      {isEntryFormOpen && (
      <EntryFormModal
        isOpen
        onOpenChange={setIsEntryFormOpen}
        // Abre a aba do que acabou de ser gravado, para a pessoa ver o resultado.
        onSaved={(kind) => {
          setTab(kind);
          reloadAfterChange(kind);
        }}
      />
      )}

      {/* Montado só com alvo: o modal de edição nunca herda estado de outra edição. */}
      {editing && (
        <EntryFormModal isOpen onOpenChange={(open) => !open && setEditing(null)} onSaved={reloadAfterChange} editing={editing} />
      )}

      {detailsTarget && (
        <EntryDetailsDrawer
          // `key`: abrir outro lançamento remonta o painel, com estado limpo.
          key={`${detailsTarget.kind}-${detailsTarget.id}`}
          target={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onSaved={reloadAfterChange}
        />
      )}

      {confirmEdit.dialog}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        tone="danger"
        heading={deleteTarget?.kind === "income" ? "Excluir entrada?" : "Excluir saída?"}
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description={
          deleteTarget && (
            <>
              <span className="font-medium">{deleteTarget.description}</span> sai da Carteira e deixa de contar no saldo
              do mês. Não há como restaurar por aqui.
            </>
          )
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
