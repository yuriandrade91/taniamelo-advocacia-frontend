"use client";

import { Tooltip } from "@heroui/react";
import { PotentialClientPopover } from "@/components/clients/PotentialClientPopover";
import { DataList, type ListColumn } from "@/components/ui/list/DataList";
import {
  RowActions,
  deleteAction,
  editAction,
  viewAction,
  type RowAction,
} from "@/components/ui/table/RowActions";
import CopyableValue from "@/components/ui/table/CopyableValue";
import { WalletIcon } from "@/components/ui/icons/glyphs";
import type { Clients } from "@/interfaces/Clients.interface";
import {
  EmptyState,
  ErrorState,
  ExemptBadge,
  LeadBadge,
  STAGES,
  clientKey,
  cpfOf,
  display,
  formatDate,
  initials,
  isExempt,
  isLead,
  stageOf,
  updatedOf,
  type Stage,
} from "./kit";
import type { ClientsModelProps } from "./shared";
import { StageChanger } from "./StageChanger";
import { CurrentFilters } from "./ClientsFilters";

/**
 * A lista de Clientes ("Compilado", a mescla escolhida no estudo visual).
 *
 * - Linha em duas camadas com todos os campos: nome, CPF (copiável), nº de
 *   beneficiário, benefício pretendido, data do registro, última
 *   atualização, situação e ações. Cada campo leva um rótulo pequeno no
 *   lugar do cabeçalho de coluna.
 * - Iniciais no quadrado dourado; selos "Potencial"/"Isento" ao lado do nome
 *   (passar o mouse no "Potencial" abre os dados; no "Isento", explica).
 * - Situação: pílula + "n/6" + trilho de barras — etapas cumpridas em verde,
 *   a atual em dourado. Clicar abre a mudança de etapa (`StageChanger`).
 * - Linhas sem zebra (desenho do `DataList`, o mesmo da Carteira).
 * - Filtro próprio (`CurrentFilters`): busca, Tipo em botões segmentados,
 *   benefício, situação e período, e os filtros ativos em chips removíveis.
 */


/**
 * Colunas no `xl`, as mesmas no cabeçalho e em cada linha. Ações tem largura
 * fixa (cabem os quatro ícones) para não depender do conteúdo.
 *
 * As larguras **têm de caber em 1280px**, que é onde o `xl` começa. Antes
 * somavam 76rem; com o respiro entre colunas (7 × 20px) e o recuo da linha
 * (48px), a linha pedia 1404px dentro de 1232 — e o `overflow-clip` do
 * `DataList` corta sem rolar, então os quatro botões de ação ficavam fora da
 * tela, inalcançáveis por mouse, por teclado e por teste. Agora somam 65rem:
 * 1040px de coluna + 140 de respiro + 48 de recuo = 1228, com folga de 4px.
 * Quem mexer aqui refaz essa conta.
 */
const ROW_GRID =
  "xl:grid-cols-[minmax(10.5rem,1.3fr)_8.5rem_6.5rem_minmax(8rem,1fr)_6.5rem_6.5rem_10.5rem_8rem]";

type Actions = ClientsModelProps["actions"];

/** Visualizar, financeiro, editar e excluir; financeiro só para quem o vê, excluir só para quem pode. */
function rowActions(actions: Actions, canDelete: boolean): RowAction<Clients>[] {
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

function columnsOf(actions: Actions, canDelete: boolean): ListColumn<Clients>[] {
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
    { id: "createdAt", header: "Data do registro", cell: (client) => formatDate(client.createdAt) },
    { id: "updatedAt", header: "Última atualização", cell: (client) => updatedOf(client) },
    {
      id: "situation",
      header: "Situação",
      align: "center",
      className: "col-span-2 sm:col-span-2 xl:col-span-1",
      cell: (client) => <SituationCell client={client} onChangeSituation={actions.onChangeSituation} />,
    },
    {
      id: "actions",
      header: "Ações",
      align: "center",
      cell: (client) => <RowActions row={client} actions={row} className="xl:justify-center" />,
    },
  ];
}

export function CompiledModel({
  clients,
  isLoading,
  error,
  filterState,
  dateRangeField,
  pagination,
  canDelete,
  actions,
}: ClientsModelProps) {
  return (
    <div className="flex flex-col gap-4">
      <CurrentFilters state={filterState} dateRangeField={dateRangeField} />

      <DataList
        ariaLabel="Clientes"
        items={error ? [] : clients}
        columns={columnsOf(actions, canDelete)}
        grid={ROW_GRID}
        rowKey={clientKey}
        isLoading={isLoading}
        empty={error ? <ErrorState message={error} /> : <EmptyState onCreate={actions.onCreate} />}
      />

      {pagination}
    </div>
  );
}

/** Quem é: iniciais, nome (abre a ficha) e os selos Potencial/Isento. */
function ClientCell({ client, actions }: { client: Clients; actions: Actions }) {
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
  client: Clients;
  onChangeSituation: ClientsModelProps["actions"]["onChangeSituation"];
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
 * Situação: selo + "n/6" + trilho, numa escala só da marca.
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
      <div className="flex items-center justify-between gap-2">
        <span
          title={stage.label}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium whitespace-nowrap ${
            done
              ? "bg-success/15 text-[#238C26]"
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
        <span className="text-[11px] text-gray-100/60 tabular-nums">
          {stage.step || "–"}/{STAGES.length}
        </span>
      </div>
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
