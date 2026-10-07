"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { ActionButton } from "@/components/ui/actions/ActionGroup";
import { PlusIcon } from "@/components/ui/icons/actions";
import { TablePagination } from "@/components/ui/table/TablePagination";
import { CompiladoModel } from "@/components/clients/models/CompiladoModel";
import type { ClientsModelProps } from "@/components/clients/models/shared";
import { invalidateSituationTrail } from "@/components/clients/models/situationTrail";
import { DateRangeField } from "@/components/ui/filters/DateRangeField";
import {
  CLIENTS_PAGE_SIZE,
  INITIAL_CLIENTS_PAGINATION,
  paginationFromEnvelope,
  type ClientsPagination,
} from "@/components/clients/list/clientsPagination";
import { SituationLabelByKey, type SituationKey } from "@/enums/situation/Situation";
import type { Clients } from "@/interfaces/Clients.interface";
import { usePendingAction } from "@/hooks/usePendingAction";
import { usePermissoes } from "@/hooks/usePermissoes";
import { clearClientsCache, getCachedClients, loadClients } from "@/lib/clientsCache";
import { clampPage } from "@/lib/pagination";
import { applyPendingOverlay, applyPendingTotal } from "@/lib/pendingActions";
import {
  clients as fetchClients,
  deleteClient,
  patchClient,
} from "@/services/clientService";
import { notificationCenter } from "@/services/notificationService";
import { useClientFilters } from "./useClientFilters";

/**
 * Clientes — a listagem.
 *
 * A página é só orquestração: busca (com cache e descarte de resposta
 * atrasada), paginação, exclusão com janela de desfazer, mudança de situação,
 * os modais de ficha e exclusão e o painel do financeiro do cliente. O
 * desenho está em `CompiladoModel`, que recebe `ClientsModelProps`.
 */

/** Ficha e financeiro só existem depois do clique: fora do JS inicial da lista. */
const DeleteClientModal = dynamic(
  () => import("@/components/clients/DeleteClientModal"),
  { ssr: false },
);
const ClientDetailsModal = dynamic(() => import("@/components/clients/details/ClientDetailsModal"), { ssr: false });
const ClientFinanceDrawer = dynamic(
  () => import("@/components/clients/finance/ClientFinanceDrawer").then((m) => m.ClientFinanceDrawer),
  { ssr: false },
);

/** Cliente alvo de um modal (ficha ou exclusão). */
type ClientTarget = { id: string; name: string };

/**
 * Uma página carregada, marcada com a requisição que a trouxe (`key`). A tela
 * só usa a que bate com a requisição atual — é o que torna "carregando" um
 * valor derivado, e não um booleano a manter em sincronia à mão.
 */
type LoadedPage = {
  key: string;
  clients: Clients[];
  pagination: ClientsPagination;
  error: string;
};

const messageOf = (reason: unknown) =>
  reason instanceof Error ? reason.message : String(reason);

/**
 * `applyPendingOverlay` pede os rótulos de "concluído"/"cancelado", mas aqui
 * só existe exclusão pendente — nunca são usados.
 */
const NO_STATUS_LABELS = { complete: "", cancel: "" };

