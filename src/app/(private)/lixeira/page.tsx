"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton, Table } from "@heroui/react";

import ActionButton from "@/components/ui/table/ActionButton";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { StatusBadge } from "@/components/ui/feedback/Badges";
import { UndoIcon } from "@/components/ui/icons/actions";
import { buildSkeletonRows } from "@/lib/pagination";
import { usePermissoes } from "@/hooks/usePermissoes";
import {
  listDeletedClients,
  restoreClient,
} from "@/services/clientService";
import {
  listDeletedAppointments,
  restoreAppointment,
} from "@/services/appointmentService";
import {
  chaveDoItem,
  clienteParaItem,
  compromissoParaItem,
  formatarExclusao,
  ordenarPorExclusao,
  type TrashItem,
} from "@/components/trash/trashItems";

/**
 * Lixeira — o que foi excluído e ainda dá para trazer de volta.
 *
 * ## Por que existe
 *
 * `PATCH /clients/{id}/restore` e `PATCH /appointments/{id}/restore` estavam
 * na API desde sempre e eram **inalcançáveis**: para chamá-las era preciso o
 * UUID do registro, e ninguém anota UUID antes de excluir. O frontend chegou a
 * afirmar em dois lugares que "não há rota de restore" — não havia era tela.
 *
 * A janela de desfazer do `usePendingAction` continua onde está: ela cobre o
 * clique errado, nos 5 segundos seguintes. Esta tela cobre o arrependimento de
 * amanhã, que é outro problema.
 *
 * ## Uma tabela, dois recursos
 *
 * Cliente e compromisso viram o mesmo `TrashItem`. Duas tabelas quase iguais
 * divergem com o tempo — uma ganha a coluna de data formatada, a outra não — e
 * ninguém percebe, porque nunca se vê as duas lado a lado.
 *
 * ## Papel
 *
 * ADMIN/LAWYER, o mesmo que exclui e restaura. Atendente não vê o item no menu
 * e, se digitar a URL, encontra o aviso — não uma tabela vazia que pareceria
 * "a lixeira está limpa".
 */

const COLUMNS = [
  { id: "kind", name: "Tipo" },
  { id: "title", name: "Registro" },
  { id: "subtitle", name: "Identificação" },
  { id: "deletedAt", name: "Excluído em" },
  { id: "actions", name: "Ações" },
];

const SKELETON_ROWS = buildSkeletonRows(6);

/** Uma página só: a lixeira é para achar o que saiu há pouco, não para navegar. */
const TAMANHO_DA_PAGINA = 50;

