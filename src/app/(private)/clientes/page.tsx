"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { ActionButton } from "@/components/ui/actions/ActionGroup";
import { PlusIcon } from "@/components/ui/icons/actions";
import { DateRangeField } from "@/components/ui/filters/DateRangeField";
import { TablePagination } from "@/components/ui/table/TablePagination";
import { ClientsList } from "@/components/clients/list/ClientsList";
import { useClientFilters } from "@/components/clients/list/useClientFilters";
import { invalidateRequestStageTrail, invalidateSituationTrail } from "@/components/clients/stage/stageTrails";
import { situationChangedMessage } from "@/components/clients/stage/stages";
import { changeRequestStage } from "@/components/clients/stage/requestStageChange";
import { SituationLabelByKey, type SituationKey } from "@/enums/situation/Situation";
import { RequestStageLabelByKey, type RequestStageKey } from "@/enums/requestStage/RequestStage";
import type { ClientListItem } from "@/interfaces/client/Client.interface";
import { usePagedList } from "@/hooks/usePagedList";
import { usePendingAction } from "@/hooks/usePendingAction";
import { usePermissions } from "@/hooks/usePermissions";
import { clientsListCache } from "@/lib/clientsCache";
import { messageOf } from "@/lib/errorMessage";
import { pageFromEnvelope } from "@/lib/pagination";
import { applyPendingOverlay, applyPendingTotal } from "@/lib/pendingActions";
import { clients as fetchClients, deleteClient, patchClient } from "@/services/clientService";
import { notificationCenter } from "@/services/notificationService";

/**
 * Clientes — a listagem.
 *
 * A página é só orquestração: a lista paginada (`usePagedList`, com o cache de
 * sessão de `clientsListCache` — voltar à lista não relê), a exclusão com
 * janela de desfazer, a mudança de etapa, e os modais de ficha, exclusão e
 * financeiro. O desenho está em `ClientsList`.
 *
 * `?searchTerm=` é a busca da barra superior: vira o texto da busca da lista,
 * também quando ela chega com a lista já aberta.
 */

/** Ficha e financeiro só existem depois do clique: fora do JS inicial da lista. */
const DeleteClientModal = dynamic(() => import("@/components/clients/DeleteClientModal"), { ssr: false });
const ClientDetailsModal = dynamic(() => import("@/components/clients/details/ClientDetailsModal"), { ssr: false });
const ClientFinanceDrawer = dynamic(
  () => import("@/components/clients/finance/ClientFinanceDrawer").then((m) => m.ClientFinanceDrawer),
  { ssr: false },
);

const PAGE_SIZE = 10;

/** Cliente alvo de um modal (ficha, exclusão, financeiro). */
type ClientTarget = { id: string; name: string };

/** Só existe exclusão pendente aqui: os rótulos de concluído/cancelado nunca são usados. */
const NO_STATUS_LABELS = { complete: "", cancel: "" };

export default function ClientsPage() {
  // `useSearchParams` num export estático pede a fronteira de Suspense.
  return (
    <Suspense fallback={null}>
      <ClientsPageContent />
    </Suspense>
  );
}