export default function ClientsPage() {
  const router = useRouter();
  /**
   * Excluir é de ADMIN/SUPPORT: os demais não veem o botão. O financeiro do
   * cliente é só de quem vê o financeiro (ADMIN).
   */
  const { podeDestruir, podeVerFinanceiro } = usePermissoes();

  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<LoadedPage | null>(null);
  /** Incrementado para refazer a busca depois de criar, editar ou excluir. */
  const [refreshKey, setRefreshKey] = useState(0);

  const [detailsTarget, setDetailsTarget] = useState<(ClientTarget & { edit: boolean }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientTarget | null>(null);
  const [financeTarget, setFinanceTarget] = useState<ClientTarget | null>(null);

  /** Janela de desfazer das exclusões — ver `scheduleDelete`. */
  const { pending, schedule } = usePendingAction();

  /**
   * Filtros. Qualquer mudança volta para a primeira página — senão a pessoa
   * filtra estando na página 7 e recebe uma lista vazia.
   */
  const filters = useClientFilters(() => setPage(1));

  const params = useMemo(
    () => ({ ...filters.params, pageNumber: page, pageSize: CLIENTS_PAGE_SIZE }),
    [filters.params, page],
  );
  const cacheKey = JSON.stringify(params);
  /** O `refreshKey` entra na chave: recarregar é pedir uma requisição nova. */
  const requestKey = `${cacheKey}#${refreshKey}`;

  /**
   * Busca a página quando a requisição muda (filtros, página ou recarga).
   *
   * - `loadClients` serve do cache uma combinação já vista e reaproveita a
   *   mesma combinação já a caminho.
   * - Só a resposta do pedido mais recente chega à tela: trocando de filtro
   *   rápido, a resposta atrasada do anterior é descartada (`active`).
   * - Todo `setState` acontece na resposta, nunca no corpo do efeito — o
   *   "carregando" é derivado da chave (ver `visible` abaixo).
   * - Se a página pedida passou do fim (o último cliente dela foi excluído),
   *   volta para a última que existe.
   */
  useEffect(() => {
    let active = true;
    loadClients(cacheKey, () => fetchClients(params))
      .then((envelope) => {
        if (!active) return;
        setLoaded((previous) => ({
          key: requestKey,
          clients: envelope?.data ?? [],
          pagination: paginationFromEnvelope(
            previous?.pagination ?? INITIAL_CLIENTS_PAGINATION,
            envelope,
          ),
          error: "",
        }));
        const lastPage = envelope?.pagination?.totalPages ?? 0;
        if (lastPage > 0 && params.pageNumber > lastPage) setPage(lastPage);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setLoaded((previous) => ({
          key: requestKey,
          clients: [],
          pagination: previous?.pagination ?? INITIAL_CLIENTS_PAGINATION,
          error: messageOf(reason),
        }));
      });
    return () => {
      active = false;
    };
  }, [cacheKey, params, requestKey]);

  /**
   * A página que a tela mostra: a carregada para esta requisição, ou — antes
   * de a resposta assíncrona chegar — a do cache, para voltar a uma página já
   * vista não piscar o skeleton. Nenhuma das duas = carregando.
   */
  const cached = loaded?.key === requestKey ? undefined : getCachedClients(cacheKey);
  const visible: LoadedPage | null =
    loaded?.key === requestKey
      ? loaded
      : cached
        ? {
            key: requestKey,
            clients: cached.data ?? [],
            pagination: paginationFromEnvelope(
              loaded?.pagination ?? INITIAL_CLIENTS_PAGINATION,
              cached,
            ),
            error: "",
          }
        : null;
  const isLoading = visible === null;
  const error = visible?.error ?? "";
  /** Enquanto carrega, os totais da página anterior seguram o rodapé no lugar. */
  const pagination: ClientsPagination = {
    ...(visible?.pagination ?? loaded?.pagination ?? INITIAL_CLIENTS_PAGINATION),
    pageNumber: page,
  };

  /** Recarrega a lista; a ficha pode ter mudado a situação de qualquer um. */
  const refresh = useCallback(() => {
    clearClientsCache();
    invalidateSituationTrail();
    setRefreshKey((key) => key + 1);
  }, []);

  /**
   * Exclusão com janela de desfazer — mesmo mecanismo da agenda.
   *
   * A linha some da tela na hora e o DELETE só sai quando a janela expira;
   * desfazer é cancelar um timer, sem chamar a API. A exclusão no backend é
   * lógica, mas esta tela não oferece restauração — depois de enviada, não há
   * volta por aqui. Desfazer só existe antes de enviar.
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
   * Abre a ficha — leitura ou edição.
   *
   * Registro sem `id` não abre: `String(undefined)` viraria a string
   * "undefined", que passa por qualquer `if (!id)` e chega à API como
   * `GET /clients/undefined`. O aviso é um toast, não o erro da lista: um
   * registro ruim não pode esconder a página inteira.
   */
  const openClient = (client: Clients, edit: boolean) => {
    if (!client.id) {
      console.error("Cliente sem id na listagem — ficha não aberta.", client);
      notificationCenter.danger("Não foi possível abrir a ficha", {
        description: "Este registro veio sem identificador. Atualize a página.",
      });
      return;
    }
    setDetailsTarget({ id: String(client.id), name: client.fullName, edit });
  };

  const requestDelete = (client: Clients) => {
    if (!client.id) return;
    setDeleteTarget({ id: String(client.id), name: client.fullName });
  };

  /**
   * Muda a situação na linha (PATCH). Sem recarregar a lista: a linha já
   * mostra a etapa nova, e só o cache sai, para a próxima consulta (outra
   * página, outro filtro) vir do servidor com o dado certo. Erro rejeita —
   * o toast sai do interceptor e o cartão fica aberto para tentar de novo.
   */
  const changeSituation = async (client: Clients, situation: SituationKey) => {
    if (!client.id) return;
    await patchClient(String(client.id), { situation });
    const label = SituationLabelByKey[situation];
    const updatedAt = new Date().toISOString();
    setLoaded((current) =>
      current && {
        ...current,
        clients: current.clients.map((item) =>
          item.id === client.id ? { ...item, situation: label, updatedAt } : item,
        ),
      },
    );
    clearClientsCache();
    invalidateSituationTrail(String(client.id));
    notificationCenter.success(`Situação de ${client.fullName} atualizada para "${label}".`);
  };

  const goToPage = (target: number) => setPage(clampPage(target, pagination.totalPages));

  /** Exclusões agendadas já saem da lista e do total, antes da requisição. */
  const loadedClients = visible?.clients ?? [];
  const visibleClients = applyPendingOverlay(loadedClients, pending, NO_STATUS_LABELS);
  const total = applyPendingTotal(pagination.totalRecords, loadedClients, pending);

  /** Tudo o que a lista precisa — ver `models/shared.ts`. */
  const listProps: ClientsModelProps = {
    clients: visibleClients,
    isLoading,
    error,
    filterState: filters,
    dateRangeField: (
      <DateRangeField
        value={filters.dateRange}
        onChange={filters.setDateRange}
        error={filters.dateError}
      />
    ),
    pagination: (
      <TablePagination
        pageNumber={page}
        pageSize={pagination.pageSize}
        total={total}
        totalPages={pagination.totalPages}
        onPageChange={goToPage}
        noun={["cliente", "clientes"]}
      />
    ),
    canDelete: podeDestruir,
    actions: {
      onCreate: () => router.push("/clientes/novo"),
      onView: (client) => openClient(client, false),
      onEdit: (client) => openClient(client, true),
      onDelete: requestDelete,
      onChangeSituation: changeSituation,
      onViewFinance: podeVerFinanceiro
        ? (client) => {
            if (client.id) setFinanceTarget({ id: String(client.id), name: client.fullName });
          }
        : undefined,
    },
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes"
        description="Beneficiários do escritório, com situação e benefício em análise."
        actions={
          <ActionButton
            tone="onDark"
            shape="pill"
            icon={<PlusIcon />}
            onClick={() => router.push("/clientes/novo")}
          >
            Novo cliente
          </ActionButton>
        }
      />

      <CompiladoModel {...listProps} />

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