export default function LixeiraPage() {
  const { podeDestruir } = usePermissoes();
  const [itens, setItens] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [falhou, setFalhou] = useState(false);
  const [alvo, setAlvo] = useState<TrashItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    /**
     * `allSettled`: são dois recursos independentes. Com `all`, uma falha na
     * agenda esconderia os clientes excluídos — e a tela diria "lixeira vazia"
     * para quem está procurando o que apagou.
     */
    const [clientes, compromissos] = await Promise.allSettled([
      listDeletedClients({ pageNumber: 1, pageSize: TAMANHO_DA_PAGINA }),
      listDeletedAppointments({ pageNumber: 1, pageSize: TAMANHO_DA_PAGINA }),
    ]);

    const reunidos: TrashItem[] = [
      ...(clientes.status === "fulfilled"
        ? (clientes.value.data ?? []).map(clienteParaItem)
        : []),
      ...(compromissos.status === "fulfilled"
        ? (compromissos.value.data ?? []).map(compromissoParaItem)
        : []),
    ];

    setItens(ordenarPorExclusao(reunidos));
    setFalhou(
      clientes.status === "rejected" || compromissos.status === "rejected",
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (podeDestruir) void load();
    else setIsLoading(false);
  }, [load, podeDestruir]);

  const confirmarRestauracao = async () => {
    if (!alvo) return;
    setIsRestoring(true);
    try {
      if (alvo.kind === "cliente") await restoreClient(alvo.id);
      else await restoreAppointment(alvo.id);
      setAlvo(null);
      await load();
    } catch {
      // O axiosService já mostrou o erro; o alvo fica para nova tentativa.
    } finally {
      setIsRestoring(false);
    }
  };

  const vazia = useMemo(
    () => !isLoading && itens.length === 0,
    [isLoading, itens],
  );

  if (!podeDestruir) {
    return (
      <div className="flex flex-col gap-5 pb-16">
        <PageHeader
          title="Lixeira"
          description="Registros excluídos, e como trazê-los de volta."
        />
        <div
          role="status"
          className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">Sem acesso</p>
          <p className="mt-1 text-gray-100">
            Restaurar registro é do mesmo perfil que exclui — administrador ou
            advogado. Se você precisa de algo de volta, peça a quem tem esse
            acesso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Lixeira"
        description="Clientes e compromissos excluídos. Restaurar devolve o registro inteiro, com o histórico."
      />

      {falhou && (
        <div
          role="status"
          className="rounded-2xl border border-danger/40 bg-danger/5 px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">Lista incompleta</p>
          <p className="mt-1 text-gray-100">
            Uma das duas origens não respondeu. O que está abaixo é parte do que
            existe — não conclua que o resto não está na lixeira.
          </p>
        </div>
      )}

      <Table variant="secondary" className="text-gray-100">
        <Table.ScrollContainer className="rounded-2xl bg-white">
          <Table.Content
            aria-label="Registros excluídos"
            className="min-w-[800px]"
          >
            <Table.Header columns={COLUMNS}>
              {(column) => (
                <Table.Column
                  className="h-12 rounded-none border-b border-secondary/30 bg-white text-center text-xs tracking-wide text-secondary uppercase after:content-none"
                  isRowHeader={column.id === "title"}
                >
                  {column.name}
                </Table.Column>
              )}
            </Table.Header>

            {isLoading ? (
              <Table.Body items={SKELETON_ROWS}>
                {() => (
                  <Table.Row>
                    <Table.Collection items={COLUMNS}>
                      {() => (
                        <Table.Cell>
                          <Skeleton className="h-4 w-full rounded-md" />
                        </Table.Cell>
                      )}
                    </Table.Collection>
                  </Table.Row>
                )}
              </Table.Body>
            ) : (
              <Table.Body
                items={itens.map((item) => ({
                  ...item,
                  id: chaveDoItem(item),
                  registroId: item.id,
                }))}
                renderEmptyState={() => (
                  <div className="px-6 py-14 text-center text-sm text-gray-100/70">
                    Nada excluído por aqui.
                  </div>
                )}
              >
                {(linha: TrashItem & { registroId: string }) => (
                  <Table.Row>
                    <Table.Cell>
                      <div className="flex justify-center">
                        <StatusBadge
                          label={
                            linha.kind === "cliente" ? "Cliente" : "Compromisso"
                          }
                          tone="neutral"
                        />
                      </div>
                    </Table.Cell>
                    <Table.Cell className="truncate text-primary">
                      {linha.title}
                    </Table.Cell>
                    <Table.Cell className="truncate text-center">
                      {linha.subtitle || "—"}
                    </Table.Cell>
                    <Table.Cell className="text-center whitespace-nowrap">
                      {formatarExclusao(linha.deletedAt)}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="flex items-center justify-end gap-1">
                        <ActionButton
                          label={
                            linha.kind === "cliente"
                              ? "Restaurar cliente"
                              : "Restaurar compromisso"
                          }
                          tone="success"
                          onClick={() =>
                            setAlvo({ ...linha, id: linha.registroId })
                          }
                        >
                          <UndoIcon />
                        </ActionButton>
                      </span>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            )}
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {vazia && !falhou && (
        <p className="text-sm text-gray-100/70">
          A lixeira guarda o que foi excluído por exclusão lógica — nada some do
          banco. Se um registro antigo não está aqui, ele não foi excluído por
          esta aplicação.
        </p>
      )}

      <ConfirmDialog
        isOpen={alvo !== null}
        onClose={() => {
          if (!isRestoring) setAlvo(null);
        }}
        tone="primary"
        heading={
          alvo?.kind === "cliente" ? "Restaurar cliente?" : "Restaurar compromisso?"
        }
        confirmLabel="Restaurar"
        cancelLabel="Manter excluído"
        description={
          alvo ? (
            <>
              <span className="font-medium">{alvo.title}</span> volta a aparecer
              nas listas, com o histórico que tinha antes da exclusão.
            </>
          ) : null
        }
        onConfirm={() => void confirmarRestauracao()}
      />
    </div>
  );
}
