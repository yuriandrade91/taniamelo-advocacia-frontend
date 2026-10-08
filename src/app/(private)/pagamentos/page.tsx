"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@heroui/react";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { NoFinanceAccess } from "@/components/ui/feedback/NoFinanceAccess";
import { TablePagination } from "@/components/ui/table/TablePagination";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import type { PaymentDetailsTarget } from "@/components/payments/PaymentDetailsDrawer";
import { PaymentsBoard } from "@/components/payments/list/PaymentsBoard";
import type { PaymentsLoadState } from "@/components/payments/list/types";
import { paymentFilters } from "@/components/payments/paymentFilters";
import {
  bucketQuery,
  type PaymentBucket,
} from "@/components/payments/paymentBuckets";
import { editWarning } from "@/components/payments/editWarning";
import { useEditConfirmation } from "@/components/payments/useEditConfirmation";
import { invalidateInstallmentTrail } from "@/components/payments/installmentTrail";
import { useFilters } from "@/hooks/useFilters";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { todayIso } from "@/lib/period";
import { deletePayment } from "@/services/clientPaymentService";
import { listOfficePayments } from "@/services/officePaymentService";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import type { PaymentMethodInput } from "@/enums/payment/Payment";

/** Ficha, painel e formulários só existem depois do clique: fora do JS inicial da tela. */
const ClientDetailsModal = dynamic(
  () => import("@/components/clients/details/ClientDetailsModal"),
  { ssr: false },
);
const PaymentDetailsDrawer = dynamic(
  () =>
    import("@/components/payments/PaymentDetailsDrawer").then(
      (m) => m.PaymentDetailsDrawer,
    ),
  { ssr: false },
);
const BenefitPaymentModal = dynamic(
  () =>
    import("@/components/payments/BenefitPaymentModal").then(
      (m) => m.BenefitPaymentModal,
    ),
  { ssr: false },
);
const RegisterReceiptModal = dynamic(
  () =>
    import("@/components/payments/RegisterReceiptModal").then(
      (m) => m.RegisterReceiptModal,
    ),
  { ssr: false },
);
const EditPaymentModal = dynamic(
  () =>
    import("@/components/payments/EditPaymentModal").then(
      (m) => m.EditPaymentModal,
    ),
  {
    ssr: false,
  },
);

/**
 * Valores que os clientes têm a receber **do INSS** — visão consolidada de
 * `client_payments`.
 *
 * ## Que dinheiro é este
 *
 * Atrasados da concessão, benefício mensal, parcela de acordo: o que o INSS
 * paga ao cliente. **Não é honorário.** Honorário é receita do escritório e
 * mora na Carteira.
 *
 * A confusão é fácil e cara, porque a tabela não distingue: `client_payments`
 * é "um valor com vencimento e data de pagamento preso a um cliente", que
 * serve de forma igual aos dois. O significado vem de quem escreve nela — e
 * esta tela é o único lugar que escreve, o que é o que mantém a coluna com um
 * sentido só.
 *
 * ## Por que esta tela existe separada da ficha do cliente
 *
 * A pergunta que ela responde é da carteira de clientes, não de um cliente:
 * "quem está esperando crédito", "o que entra este mês", "quem já recebeu".
 * Responder isso abrindo cliente por cliente é o que a tela substitui.
 *
 * ## O que ela ainda não tem
 *
 * `GET /api/v1/payments` **não existe no backend**. Enquanto não existir, as
 * chamadas respondem 404 e a tela diz isso com todas as letras, em vez de
 * mostrar "nenhum pagamento encontrado" — que seria mentira, e a pior espécie:
 * a que parece funcionamento normal. A especificação para implementar está em
 * `docs/ESPEC_FINANCEIRO.md`.
 *
 * Descartei agregar no front (listar clientes e pedir os pagamentos de cada):
 * são 126 requisições para 125 clientes, e piora a cada cadastro.
 */

/** 12 por página fecham as linhas de 2, 3 e 4 cartões. */
const PAGE_SIZE = 12;

const statusOf = (reason: unknown) =>
  (reason as { response?: { status?: number } })?.response?.status;

