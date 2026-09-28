"use client";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { toSelectOptions } from "@/components/ui/form/options";
import {
  ClientTypeOptions,
  getClientTypeKeyByLabel,
} from "@/enums/clientType/ClientType";
import DetailsClientModal from "@/components/ui/modals/DetailsClientModal/DetailsClientModal";
import DeleteClientModal from "@/components/ui/modals/DeleteClientModal/DeleteClientModal";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { SituationOptions } from "@/enums/situation/Situation";
import type { Clients } from "@/interfaces/Clients.interface";
import type { ClientListRequest } from "@/interfaces/client/Client.interface";
import {
  clients as fetchClients,
  deleteClient,
} from "@/services/clientService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import {
  getCachedClients,
  setCachedClients,
  clearClientsCache,
} from "@/lib/clientsCache";
import {
  Button,
  DateField,
  DateRangePicker,
  I18nProvider,
  InfoIcon,
  Input,
  Pagination,
  RangeCalendar,
  Skeleton,
  Table,
  Tooltip,
} from "@heroui/react";
import { SituationChips } from "@/components/SituationChips";
import ActionButton from "@/components/ui/table/ActionButton";
import { MultiSelectField } from "@/components/ui/form/Field";
import CopyableValue from "@/components/ui/table/CopyableValue";
import { PlusIcon } from "@/components/ui/icons/actions";
import { DollarCircleIcon } from "@/components/ui/icons/StatusIcons";
import { PotentialClientPopover } from "@/components/clients/PotentialClientPopover";
import svgPaths from "@/constants/svg/paths";
import Image from "next/image";
import {
  ELLIPSIS,
  buildPageList,
  buildSkeletonRows,
  clampPage,
  pageRange,
} from "@/lib/pagination";
import { maskCPF } from "@/lib/masks/masks";
import { usePendingAction } from "@/hooks/usePendingAction";
import { usePermissoes } from "@/hooks/usePermissoes";
import { applyPendingOverlay, applyPendingTotal } from "@/lib/pendingActions";
import { useClientFilters } from "./useClientFilters";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Linhas fantasma do estado de carregamento.
 *
 * `Table.Body` do v3 é uma coleção: espera `items` + render prop, não JSX solto.
 * Cada item só precisa de `id` — o conteúdo vem do `Table.Collection` sobre as
 * colunas, então o skeleton se ajusta sozinho se uma coluna for adicionada.
 */
const SKELETON_ROWS = buildSkeletonRows(10);

/**
 * Classe base das células do corpo.
 *
 * `text-gray-100` precisa ser explícito: o `.table__cell` da lib aplica
 * `text-foreground` (o azul da marca), que vence a cor herdada da raiz da
 * tabela. O cabeçalho tem a própria cor e não usa esta constante.
 */
const BODY_CELL = "text-center text-sm text-gray-100";

