"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@heroui/react";
import { PotentialClientPopover } from "@/components/clients/PotentialClientPopover";
import {
  RowActions,
  deleteAction,
  editAction,
  viewAction,
  type RowAction,
} from "@/components/ui/table/RowActions";
import CopyableValue from "@/components/ui/table/CopyableValue";
import { ActionButton } from "@/components/ui/actions/ActionGroup";
import { WalletIcon } from "@/components/ui/icons/glyphs";
import { DataList, ListEmpty, type ListColumn } from "@/components/ui/list/DataList";
import type { SituationKey } from "@/enums/situation/Situation";
import type { RequestStageKey } from "@/enums/requestStage/RequestStage";
import type { ClientListItem } from "@/interfaces/client/Client.interface";
import { initials } from "@/lib/format";
import { STAGES, stageOf, type Stage } from "@/components/clients/stage/stages";
import { StageChanger } from "@/components/clients/stage/StageChanger";
import { RequestStageChanger } from "@/components/clients/stage/RequestStageChanger";
import type { UseClientFiltersResult } from "./useClientFilters";
import { ClientsFilterBar } from "./ClientsFilterBar";
import { ExemptBadge, LeadBadge } from "./ClientBadges";
import { clientKey, cpfOf, display, formatDate, isExempt, isLead, updatedOf } from "./clientDisplay";

/**
 * A lista de Clientes.
 *
 * - Linha em duas camadas com todos os campos: nome, CPF (copiável), nº de
 *   beneficiário, benefício pretendido, situação do benefício, data do
 *   registro, situação no INSS, última atualização e ações. Cada campo leva
 *   um rótulo pequeno no lugar do cabeçalho de coluna.
 * - Iniciais no quadrado dourado; selos "Potencial"/"Isento" ao lado do nome
 *   (passar o mouse no "Potencial" abre os dados; no "Isento", explica).
 * - Situação do benefício: pílula + "n/6" + trilho de barras — etapas
 *   cumpridas em verde, a atual em dourado. Clicar abre a mudança de etapa
 *   (`StageChanger`).
 * - Situação no INSS: a esteira do órgão, paralela — pílula na cor da etapa e
 *   trilho de cinco pontos. Clicar abre a mudança (`RequestStageChanger`).
 * - Linhas sem zebra (desenho do `DataList`, o mesmo da Carteira).
 * - Filtro próprio (`ClientsFilterBar`): busca, Tipo em botões segmentados,
 *   benefício, situação e período, e os filtros ativos em chips removíveis.
 */

/**
 * O que a página de Clientes entrega à lista.
 *
 * A página é dona da busca, dos filtros, da paginação, do cache, da exclusão
 * com janela de desfazer e dos modais (ficha, edição, exclusão). A lista
 * recebe a página de clientes pronta e as ações; só decide o desenho.
 *
 * Campos úteis de `ClientListItem` (a API devolve **rótulos** PT-BR):
 * `fullName`, `cpf` (use `cpfOf`), `benefit`,
 * `situation` (etapa da esteira), `requestStage` (etapa no INSS, ou nulo),
 * `beneficiaryNumber`, `notBillable` (isento),
 * `clientType` ("Verificado" | "Potencial" — potencial é lead), `createdAt`,
 * `updatedAt`, `mobilePhone`, `email`, `age`.
 */
export type ClientsListProps = {
  /** A página atual de clientes (10 por página), já com exclusões pendentes aplicadas. */
  clients: ClientListItem[];
  isLoading: boolean;
  /** Mensagem de erro da carga, ou "" sem erro. */
  error: string;
  /** Estado dos filtros — a lista desenha a própria barra (`ClientsFilterBar`). */
  filterState: UseClientFiltersResult;
  /** O campo de período já montado (DateRangePicker em pt-BR). */
  dateRangeField: ReactNode;
  /** Paginação pronta. */
  pagination: ReactNode;
  /** ADMIN/SUPPORT: só eles veem o botão de excluir. */
  canDelete: boolean;
  actions: {
    onCreate: () => void;
    onView: (client: ClientListItem) => void;
    onEdit: (client: ClientListItem) => void;
    /** Pede confirmação (modal) e exclui com janela de desfazer. */
    onDelete: (client: ClientListItem) => void;
    /**
     * Muda a situação (PATCH /clients/{id}). Resolve quando o servidor
     * confirma; rejeita em erro (o toast já sai do interceptor).
     */
    onChangeSituation: (client: ClientListItem, situationKey: SituationKey) => Promise<void>;
    /** Muda a situação no INSS (PATCH `requestStage`). Mesmo contrato de `onChangeSituation`. */
    onChangeRequestStage: (client: ClientListItem, stageKey: RequestStageKey) => Promise<void>;
    /**
     * Abre o financeiro do cliente (benefício e honorários). Só vem para
     * quem pode ver o financeiro (`canSeeFinance`); sem ela, sem ícone.
     */
    onViewFinance?: (client: ClientListItem) => void;
  };
};

