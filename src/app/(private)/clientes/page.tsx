"use client";
import AddNewClientModal from "@/components/ui/modals/AddNewClientModal/AddNewClientModal";

import DeleteClientModal from "@/components/ui/modals/DeleteClientModal/DeleteClientModal";
import DetailsClientModal from "@/components/ui/modals/DetailsClientModal/DetailsClientModal";
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
  DateRangePicker,
  Input,
  ListBox,
  Pagination,
  Popover,
  Skeleton,
  Table,
  Tooltip,
} from "@heroui/react";
import { SituationChips } from "@/components/SituationChips";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DateValue = any;
type RangeValue<T> = { start: T; end: T } | null;

/**
 * Normaliza o retorno de `onSelectionChange` do React Aria.
 * Em seleção múltipla vem um `Set<Key>` (ou a string "all").
 */
const selectionToArray = (keys: unknown): string[] => {
  if (keys === "all") return [];
  if (keys instanceof Set) return Array.from(keys).map(String);
  if (keys === null || keys === undefined) return [];
  return [String(keys)];
};

/**
 * Janela de páginas com reticências: `1 … 4 5 [6] 7 … 20`.
 *
 * A paginação é server-side, então `totalPages` pode ser grande. Renderizar um
 * botão por página (como no exemplo da doc do HeroUI, que pagina em memória)
 * estouraria a largura do rodapé. Mantemos primeira, última e a vizinhança da
 * página atual; o resto vira `Pagination.Ellipsis`.
 */
const ELLIPSIS = "…" as const;

function buildPageList(current: number, total: number): (number | typeof ELLIPSIS)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const window = [1, total, current, current - 1, current + 1]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const unique = Array.from(new Set(window));

  return unique.flatMap((page, i) =>
    i > 0 && page - unique[i - 1] > 1 ? [ELLIPSIS, page] : [page],
  );
}

/**
 * Linhas fantasma do estado de carregamento.
 *
 * `Table.Body` do v3 é uma coleção: espera `items` + render prop, não JSX solto.
 * Cada item só precisa de `id` — o conteúdo vem do `Table.Collection` sobre as
 * colunas, então o skeleton se ajusta sozinho se uma coluna for adicionada.
 */
const SKELETON_ROWS = Array.from({ length: 10 }, (_, i) => ({
  id: `skeleton-${i}`,
}));

/** Ícone de copiar — a lib só expõe 15 ícones e nenhum deles é de cópia. */
function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

/**
 * Valor + botão de copiar, com Popover de confirmação abaixo (placement="bottom").
 *
 * O Popover é controlado: abre ao copiar e fecha sozinho depois de 1,5s. O
 * timer fica em ref para ser cancelado se a linha desmontar (troca de página)
 * antes de expirar — senão o setState cairia num componente já desmontado.
 */
function CopyableValue({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!value || value.trim() === "") return <>-</>;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard exige contexto seguro (https ou localhost)
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {value}
      <Popover isOpen={copied} onOpenChange={setCopied}>
        <Button
          isIconOnly
          variant="ghost"
          aria-label={`Copiar ${label} ${value}`}
          onPress={handleCopy}
          className="h-6 w-6 min-w-6 text-gray-100/60 hover:text-secondary"
        >
          <CopyIcon className="h-4 w-4" />
        </Button>
        <Popover.Content placement="bottom">
          <span className="px-1 text-[0.875rem]">{label} copiado</span>
        </Popover.Content>
      </Popover>
    </span>
  );
}

/** Botão de ação da linha (ver / editar / excluir) — mesma estrutura nos três. */
function RowAction({
  alt,
  icon,
  label,
  onPress,
}: {
  alt: string;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Tooltip>
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
      <Button isIconOnly variant="ghost" onPress={onPress}>
        <Image src={icon} alt={alt} height={25} width={25} />
      </Button>
    </Tooltip>
  );
}