export default function PaymentsPage() {
  /**
   * D3: dinheiro é só do administrador. O backend impõe (`@RequerAdmin`), e
   * sem esta guarda a tela tomava 403 em silêncio e mostrava lista vazia —
   * que se lê como "não há pagamentos", não como "você não tem acesso".
   */
  const { canSeeFinance } = usePermissions();
  const filters = useFilters(paymentFilters);
  const { bucket, period, paymentMethod } = filters.values;

  /**
   * Filtros → consulta. O balde vira status + corte de vencimento
   * (`bucketQuery`); `null` quando a interseção é vazia ("Atrasado" com "vence
   * de" no futuro): lista vazia sem perguntar ao servidor. Listas e datas só
   * entram com valor.
   */
  const params = useMemo(() => {
    const query = bucketQuery(
      bucket as PaymentBucket | "",
      { dueFrom: period.from || undefined, dueTo: period.to || undefined },
      todayIso(),
    );
    if (query.empty) return null;
    return {
      searchTerm: filters.search || undefined,
      paymentMethod: paymentMethod.length
        ? (paymentMethod as PaymentMethodInput[])
        : undefined,
      status: query.status,
      dueFrom: query.dueFrom,
      dueTo: query.dueTo,
    };
  }, [filters.search, bucket, period, paymentMethod]);

  const list = usePagedList({
    enabled: canSeeFinance,
    params,
    fetchPage: (query: NonNullable<typeof params>, page) =>
      listOfficePayments({
        ...query,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      }).then((envelope) => ({
        items: envelope?.data ?? [],
        total: envelope?.pagination?.totalRecords ?? 0,
        totalPages: envelope?.pagination?.totalPages ?? 0,
      })),
  });
  /** 404 não é "não achei pagamento", é "a rota não existe": a tela diz isso, em vez de mentir. */
  const state: PaymentsLoadState = list.isLoading
    ? "loading"
    : list.failed
      ? statusOf(list.failureReason) === 404
        ? "missing-endpoint"
        : "error"
      : "ready";

  /** Depois de gravar ou excluir: a lista e as parcelas de cada acordo podem ter mudado. */
  const reload = () => {
    invalidateInstallmentTrail();
    list.invalidate();
  };

  const [isChargeFormOpen, setIsChargeFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficePaymentResponse | null>(
    null,
  );
  const [receiptTarget, setReceiptTarget] =
    useState<OfficePaymentResponse | null>(null);
  const [detailsTarget, setDetailsTarget] =
    useState<PaymentDetailsTarget | null>(null);
  const [clientTarget, setClientTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<OfficePaymentResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  /** Recebido ou cancelado: confirma antes de abrir a edição. */
  const confirmEdit = useEditConfirmation();

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePayment(deleteTarget.clientId, deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch {
      // O axiosService já mostrou o erro; o alvo fica para nova tentativa.
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canSeeFinance)
    return <NoFinanceAccess titulo="Pagamentos aos clientes" />;

  const emptyMessage =
    state === "missing-endpoint"
      ? "A lista respondeu 404 — confira se o servidor está atualizado."
      : state === "error"
        ? "Não foi possível carregar os valores. Tente novamente."
        : "Nenhum recebimento encontrado para os filtros escolhidos.";

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Pagamentos aos clientes"
        description={
          <>
            O que os clientes têm a receber do INSS — atrasados, benefício,
            acordo — pela data prevista do crédito. Para receitas e despesas do
            escritório, veja{" "}
            <Link
              href="/carteira"
              className="font-medium text-secondary underline underline-offset-2"
            >
              Carteira
            </Link>
            ; para a evolução mês a mês,{" "}
            <Link
              href="/relatorios"
              className="font-medium text-secondary underline underline-offset-2"
            >
              Relatórios
            </Link>
            .
          </>
        }
        actions={
          <Button
            type="button"
            variant="ghost"
            className="on-primary-button bg-secondary"
            onPress={() => setIsChargeFormOpen(true)}
          >
            Lançar valor a receber
          </Button>
        }
      />

      <PaymentsBoard
        items={list.items}
        state={state}
        emptyMessage={emptyMessage}
        filters={filters}
        pagination={
          <TablePagination
            pageNumber={list.page}
            pageSize={PAGE_SIZE}
            total={list.total}
            totalPages={list.totalPages}
            onPageChange={list.setPage}
            noun={["recebimento", "recebimentos"]}
          />
        }
        actions={{
          onView: (item) =>
            setDetailsTarget({
              clientId: item.clientId,
              id: item.id,
              clientName: item.clientName,
              descricao: item.description,
            }),
          onRegisterReceipt: setReceiptTarget,
          onEdit: (item) =>
            confirmEdit.request(editWarning(item, "recebido"), () =>
              setEditTarget(item),
            ),
          onDelete: setDeleteTarget,
          onViewClient: (item) =>
            setClientTarget({ id: item.clientId, name: item.clientName }),
        }}
      />

      {state === "missing-endpoint" && (
        <div
          role="status"
          className="rounded-2xl border border-danger/40 bg-danger/5 px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">A lista respondeu 404</p>
          <p className="mt-1 text-gray-100">
            <code>/api/v1/payments</code> existe desde a V18, então um 404 aqui
            é sinal de servidor desatualizado ou de proxy apontando para outro
            lugar — não de recurso que falta.
          </p>
        </div>
      )}

      {detailsTarget && (
        <PaymentDetailsDrawer
          // `key`: abrir outra parcela remonta o painel, com estado limpo.
          key={`${detailsTarget.clientId}-${detailsTarget.id}`}
          target={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onSaved={reload}
          onViewClient={() =>
            setClientTarget({
              id: detailsTarget.clientId,
              name: detailsTarget.clientName,
            })
          }
        />
      )}

      {/* Montada só com alvo; ao salvar, a lista recarrega — o nome na linha pode ter mudado. */}
      {clientTarget && (
        <ClientDetailsModal
          isOpen
          clientId={clientTarget.id}
          clientName={clientTarget.name}
          onClose={() => setClientTarget(null)}
          onConfirm={reload}
        />
      )}

      {isChargeFormOpen && (
        <BenefitPaymentModal
          isOpen
          onOpenChange={setIsChargeFormOpen}
          onSaved={reload}
        />
      )}
      {receiptTarget && (
        <RegisterReceiptModal
          payment={receiptTarget}
          onClose={() => setReceiptTarget(null)}
          onSaved={reload}
        />
      )}
      {editTarget && (
        <EditPaymentModal
          payment={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={reload}
        />
      )}
      {confirmEdit.dialog}

      {/* Confirmar antes, e não desfazer depois: soft delete sem rota de restaurar. */}
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        tone="danger"
        heading="Excluir parcela?"
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description={
          deleteTarget && (
            <>
              <span className="font-medium">{deleteTarget.description}</span> de{" "}
              <span className="font-medium">{deleteTarget.clientName}</span> sai
              da lista e dos totais. Não há como restaurar por aqui.
            </>
          )
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