export default function Clients() {
  const router = useRouter();
  /**
   * Colunas no formato que o `Table.Header` do v3 espera: `{ id, name }`.
   * Passadas via prop `columns`, o React Aria monta a coleção e extrai o `id`
   * de cada item — não é preciso repetir `key`/`id` no `Table.Column`.
   */
  const tableColumns = [
    { id: "fullName", name: "Nome completo" },
    { id: "cpf", name: "CPF" },
    // { id: "nitPis", name: "NIT/PIS" },
    { id: "beneficiaryName", name: "Nº beneficiário" },
    { id: "requestedBenefit", name: "Benefício pretendido" },
    { id: "registrationDate", name: "Data do registro" },
    { id: "updatedAt", name: "Última atualização" },
    { id: "status", name: "Situação" },
    { id: "actions", name: "Ações" },
  ];

  // Excluir é de advogado/admin: o atendente não vê o botão.
  const { podeDestruir } = usePermissoes();
  const [clients, setClients] = useState<Clients[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pagination, setPagination] = useState<{
    pageNumber: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>({
    pageNumber: 1,
    pageSize: 10,
    totalRecords: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  /** Janela de desfazer das exclusões — ver `handleDeleteClient`. */
  const { pending, schedule } = usePendingAction();

  /**
   * Filtros. Qualquer mudança volta para a primeira página — senão a pessoa
   * filtra estando na página 7 e recebe uma lista vazia.
   */
  const filters = useClientFilters(() =>
    setPagination((s) => ({ ...s, pageNumber: 1 })),
  );

  /**
   * Aplica o envelope (itens + paginação) ao estado, vindo do cache ou da rede.
   */
  const applyEnvelope = (envelope: ApiEnvelope<Clients[]>) => {
    const items = envelope?.data ?? [];
    setClients(items);

    const p = envelope.pagination ?? null;
    if (p) {
      setPagination((prev) => ({
        pageNumber:
          typeof p.pageNumber === "number" ? p.pageNumber : prev.pageNumber,
        pageSize:
          typeof p.pageSize === "number" ? p.pageSize : prev.pageSize,
        totalRecords:
          typeof p.totalRecords === "number"
            ? p.totalRecords
            : prev.totalRecords,
        totalPages:
          typeof p.totalPages === "number" ? p.totalPages : prev.totalPages,
        hasNextPage: !!p.hasNextPage,
        hasPreviousPage: !!p.hasPreviousPage,
      }));
    }
  };

  /**
   * Busca a página atual sempre que filtros ou paginação mudam.
   *
   * `filters.params` já vem pronto do hook — a página não sabe traduzir
   * filtro em query string, e o hook não sabe buscar. `params` é memoizado
   * lá, então este efeito não dispara em render que não mudou filtro.
   */
  useEffect(() => {
    setError("");

    const params: ClientListRequest = {
      ...filters.params,
      pageNumber: pagination.pageNumber,
      pageSize: pagination.pageSize,
    };

    // Cache por combinação de filtros/página: paginação e busca repetidas
    // (mesmos parâmetros) reaproveitam o resultado já visto nesta sessão, sem
    // reconsultar a API nem piscar o skeleton. Só é invalidado no logout ou
    // quando um cliente é criado/editado/excluído.
    const cacheKey = JSON.stringify(params);
    const cached = getCachedClients(cacheKey);
    if (cached) {
      applyEnvelope(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchClients(params)
      .then((envelope) => {
        setCachedClients(cacheKey, envelope);
        applyEnvelope(envelope);
      })
      .catch((err) => setError(String(err?.message ?? err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    refreshTrigger,
    pagination.pageNumber,
    pagination.pageSize,
    filters.params,
  ]);

  /**
   * Exclusão com janela de desfazer — mesmo mecanismo da agenda.
   *
   * A ordem se inverte de propósito: a linha some da tela na hora e o DELETE
   * só é enviado quando a janela expira. Desfazer é apenas cancelar um
   * `setTimeout`, sem chamar a API.
   *
   * Aqui isso não é preferência, é necessidade: o backend faz **hard delete**
   * (`repository.deleteById` no `ClientServiceImpl`), sem soft delete nem rota
   * de restauração. Um "Desfazer" que chamasse a API depois do fato só teria
   * como falhar — e o cascade já teria levado endereços, entrevistas,
   * pagamentos, arquivos e histórico junto.
   */
  const handleDeleteClient = (clientId: string | number | null) => {
    if (!clientId) return;
    const id = String(clientId);

    schedule({
      key: id,
      kind: "delete",
      message: "Cliente excluído.",
      commit: () => deleteClient(id, { silent: true }),
      onSettled: () => {
        clearClientsCache();
        setRefreshTrigger((prev) => prev + 1);
      },
    });
  };

  // situation options are provided by `SituationOptions`
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [clientToDelete, setClientDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);


  // helpers: show '-' for null/undefined/empty and format dates
  const display = (value: unknown) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string" && value.trim() === "") return "-";
    return String(value);
  };

  const formatDate = (value: unknown) => {
    if (!value) return "-";
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  };

  /** "-" quando nunca foi atualizado depois do registro (mesmo valor ou ausente). */
  const lastUpdated = (item: Clients) =>
    item.updatedAt && item.updatedAt !== item.createdAt
      ? formatDate(item.updatedAt)
      : "-";

  // server-side pagination: clients contains current page items
  /**
   * Sobreposição das exclusões agendadas: a linha já sai da lista e do total
   * antes da requisição existir. Sem isso o cliente "excluído" continuaria
   * visível durante toda a janela de desfazer, porque `clients` ainda é o que
   * o backend devolveu.
   *
   * `PENDING_STATUS_LABELS` é exigido pela assinatura, mas só é usado por
   * `complete`/`cancel` — que não existem aqui.
   */
  const total = applyPendingTotal(pagination.totalRecords, clients, pending);
  const totalPages = pagination.totalPages;
  const paginated = applyPendingOverlay(clients, pending, {
    complete: "",
    cancel: "",
  });

  // Intervalo exibido no rodapé ("11 a 20 de 47 clientes").
  const { start: rangeStart, end: rangeEnd } = pageRange(
    pagination.pageNumber,
    pagination.pageSize,
    total,
  );

  /** Abre a ficha do cliente em modal — leitura ou edição. */
  const openClientDetails = (item: Clients, edit: boolean) => {
    // Sem id não há ficha para abrir.
    //
    // `String(item.id)` com `id` ausente produz a string "undefined", que é
    // verdadeira, atravessa todos os `if (!id)` do caminho e chega à API como
    // `GET /clients/undefined`. O erro aparece no backend, sobre um parâmetro
    // inválido, e manda investigar o lugar errado. Aqui a origem é visível.
    if (!item?.id) {
      console.error(
        "Cliente sem id na listagem — ficha não aberta. Item recebido:",
        item,
      );
      setError(
        "Não foi possível abrir a ficha: este registro veio sem identificador. Atualize a página.",
      );
      return;
    }
    setDetailsTarget({ id: String(item.id), name: item.fullName, edit });
  };

  /**
   * Cliente cuja ficha está aberta. Um objeto só, e não um par
   * `id` + `isEditing`: "aberto em edição sem cliente" não é um estado que
   * exista, e dois campos separados o deixam representável.
   */
  const [detailsTarget, setDetailsTarget] = useState<{
    id: string;
    name: string;
    edit: boolean;
  } | null>(null);

  const goToPage = (n: number) =>
    setPagination((s) => ({ ...s, pageNumber: clampPage(n, s.totalPages) }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Clientes"
        description="Beneficiários do escritório, com situação e benefício em análise."
        actions={
          /*
            A ação saiu de dentro da barra de filtros, onde competia com
            "Limpar filtro" no meio dos campos. Aqui é a única ação do
            cabeçalho, que é onde se procura por ela.

            O ícone era um <Image> 100×100 sem classe de tamanho — renderizava
            como um círculo gigante dentro do botão.
          */
          <Button
            variant="outline"
            className="flex items-center gap-2 on-primary-button"
            onPress={() => router.push("/clientes/novo")}
          >
            <PlusIcon />
            Novo cliente
          </Button>
        }
      />

      <div>
      {/* Header de filtros */}
      <div className="w-full bg-primary rounded-t-lg p-4 flex gap-3">
        {/* v3: `Input` é primitivo (size/radius/classNames saíram → Tailwind). */}
        <Input
          placeholder="Pesquisar beneficiário..."
          value={filters.search}
          onChange={(e) => filters.setSearch(e.target.value)}
          className="h-11 min-w-[220px] bg-white"
        />

        {/*
          `MultiSelectField` (Select com `selectionMode="multiple"`) no lugar do
          contorno com `Popover` + `ListBox`. Eu tinha concluído que o `Select`
          do v3 era single-only — era engano: ele aceita modo múltiplo, e o
          contorno perdia trigger, indicador e resumo prontos.

          O texto do gatilho também estava com bug: `({benefitType.length})`
          dentro de template string, sem o `$`, aparecia literal na tela.
        */}
        <MultiSelectField
          label="Benefício pretendido"
          placeholder="Benefício pretendido"
          hideLabel
          className="h-11 min-w-[200px] [&_button]:h-11 [&_button]:bg-white"
          options={BenefitOptions.map((o) => ({
            id: o.value,
            label: o.label,
          }))}
          selectedKeys={filters.benefitType}
          onSelectionChange={filters.setBenefitType}
        />

        <MultiSelectField
          label="Situação"
          placeholder="Situação"
          hideLabel
          className="h-11 min-w-[160px] [&_button]:h-11 [&_button]:bg-white"
          options={SituationOptions.map((o) => ({
            id: o.value,
            label: o.label,
          }))}
          selectedKeys={filters.situation}
          onSelectionChange={filters.setSituation}
        />

        {/* Verificado / Potencial — separa quem é cliente de quem ainda é lead. */}
        <MultiSelectField
          label="Tipo"
          placeholder="Tipo"
          hideLabel
          className="h-11 min-w-[140px] [&_button]:h-11 [&_button]:bg-white"
          options={toSelectOptions(ClientTypeOptions)}
          selectedKeys={filters.clientType}
          onSelectionChange={filters.setClientType}
        />
        {/*
          Período — composição completa do `DateRangePicker` (antes era só a
          tag raiz, sem os segmentos nem o calendário, então o campo aparecia
          vazio).

          `I18nProvider locale="pt-BR"` troca o idioma só dentro dele: nomes de
          mês e dia, ordem dia/mês/ano e primeiro dia da semana. Sem isso o
          React Aria cai no locale do browser, que costuma ser en-US.
        */}
        {/*
          `relative` + mensagem `absolute`: o erro de intervalo invertido
          precisa aparecer em algum lugar — `isInvalid` sozinho só pinta a
          borda, sem dizer por quê. `absolute` para não empurrar os outros
          filtros da linha quando o texto aparece.
        */}
        <div className="relative min-w-[240px]">
        <I18nProvider locale="pt-BR">
          <DateRangePicker
            aria-label="Período"
            value={filters.dateRange}
            onChange={filters.setDateRange}
            isInvalid={!!filters.dateError}
            className="min-w-[240px]"
          >
            <DateField.Group className="form-border-style h-11 bg-white">
              <DateField.Input slot="start">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateRangePicker.RangeSeparator />
              <DateField.Input slot="end">
                {(segment) => <DateField.Segment segment={segment} />}
              </DateField.Input>
              <DateField.Suffix>
                <DateRangePicker.Trigger>
                  <DateRangePicker.TriggerIndicator />
                </DateRangePicker.Trigger>
              </DateField.Suffix>
            </DateField.Group>

            <DateRangePicker.Popover>
              <RangeCalendar className="text-gray-100">
                <RangeCalendar.Header>
                  <RangeCalendar.NavButton slot="previous" />
                  <RangeCalendar.Heading />
                  <RangeCalendar.NavButton slot="next" />
                </RangeCalendar.Header>
                <RangeCalendar.Grid>
                  <RangeCalendar.GridHeader>
                    {(day) => (
                      <RangeCalendar.HeaderCell className="text-secondary">
                        {day}
                      </RangeCalendar.HeaderCell>
                    )}
                  </RangeCalendar.GridHeader>
                  <RangeCalendar.GridBody>
                    {(date) => <RangeCalendar.Cell date={date} />}
                  </RangeCalendar.GridBody>
                </RangeCalendar.Grid>
              </RangeCalendar>
            </DateRangePicker.Popover>
          </DateRangePicker>
        </I18nProvider>
        {filters.dateError && (
          <p className="absolute top-full left-0 mt-1 text-xs whitespace-nowrap text-danger">
            {filters.dateError}
          </p>
        )}
        </div>
        {/*
          `ml-auto` empurra a ação para a direita, separando-a dos filtros —
          antes tudo era um bloco só e "Limpar filtro" parecia mais um filtro.

          `ghost` porque é ação secundária e reversível. Agora é a única coisa
          além dos campos nesta barra: "Novo cliente" subiu para o cabeçalho,
          onde é a ação principal da tela sem competir com nada.
        */}
        <Button
          variant="ghost"
          className="ml-auto h-11 px-6 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
          onPress={filters.clear}
          isDisabled={!filters.hasActiveFilters}
        >
          Limpar filtro
        </Button>
      </div>

      {/* Tabela */}
      {/* v3: shadow/radius/color/isStriped saíram — estilo via Tailwind. */}
      {/* `rounded-t-none` deixa o topo reto: o arredondamento vinha do
          `.table-root--primary`, que combina border-radius com overflow-clip. */}
      {/*
        `variant="secondary"`: mesmo tratamento da tabela da agenda — sem o
        cartão cinza que o variant primary desenha em volta.

        A superfície branca fica no `ScrollContainer`, não aqui na raiz: o
        `Table.Footer` (onde mora a paginação) é irmão dele, então com o fundo
        na raiz a paginação herdava o branco. No CSS da lib o footer é descrito
        como "div fora da <table>, sobre o fundo cinza" — é para ficar solto
        mesmo.
      */}
      <Table variant="secondary" className="text-gray-100">
        {/* Table (Root) é só um wrapper; Table.Content é a coleção do React Aria.
            Sem ele, Table.Column/Table.Row renderizam "outside a collection".
            ScrollContainer dá rolagem horizontal — são 9 colunas. */}
        {/* Superfície branca da tabela: topo reto (encosta na barra de filtros)
            e base arredondada. */}
        <Table.ScrollContainer className="rounded-t-none rounded-b-2xl bg-white">
        <Table.Content aria-label="Tabela de clientes" className="min-w-[1100px]">
        {/* As utilities do Tailwind ficam na layer `utilities` e o CSS do HeroUI
            na layer `components`, então estas classes vencem o `.table__column`
            sem precisar de `!important`.
            `after:content-none` remove a barra divisória vertical, que é um
            `::after` do próprio `.table__column`. */}
        <Table.Header columns={tableColumns}>
          {(column) => (
            <Table.Column
              /*
                `h-12` como na agenda.

                `bg-white` e `rounded-none` desfazem duas regras do
                `variant="secondary"`: ele pinta as colunas com
                `bg-surface-secondary` (a faixa cinza do cabeçalho) e arredonda
                a primeira e a última via `border-start-start-radius`. As
                utilities do Tailwind vencem porque ficam numa layer posterior
                à do CSS da lib.

                O divisor vai nas COLUNAS, não no `Table.Header`: o
                `variant="secondary"` zera a borda do header
                (`.table__header { border-b-0 }`), então uma borda ali não
                apareceria. Somadas, as bordas das células formam a linha
                contínua sob o cabeçalho.

                `uppercase` + `text-xs` + `tracking-wide`: caixa alta em corpo
                normal fica apertada, e sem espaçamento entre letras perde
                legibilidade.
              */
              className={`h-12 rounded-none border-b border-secondary/30 bg-white text-center text-xs tracking-wide text-secondary uppercase after:content-none ${
                column.id === "cpf" ? "min-w-47.5 whitespace-nowrap" : ""
              }`}
              isRowHeader={column.id === "fullName"}
            >
              {column.name}
            </Table.Column>
          )}
        </Table.Header>
        {loading ? (
          /* Skeleton: as células saem do Table.Collection sobre as colunas. */
          <Table.Body items={SKELETON_ROWS}>
            {() => (
              <Table.Row>
                <Table.Collection items={tableColumns}>
                  {(column) => (
                    <Table.Cell className={BODY_CELL}>
                      {column.id === "actions" ? (
                        <div className="flex justify-center gap-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="rounded-full">
                              <div className="h-8 w-8 rounded-full bg-default-300" />
                            </Skeleton>
                          ))}
                        </div>
                      ) : (
                        <Skeleton className="rounded-lg">
                          <div className="mx-auto h-6 w-24 rounded-lg bg-default-300" />
                        </Skeleton>
                      )}
                    </Table.Cell>
                  )}
                </Table.Collection>
              </Table.Row>
            )}
          </Table.Body>
        ) : (
          <Table.Body
            /* Em erro esvaziamos a coleção para cair no renderEmptyState. */
            items={error ? [] : paginated}
            renderEmptyState={() => (
              <div
                className={`py-8 text-center text-lg ${
                  error ? "text-red-500" : "text-gray-500"
                }`}
              >
                {error || "Nenhum cliente encontrado."}
              </div>
            )}
          >
            {(item) => {
              const isIsento = Boolean(item.beneficiaryNumber);
              // `clientType` chega como label da API (@JsonValue); aceita já
              // vir chave também — mesma tolerância de `fromResponse.ts`.
              const clientTypeKey =
                item.clientType &&
                (getClientTypeKeyByLabel(item.clientType) ?? item.clientType);
              const isPotencial = clientTypeKey === "POTENCIAL";
              return (
              <Table.Row
                className={`text-gray-100 ${isIsento ? "border-2 border-solid border-green-200" : ""}`}
              >
                <Table.Cell className={BODY_CELL + " max-w-48"}>
                  <span className="inline-flex items-center gap-1.5">
                    {display(item.fullName)}
                    {isPotencial ? (
                      <PotentialClientPopover
                        client={item}
                        onViewDetails={() => openClientDetails(item, false)}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-100/60 hover:text-secondary">
                          <InfoIcon className="h-4 w-4 text-orange-400" />
                        </span>
                      </PotentialClientPopover>
                    ) : null}
                    {isIsento ? (
                      <Tooltip delay={0}>
                        <Tooltip.Content showArrow placement="bottom">
                          <Tooltip.Arrow />
                          <p>Cliente isento do serviço</p>
                        </Tooltip.Content>
                        <Button
                          isIconOnly
                          variant="ghost"
                          aria-label="Cliente isento do serviço"
                          className="h-5 w-5 min-w-5 shrink-0 text-gray-100/60 hover:text-secondary"
                        >
                          <DollarCircleIcon className="h-4 w-4 text-green-600" />
                        </Button>
                      </Tooltip>
                    ) : null}
                  </span>
                </Table.Cell>
                <Table.Cell className={BODY_CELL + " min-w-47.5 whitespace-nowrap"}>
                  <CopyableValue
                    label="CPF"
                    value={item.cpf ? maskCPF(item.cpf) : item.cpf}
                  />
                </Table.Cell>
                <Table.Cell className={BODY_CELL}>
                  {display(item.beneficiaryNumber)}
                </Table.Cell>
                <Table.Cell className={BODY_CELL + " max-w-52 font-semibold"}>
                  {display(item.benefit)}
                </Table.Cell>
                <Table.Cell className={BODY_CELL}>
                  {formatDate(item.createdAt)}
                </Table.Cell>
                <Table.Cell className={BODY_CELL}>
                  {lastUpdated(item)}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-center">
                    <SituationChips situations={[item.situation]} />
                  </div>
                </Table.Cell>
                {/*
                  O `flex` fica no <span> interno, NUNCA no `Table.Cell`:
                  `display:flex` num <td> o tira do algoritmo de tabela, e a
                  célula deixa de se alinhar às demais — era isso que deslocava
                  a coluna "Ações" e criava a faixa clara à direita.
                */}
                <Table.Cell className="text-center text-sm">
                  <span className="flex items-center justify-center gap-0.5">
                    {/* Ícones originais de `public/svg/icons`. Ficam dentro do
                        `ActionButton` para herdarem tooltip, área de clique e
                        fundo de hover por intenção — só a cor do traço vem do
                        próprio arquivo, já que um <img> não lê `currentColor`. */}
                    <ActionButton
                      label="Visualizar este cliente"
                      tone="neutral"
                      onClick={() => openClientDetails(item, false)}
                    >
                      <Image
                        src={svgPaths.ICONS.DETAILS}
                        alt=""
                        height={20}
                        width={20}
                        className="h-5 w-5"
                      />
                    </ActionButton>

                    <ActionButton
                      label="Editar este cliente"
                      tone="secondary"
                      onClick={() => openClientDetails(item, true)}
                    >
                      <Image
                        src={svgPaths.ICONS.EDIT}
                        alt=""
                        height={20}
                        width={20}
                        className="h-5 w-5"
                      />
                    </ActionButton>

                    {/*
                      Excluir é de advogado/admin. O backend recusa o atendente
                      com 403; esconder aqui é para ele não esbarrar num botão
                      que existe só para dizer não.
                    */}
                    {podeDestruir && (
                      <ActionButton
                        label="Excluir este cliente"
                        tone="danger"
                        onClick={() => {
                          setClientDelete({
                            id: String(item.id),
                            name: item.fullName,
                          });
                          setModalDeleteOpen(true);
                        }}
                      >
                        <Image
                          src={svgPaths.ICONS.TRASH}
                          alt=""
                          height={20}
                          width={20}
                          className="h-5 w-5"
                        />
                      </ActionButton>
                    )}
                  </span>
                </Table.Cell>
              </Table.Row>
              );
            }}
          </Table.Body>
        )}
        </Table.Content>
        </Table.ScrollContainer>

        {/* Rodapé da própria tabela (v3) — fora da superfície branca, sobre o
            fundo da página. `px-0` para alinhar com as bordas da tabela. */}
        <Table.Footer className="mt-3 bg-transparent px-0">
          {loading ? (
            <div className="flex w-full items-center justify-between">
              <Skeleton className="rounded-lg">
                <div className="h-6 w-40 rounded-lg bg-default-300" />
              </Skeleton>
              <Skeleton className="rounded-lg">
                <div className="h-8 w-48 rounded-lg bg-default-300" />
              </Skeleton>
            </div>
          ) : (
            <Pagination size="sm" className="text-gray-100">
              <Pagination.Summary className="text-sm text-gray-100">
                {total === 0
                  ? "Nenhum cliente"
                  : `${rangeStart} a ${rangeEnd} de ${total} cliente${total === 1 ? "" : "s"}`}
              </Pagination.Summary>

              <Pagination.Content>
                <Pagination.Item>
                  {/* `hasPreviousPage`/`hasNextPage` vêm do envelope do backend
                      e já estavam no estado — antes não eram usados. */}
                  <Pagination.Previous
                    className="text-sm text-gray-100"
                    isDisabled={!pagination.hasPreviousPage}
                    onPress={() => goToPage(pagination.pageNumber - 1)}
                  >
                    <Pagination.PreviousIcon />
                    Anterior
                  </Pagination.Previous>
                </Pagination.Item>

                {buildPageList(pagination.pageNumber, totalPages).map(
                  (entry, i) =>
                    entry === ELLIPSIS ? (
                      <Pagination.Item key={`gap-${i}`}>
                        <Pagination.Ellipsis className="text-sm text-gray-100" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={entry}>
                        <Pagination.Link
                          isActive={entry === pagination.pageNumber}
                          onPress={() => goToPage(entry)}
                          className={`text-sm ${
                            entry === pagination.pageNumber
                              ? "bg-gray-100 text-white"
                              : "text-gray-100"
                          }`}
                        >
                          {entry}
                        </Pagination.Link>
                      </Pagination.Item>
                    ),
                )}

                <Pagination.Item>
                  <Pagination.Next
                    className="text-sm text-gray-100"
                    isDisabled={!pagination.hasNextPage}
                    onPress={() => goToPage(pagination.pageNumber + 1)}
                  >
                    Próxima
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          )}
        </Table.Footer>
      </Table>

      <DeleteClientModal
        isOpen={modalDeleteOpen}
        onClose={() => {
          setModalDeleteOpen(false);
          setClientDelete(null);
        }}
        clientName={clientToDelete?.name || ""}
        onConfirm={() => handleDeleteClient(clientToDelete?.id || null)}
      />

      <DetailsClientModal
        isOpen={detailsTarget !== null}
        clientId={detailsTarget?.id}
        clientName={detailsTarget?.name ?? ""}
        editOnOpen={detailsTarget?.edit ?? false}
        onClose={() => setDetailsTarget(null)}
        onConfirm={() => {
          clearClientsCache();
          setRefreshTrigger((prev) => prev + 1);
        }}
      />

    </div>
    </div>
  );
}