export default function Clients() {
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
    { id: "updatedDate", name: "Última atualização" },
    { id: "status", name: "Situação" },
    { id: "actions", name: "Ações" },
  ];

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

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [benefitType, setBenefitType] = useState<string[]>([]);
  const [situation, setSituation] = useState<string[]>([]);

  // Date range state for DateRangePicker
  const [data, setData] = useState<RangeValue<DateValue>>(null);
  const [dateError, setDateError] = useState<string | null>(null);

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

  useEffect(() => {
    setError("");
    const requestedPage = pagination.pageNumber;
    const requestedSize = pagination.pageSize;
    const params: ClientListRequest = {};
    if (debouncedSearch && String(debouncedSearch).trim() !== "") {
      params.searchTerm = debouncedSearch;
    } else {
      params.pageNumber = requestedPage;
      params.pageSize = requestedSize;
    }

    // Send selected benefit enum keys to backend as `benefitType` (array)
    if (benefitType && benefitType.length > 0) {
      params.benefitType = benefitType.filter(Boolean);
    }

    // Send selected situation enum keys to backend as `situation` (array)
    if (situation && situation.length > 0) {
      params.situation = situation.filter(Boolean);
    }

    // Date range filter: backend expects `createdFrom` and `createdTo`
    // Do not send date filters while there is a validation error (start after end)
    if (!dateError && data && data.start && data.end) {
      const createdFrom =
        typeof data.start === "string"
          ? data.start
          : new Date(data.start).toISOString();
      const createdTo =
        typeof data.end === "string"
          ? data.end
          : new Date(data.end).toISOString();
      params.createdFrom = createdFrom;
      params.createdTo = createdTo;
    }

    // Cache por combinação de filtros/página: paginação e busca repetidas
    // (mesmos parâmetros) reaproveitam o resultado já visto nesta sessão, sem
    // reconsultar a API nem piscar o skeleton de loading. Só é invalidado no
    // logout ou quando um cliente é criado/editado/excluído.
    const cacheKey = JSON.stringify(params);
    const cached = getCachedClients(cacheKey);
    if (cached) {
      applyEnvelope(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Service tipado (GET /api/v1/clients) — paginação 1-based
    fetchClients(params)
      .then((envelope) => {
        setCachedClients(cacheKey, envelope);
        applyEnvelope(envelope);
      })
      .catch((err) => setError(String(err?.message ?? err)))
      .finally(() => setLoading(false));
  }, [
    refreshTrigger,
    pagination.pageNumber,
    pagination.pageSize,
    debouncedSearch,
    benefitType,
    situation,
    data,
    dateError,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((s) => ({ ...s, pageNumber: 1 }));
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const handleAddClientSuccess = () => {
    clearClientsCache();
    setRefreshTrigger((prev) => prev + 1);
  };

  // Remover cliente
  const handleDeleteClient = (clientId: string | number | null) => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    deleteClient(String(clientId))
      .then(() => {
        clearClientsCache();
        setRefreshTrigger((prev) => prev + 1);
      })
      .catch((err) => setError(err.message || "Erro ao deletar cliente"))
      .finally(() => setLoading(false));
  };

  // situation options are provided by `SituationOptions`
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [clientToDelete, setClientDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [modalDetailsOpen, setModalDetailsOpen] = useState(false);
  const [clientToDetails, setClientDetails] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editDetailsMode, setEditDetailsMode] = useState(false);

  const [modalAddClientOpen, setModalAddClientOpen] = useState(false);

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

  // determine if an item was updated by comparing only the calendar date (YYYY-MM-DD)
  const isUpdated = (item: Clients) => {
    if (!item) return false;
    const { createdAt, updatedAt } = item;
    if (!createdAt || !updatedAt) return false;

    const cDate = new Date(String(createdAt));
    const uDate = new Date(String(updatedAt));
    if (isNaN(cDate.getTime()) || isNaN(uDate.getTime())) return false;

    return (
      cDate.getFullYear() !== uDate.getFullYear() ||
      cDate.getMonth() !== uDate.getMonth() ||
      cDate.getDate() !== uDate.getDate()
    );
  };

  // server-side pagination: clients contains current page items
  const total = pagination.totalRecords;
  /**
   * v3/React Aria: o tipo de `onSelectionChange` varia com o modo de seleção.
   * Tipamos como `never` no ponto de uso para aceitar `Selection` (Set | "all").
   */
  const handleBenefitChange = ((keys: unknown) => {
    setBenefitType(selectionToArray(keys));
    setPagination((s) => ({ ...s, pageNumber: 1 }));
  }) as never;

  const handleSituationChange = ((keys: unknown) => {
    setSituation(selectionToArray(keys));
    setPagination((s) => ({ ...s, pageNumber: 1 }));
  }) as never;

  const totalPages = pagination.totalPages;
  const paginated = clients; // already paged by server

  // Intervalo exibido no rodapé ("11 a 20 de 47 clientes").
  const rangeStart =
    total === 0 ? 0 : (pagination.pageNumber - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.pageNumber * pagination.pageSize, total);

  /** Abre o modal de detalhes em modo leitura ou edição. */
  const openClientDetails = (item: Clients, edit: boolean) => {
    setClientDetails({ id: String(item.id), name: item.fullName });
    setEditDetailsMode(edit);
    setModalDetailsOpen(true);
  };

  const goToPage = (n: number) =>
    setPagination((s) => ({
      ...s,
      pageNumber: Math.min(Math.max(1, n), Math.max(1, s.totalPages)),
    }));

  return (
    <div>
      {/* Header de filtros */}
      <div className="w-full bg-primary rounded-t-lg p-4 flex gap-3">
        {/* v3: `Input` é primitivo (size/radius/classNames saíram → Tailwind). */}
        <Input
          placeholder="Pesquisar beneficiário..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((s) => ({ ...s, pageNumber: 1 }));
          }}
          className="min-w-[220px] bg-white"
        />

        {/* v3: Select virou compound (Trigger/Value/Indicator + Popover>ListBox). */}
        <Popover>
          <Button variant="secondary" className="min-w-[180px] bg-white text-gray-100">
            {benefitType.length > 0 ? `Benefício pretendido ({benefitType.length})` : "Benefício pretendido"}
          </Button>
          <Popover.Content>
            {/* v3: `Select` é single-select — multi-seleção usa ListBox. */}
            <ListBox
              aria-label="Benefício pretendido"
              selectionMode="multiple"
              selectedKeys={new Set(benefitType)}
              onSelectionChange={handleBenefitChange}
              className="bg-white text-gray-100"
            >
              {BenefitOptions.map((opt) => (
                <ListBox.Item key={opt.value} id={opt.value}>
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Popover.Content>
        </Popover>

        <Popover>
          <Button variant="secondary" className="min-w-[140px] bg-white text-gray-100">
            {situation.length > 0 ? `Situação ({situation.length})` : "Situação"}
          </Button>
          <Popover.Content>
            {/* v3: `Select` é single-select — multi-seleção usa ListBox. */}
            <ListBox
              aria-label="Situação"
              selectionMode="multiple"
              selectedKeys={new Set(situation)}
              onSelectionChange={handleSituationChange}
              className="bg-white text-gray-100"
            >
              {SituationOptions.map((opt) => (
                <ListBox.Item key={opt.value} id={opt.value}>
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Popover.Content>
        </Popover>
        <DateRangePicker
          aria-label="Período"
          value={data}
          onChange={(date) => {
            setData(date);
            setPagination((s) => ({ ...s, pageNumber: 1 }));

            // validate: start must be before end
            if (date && date.start && date.end) {
              const s = new Date(String(date.start));
              const e = new Date(String(date.end));
              if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                if (s > e) {
                  setDateError("Data inicial deve ser anterior à data final");
                } else {
                  setDateError(null);
                }
              } else {
                setDateError(null);
              }
            } else {
              setDateError(null);
            }
          }}
          isInvalid={!!dateError}
          className="min-w-[160px]"
        />
        <Button
          variant="secondary"
          className="text-white px-12 disabled:opacity-30"
          onPress={() => {
            setSearch("");
            setBenefitType([]);
            setSituation([]);
            setData(null);
            setPagination((s) => ({ ...s, pageNumber: 1 }));
          }}
          isDisabled={
            search === "" &&
            benefitType.length === 0 &&
            situation.length === 0 &&
            !data
          }
        >
          Limpar filtro
        </Button>
        <Button
          variant="outline"
          className="text-white border-white px-12"
          onPress={() => setModalAddClientOpen(true)}
        >
          <Image
            src="../../svg/icons/add.svg"
            alt="botão adicionar cliente"
            height={100}
            width={100}
          />
          Cliente
        </Button>
      </div>

      {/* Tabela */}
      {/* v3: shadow/radius/color/isStriped saíram — estilo via Tailwind. */}
      {/* `rounded-t-none` deixa o topo reto: o arredondamento vinha do
          `.table-root--primary`, que combina border-radius com overflow-clip. */}
      <Table className="rounded-t-none">
        {/* Table (Root) é só um wrapper; Table.Content é a coleção do React Aria.
            Sem ele, Table.Column/Table.Row renderizam "outside a collection".
            ScrollContainer dá rolagem horizontal — são 8 colunas. */}
        <Table.ScrollContainer>
        <Table.Content aria-label="Tabela de clientes" className="min-w-[1100px]">
        {/* As utilities do Tailwind ficam na layer `utilities` e o CSS do HeroUI
            na layer `components`, então estas classes vencem o `.table__column`
            sem precisar de `!important`.
            `after:content-none` remove a barra divisória vertical, que é um
            `::after` do próprio `.table__column`. */}
        <Table.Header columns={tableColumns}>
          {(column) => (
            <Table.Column
              className="h-14 text-center text-[1.25rem] text-secondary after:content-none"
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
                    <Table.Cell className="text-center text-[0.875rem]">
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
            {(item) => (
              <Table.Row
                className={`text-gray-100 ${item.beneficiaryNumber ? "border-2 border-solid border-green-200 rounded-lg relative" : ""}`}
              >
                <Table.Cell className="relative max-w-48 text-center text-[0.875rem]">
                  {display(item.fullName)}
                  {item.beneficiaryNumber ? (
                    <span className="absolute top-1 right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                      Isento
                    </span>
                  ) : null}
                </Table.Cell>
                <Table.Cell className="text-center text-[0.875rem]">
                  <CopyableValue label="CPF" value={item.cpf} />
                </Table.Cell>
                <Table.Cell className="text-center text-[0.875rem]">
                  {display(item.beneficiaryNumber)}
                </Table.Cell>
                <Table.Cell className="max-w-52 text-center text-[0.875rem] font-semibold">
                  {display(item.benefit)}
                </Table.Cell>
                <Table.Cell className="text-center text-[0.875rem]">
                  {formatDate(item.createdAt)}
                </Table.Cell>
                <Table.Cell
                  className={`text-center text-[0.875rem] ${isUpdated(item) ? "text-success" : "text-gray-600"}`}
                >
                  {formatDate(item.updatedAt)}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-center">
                    <SituationChips situations={[item.situation]} />
                  </div>
                </Table.Cell>
                <Table.Cell className="flex h-10 items-center justify-center gap-2 ">
                  <RowAction
                    label="Visualizar este cliente"
                    icon="/svg/icons/details.svg"
                    alt="botão ver detalhes do cliente"
                    onPress={() => openClientDetails(item, false)}
                  />
                  <RowAction
                    label="Editar este cliente"
                    icon="/svg/icons/edit.svg"
                    alt="botão editar cliente"
                    onPress={() => openClientDetails(item, true)}
                  />
                  <RowAction
                    label="Excluir este cliente"
                    icon="/svg/icons/trash.svg"
                    alt="botão excluir cliente"
                    onPress={() => {
                      setClientDelete({
                        id: String(item.id),
                        name: item.fullName,
                      });
                      setModalDeleteOpen(true);
                    }}
                  />
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        )}
        </Table.Content>
        </Table.ScrollContainer>

        {/* Rodapé da própria tabela (v3) — antes era um <div> irmão solto. */}
        <Table.Footer>
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
            <Pagination size="sm">
              <Pagination.Summary>
                {total === 0
                  ? "Nenhum cliente"
                  : `${rangeStart} a ${rangeEnd} de ${total} cliente${total === 1 ? "" : "s"}`}
              </Pagination.Summary>

              <Pagination.Content>
                <Pagination.Item>
                  {/* `hasPreviousPage`/`hasNextPage` vêm do envelope do backend
                      e já estavam no estado — antes não eram usados. */}
                  <Pagination.Previous
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
                        <Pagination.Ellipsis />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={entry}>
                        <Pagination.Link
                          isActive={entry === pagination.pageNumber}
                          onPress={() => goToPage(entry)}
                        >
                          {entry}
                        </Pagination.Link>
                      </Pagination.Item>
                    ),
                )}

                <Pagination.Item>
                  <Pagination.Next
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
        isOpen={modalDetailsOpen}
        onClose={() => {
          setModalDetailsOpen(false);
          setClientDetails(null);
        }}
        clientName={clientToDetails?.name || ""}
        clientId={clientToDetails?.id}
        editOnOpen={editDetailsMode}
        onConfirm={() => {
          clearClientsCache();
          setRefreshTrigger((prev) => prev + 1);
        }}
      />
      <AddNewClientModal
        isOpen={modalAddClientOpen}
        onClose={() => setModalAddClientOpen(false)}
        onConfirm={handleAddClientSuccess}
      />
    </div>
  );
}