function ClientsPageContent() {
  const router = useRouter();
  /** Excluir é de ADMIN/SUPPORT; o financeiro do cliente, de quem vê o financeiro (ADMIN). */
  const { canDestroy, canSeeFinance } = usePermissions();

  const [detailsTarget, setDetailsTarget] = useState<(ClientTarget & { edit: boolean }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientTarget | null>(null);
  const [financeTarget, setFinanceTarget] = useState<ClientTarget | null>(null);

  const filters = useClientFilters();

  /** Cada busca nova da barra superior entra uma vez; depois, o campo é da pessoa. */
  const urlSearch = useSearchParams().get("searchTerm") ?? "";
  const [appliedUrlSearch, setAppliedUrlSearch] = useState("");
  if (urlSearch !== appliedUrlSearch) {
    setAppliedUrlSearch(urlSearch);
    if (urlSearch) filters.setSearch(urlSearch);
  }

  const list = usePagedList({
    params: filters.params,
    cache: clientsListCache,
    fetchPage: (params, page) =>
      fetchClients({ ...params, pageNumber: page, pageSize: PAGE_SIZE }).then(pageFromEnvelope),
  });

  /**
   * A etapa que acabou de mudar na linha (do benefício ou no INSS), até a
   * lista relida trazer a mesma do servidor: a pessoa vê a etapa nova na hora,
   * sem esperar a releitura.
   */
  const [situationOverrides, setSituationOverrides] = useState<
    Record<string, Partial<Pick<ClientListItem, "situation" | "requestStage" | "updatedAt">>>
  >({});

  /** Exclusões com janela de desfazer — a linha some na hora, o DELETE sai depois. */
  const { pending, schedule } = usePendingAction();

  const { invalidate } = list;
  /** Relê a lista; a ficha pode ter mudado a situação de qualquer um. */
  const refresh = useCallback(() => {
    invalidateSituationTrail();
    invalidateRequestStageTrail();
    setSituationOverrides({});
    invalidate();
  }, [invalidate]);

  /**
   * Exclusão com janela de desfazer — mesmo mecanismo da agenda. A exclusão no
   * backend é lógica, mas esta tela não oferece restauração: depois de
   * enviada, não há volta por aqui.
   */
  const scheduleDelete = (target: ClientTarget) => {
    schedule({
      key: target.id,
      kind: "delete",
      message: "Cliente excluído.",
      commit: () => deleteClient(target.id, { silent: true }),
      onSettled: refresh,
    });
  };

  /**
   * Abre a ficha — leitura ou edição. Registro sem `id` não abre:
   * `String(undefined)` viraria "undefined", que passa por qualquer `if (!id)`
   * e chega à API como `GET /clients/undefined`. Um registro ruim vira um
   * aviso, não o erro da lista inteira.
   */
  const openClient = (client: ClientListItem, edit: boolean) => {
    if (!client.id) {
      notificationCenter.danger("Não foi possível abrir a ficha", {
        description: "Este registro veio sem identificador. Atualize a página.",
      });
      return;
    }
    setDetailsTarget({ id: String(client.id), name: client.fullName, edit });
  };

  /** Muda a etapa na linha (PATCH). Erro rejeita: o toast sai do interceptor e o cartão fica aberto. */
  const changeSituation = async (client: ClientListItem, situation: SituationKey) => {
    if (!client.id) return;
    const id = String(client.id);
    await patchClient(id, { situation }, { successMessage: situationChangedMessage(client.fullName, situation) });
    setSituationOverrides((current) => ({
      ...current,
      [id]: { ...current[id], situation: SituationLabelByKey[situation], updatedAt: new Date().toISOString() },
    }));
    invalidateSituationTrail(id);
    invalidate();
  };

  /**
   * Muda a situação no INSS na linha (PATCH `requestStage`, com a
   * justificativa quando a etapa pede). Mesmo contrato do `changeSituation`.
   */
  const changeStageInInss = async (client: ClientListItem, requestStage: RequestStageKey, justification: string) => {
    if (!client.id) return;
    const id = String(client.id);
    await changeRequestStage(id, client.fullName, requestStage, justification);
    setSituationOverrides((current) => ({
      ...current,
      [id]: { ...current[id], requestStage: RequestStageLabelByKey[requestStage], updatedAt: new Date().toISOString() },
    }));
    invalidate();
  };

  /** Exclusões agendadas já saem da lista e do total; etapas recém-mudadas já aparecem. */
  const clients = applyPendingOverlay(list.items, pending, NO_STATUS_LABELS).map((client) =>
    client.id && situationOverrides[client.id] ? { ...client, ...situationOverrides[client.id] } : client,
  );
  const total = applyPendingTotal(list.total, list.items, pending);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes"
        description="Beneficiários do escritório, com situação e benefício em análise."
        actions={
          <ActionButton tone="onDark" shape="pill" icon={<PlusIcon />} onClick={() => router.push("/clientes/novo")}>
            Novo cliente
          </ActionButton>
        }
      />

      <ClientsList
        clients={clients}
        isLoading={list.isLoading}
        error={list.failed ? messageOf(list.failureReason, "Não foi possível carregar os clientes.") : ""}
        filterState={filters}
        dateRangeField={
          <DateRangeField value={filters.dateRange} onChange={filters.setDateRange} error={filters.dateError} />
        }
        pagination={
          <TablePagination
            pageNumber={list.page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={list.totalPages}
            onPageChange={list.setPage}
            noun={["cliente", "clientes"]}
          />
        }
        canDelete={canDestroy}
        actions={{
          onCreate: () => router.push("/clientes/novo"),
          onView: (client) => openClient(client, false),
          onEdit: (client) => openClient(client, true),
          onDelete: (client) => {
            if (client.id) setDeleteTarget({ id: String(client.id), name: client.fullName });
          },
          onChangeSituation: changeSituation,
          onChangeRequestStage: changeStageInInss,
          onViewFinance: canSeeFinance
            ? (client) => {
                if (client.id) setFinanceTarget({ id: String(client.id), name: client.fullName });
              }
            : undefined,
        }}
      />

      <DeleteClientModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        clientName={deleteTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteTarget) scheduleDelete(deleteTarget);
        }}
      />

      {financeTarget && (
        <ClientFinanceDrawer
          key={financeTarget.id}
          client={financeTarget}
          onClose={() => setFinanceTarget(null)}
          onViewClient={() => {
            setFinanceTarget(null);
            setDetailsTarget({ ...financeTarget, edit: false });
          }}
        />
      )}

      {/* Montada por alvo (`key`): cada abertura começa limpa, em leitura ou edição. */}
      {detailsTarget && (
        <ClientDetailsModal
          key={`${detailsTarget.id}-${detailsTarget.edit}`}
          isOpen
          clientId={detailsTarget.id}
          clientName={detailsTarget.name}
          editOnOpen={detailsTarget.edit}
          onClose={() => setDetailsTarget(null)}
          onConfirm={refresh}
        />
      )}
    </div>
  );
}