/**
 * Colunas no `xl`, as mesmas no cabeçalho e em cada linha. Ações tem largura
 * fixa (cabem os quatro ícones) para não depender do conteúdo.
 *
 * As larguras **têm de caber em 1280px**, que é onde o `xl` começa — o
 * `overflow-clip` do `DataList` corta sem rolar, e o que passa some: já foram
 * os quatro botões de ação, inalcançáveis por mouse, teclado e teste. Com a
 * nona coluna (situação no INSS) a lista é `dense` (respiro de 12px no `xl`):
 * 67,5rem = 1080px de coluna + 8 × 12 de respiro + 48 de recuo = 1224, dentro
 * de 1232. Quem mexer aqui refaz essa conta.
 */
const ROW_GRID =
  "xl:grid-cols-[minmax(9rem,1.2fr)_8.5rem_6rem_minmax(7rem,1fr)_9.5rem_5.5rem_8.5rem_5.5rem_8rem]";

type Actions = ClientsListProps["actions"];

/** Visualizar, financeiro, editar e excluir; financeiro só para quem o vê, excluir só para quem pode. */
function rowActions(actions: Actions, canDelete: boolean): RowAction<ClientListItem>[] {
  return [
    viewAction("Visualizar este cliente", actions.onView),
    ...(actions.onViewFinance
      ? [
          {
            id: "finance",
            label: "Ver financeiro deste cliente",
            icon: <WalletIcon className="h-5 w-5" />,
            tone: "primary" as const,
            onPress: actions.onViewFinance,
          },
        ]
      : []),
    editAction("Editar este cliente", actions.onEdit),
    deleteAction("Excluir este cliente", actions.onDelete, () => canDelete),
  ];
}

function columnsOf(actions: Actions, canDelete: boolean): ListColumn<ClientListItem>[] {
  const row = rowActions(actions, canDelete);
  return [
    { id: "client", header: "Cliente", align: "center", lead: true, cell: (client) => <ClientCell client={client} actions={actions} /> },
    { id: "cpf", header: "CPF", cell: (client) => <CopyableValue label="CPF" value={cpfOf(client) || client.cpf} /> },
    { id: "beneficiary", header: "Nº beneficiário", cell: (client) => display(client.beneficiaryNumber) },
    {
      id: "benefit",
      header: "Benefício pretendido",
      className: "col-span-2 sm:col-span-1",
      cell: (client) => <span className="font-semibold">{display(client.benefit)}</span>,
    },
    {
      id: "situation",
      header: "Situação do benefício",
      align: "center",
      className: "col-span-2 sm:col-span-2 xl:col-span-1",
      cell: (client) => <SituationCell client={client} onChangeSituation={actions.onChangeSituation} />,
    },
    { id: "createdAt", header: "Data do registro", cell: (client) => formatDate(client.createdAt) },
    {
      id: "requestStage",
      header: "Situação no INSS",
      align: "center",
      className: "col-span-2 sm:col-span-2 xl:col-span-1",
      cell: (client) => (
        <RequestStageChanger
          clientId={client.id ? String(client.id) : undefined}
          clientName={client.fullName || "Cliente"}
          requestStage={client.requestStage}
          onConfirm={(stage) => actions.onChangeRequestStage(client, stage.key)}
        />
      ),
    },
    { id: "updatedAt", header: "Última atualização", cell: (client) => updatedOf(client) },
    {
      id: "actions",
      header: "Ações",
      align: "center",
      cell: (client) => <RowActions row={client} actions={row} className="xl:justify-center" />,
    },
  ];
}

export function ClientsList({
  clients,
  isLoading,
  error,
  filterState,
  dateRangeField,
  pagination,
  canDelete,
  actions,
}: ClientsListProps) {
  return (
    <div className="flex flex-col gap-4">
      <ClientsFilterBar state={filterState} dateRangeField={dateRangeField} />

      <DataList
        ariaLabel="Clientes"
        items={error ? [] : clients}
        columns={columnsOf(actions, canDelete)}
        grid={ROW_GRID}
        rowKey={clientKey}
        isLoading={isLoading}
        dense
        empty={
          error ? (
            <ListEmpty tone="danger">Não foi possível carregar os clientes. {error}</ListEmpty>
          ) : (
            <ListEmpty
              action={
                <ActionButton tone="primary" onClick={actions.onCreate}>
                  Novo cliente
                </ActionButton>
              }
            >
              Nenhum cliente encontrado. Ajuste a busca ou os filtros — ou cadastre alguém novo.
            </ListEmpty>
          )
        }
      />

      {pagination}
    </div>
  );
}

/** Quem é: iniciais, nome (abre a ficha) e os selos Potencial/Isento. */
function ClientCell({ client, actions }: { client: ClientListItem; actions: Actions }) {
  const lead = isLead(client);
  const exempt = isExempt(client);
  return (
    <>
      <Sphere name={client.fullName} />
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => actions.onView(client)}
          title={client.fullName}
          className="block max-w-full truncate text-left text-base font-medium text-gray-100 decoration-secondary/60 underline-offset-4 hover:underline"
        >
          {client.fullName || "Sem nome"}
        </button>
        {(lead || exempt) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {/* Passar o mouse no selo: dados do potencial / o que é isento. */}
            {lead && (
              <PotentialClientPopover client={client} onViewDetails={() => actions.onView(client)}>
                <LeadBadge className="cursor-pointer" />
              </PotentialClientPopover>
            )}
            {exempt && (
              <Tooltip delay={0}>
                <Tooltip.Trigger className="inline-flex cursor-help" tabIndex={0}>
                  <ExemptBadge />
                </Tooltip.Trigger>
                <Tooltip.Content showArrow placement="bottom">
                  <Tooltip.Arrow />
                  <p className="text-xs text-gray-100">Isento do serviço: o caso não entra no faturamento.</p>
                </Tooltip.Content>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/** A situação da linha: o trilho abre a mudança de etapa. */
function SituationCell({
  client,
  onChangeSituation,
}: {
  client: ClientListItem;
  onChangeSituation: Actions["onChangeSituation"];
}) {
  // Só etapas reais chegam aqui (o cartão lista `STAGES`); "OUTRA" é o selo
  // de uma situação desconhecida, que não se escolhe.
  const change = async (stage: Stage) => {
    if (stage.key === "OUTRA") return;
    await onChangeSituation(client, stage.key);
  };

  return (
    <StageChanger
      clientId={client.id ? String(client.id) : undefined}
      clientName={client.fullName || "Cliente"}
      situation={client.situation}
      onConfirm={change}
    >
      <StageMeter situation={client.situation} />
    </StageChanger>
  );
}

/**
 * Situação: selo + trilho, numa escala só da marca.
 *
 * Em vez de uma cor por etapa (que não dizia nada sobre o andamento), o
 * trilho conta a história da esteira: o que já foi cumprido fica em verde
 * (concluído, como no cartão de mudar etapa), a etapa atual em dourado — o
 * único destaque — e o que falta em cinza. "Benefício concluído" fecha o
 * trilho inteiro em verde.
 */
function StageMeter({ situation }: { situation?: string }) {
  const stage = stageOf(situation);
  const done = stage.step === STAGES.length;
  const unknown = stage.step === 0;
  return (
    <div>
      <span
        title={stage.label}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium whitespace-nowrap ${
          done
            ? "bg-success/15 text-success-strong"
            : unknown
              ? "bg-page text-gray-100"
              : "bg-white text-primary ring-1 ring-black/10"
        }`}
      >
        {done ? (
          <span aria-hidden="true">✓</span>
        ) : (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${unknown ? "bg-gray-100/50" : "bg-secondary"}`} />
        )}
        <span className="truncate">{stage.label}</span>
      </span>
      <div
        role="img"
        aria-label={`Etapa ${stage.step} de ${STAGES.length}: ${stage.label}`}
        className="mt-2 flex gap-1"
      >
        {STAGES.map((s) => (
          <span
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
              done || s.step < stage.step
                ? "bg-success"
                : s.step === stage.step
                    ? "bg-secondary"
                    : "bg-light-gray/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Iniciais no quadrado arredondado do ícone da lista da Carteira: dourado da
 * marca com iniciais brancas, igual para todo cliente — quem é potencial já diz o selo ao lado do nome.
 */
function Sphere({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-xs font-semibold tracking-wide text-white select-none"
    >
      {initials(name)}
    </span>
  );
}
