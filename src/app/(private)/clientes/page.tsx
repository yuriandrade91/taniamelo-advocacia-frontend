"use client";
import AddNewClientModal from "@/components/ui/modals/AddNewClientModal/AddNewClientModal";

import DeleteClientModal from "@/components/ui/modals/DeleteClientModal/DeleteClientModal";
import DetailsClientModal from "@/components/ui/modals/DetailsClientModal/DetailsClientModal";
import endpoints from "@/constants/endpoints/paths";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { SituationOptions } from "@/enums/situation/Situation";
import type { Clients } from "@/interfaces/Clients.interface";
import axiosInstance from "@/services/axiosService";
import { Button } from "@heroui/button";
import { DateRangePicker } from "@heroui/date-picker";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import { Skeleton } from "@heroui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Tooltip } from "@heroui/tooltip";
import { SituationChips } from "@/components/SituationChips";
import Image from "next/image";
import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DateValue = any;
type RangeValue<T> = { start: T; end: T } | null;
// minimal alias to satisfy the page's params typing
type ClientListRequest = any;

export default function Clients() {
  const tableColumns = [
    { key: "fullName", label: "NOME COMPLETO" },
    { key: "cpf", label: "CPF" },
    // { key: "nitPis", label: "NIT/PIS" },
    { key: "beneficiaryName", label: "Nº BENEFICIÁRIO" },
    { key: "requestedBenefit", label: "BENEFÍCIO PRETENDIDO" },
    { key: "registrationDate", label: "DATA DO REGISTRO" },
    { key: "updatedDate", label: "ÚLTIMA ATUALIZAÇÃO" },
    { key: "status", label: "SITUAÇÃO" },
    { key: "actions", label: "AÇÕES" },
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

  useEffect(() => {
    setLoading(true);
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

    // Prefer using service wrapper which is typed
    import("@/services/clientService").then(({ clients: fetchClients }) => {
      fetchClients(params)
        .then((envelope) => {
          const items = envelope?.data ?? [];
          setClients(items);

          const p = envelope.pagination ?? null;
          if (p) {
            setPagination((prev) => ({
              pageNumber:
                typeof p.pageNumber === "number"
                  ? p.pageNumber
                  : prev.pageNumber,
              pageSize:
                typeof p.pageSize === "number" ? p.pageSize : prev.pageSize,
              totalRecords:
                typeof p.totalRecords === "number"
                  ? p.totalRecords
                  : prev.totalRecords,
              totalPages:
                typeof p.totalPages === "number"
                  ? p.totalPages
                  : prev.totalPages,
              hasNextPage: !!p.hasNextPage,
              hasPreviousPage: !!p.hasPreviousPage,
            }));
          }
        })
        .catch((err) => setError(String(err?.message ?? err)))
        .finally(() => setLoading(false));
    });
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
    setRefreshTrigger((prev) => prev + 1);
  };

  // Remover cliente
  const handleDeleteClient = (clientId: string | number | null) => {
    setLoading(true);
    setError("");
    axiosInstance
      .delete(`${endpoints.URL_CLIENTS.CLIENT}/${clientId}`)
      .then(() => {
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
  const totalPages = pagination.totalPages;
  const paginated = clients; // already paged by server

  return (
    <div>
      {/* Header de filtros */}
      <div className="w-full bg-primary rounded-t-lg p-4 flex gap-3">
        <Input
          size="lg"
          classNames={{
            inputWrapper: "bg-white",
          }}
          placeholder="Pesquisar beneficiário..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((s) => ({ ...s, pageNumber: 1 }));
          }}
          className="min-w-[220px]"
        />
        <Select
          size="lg"
          placeholder="Benefício pretendido"
          selectionMode="multiple"
          selectedKeys={benefitType}
          onSelectionChange={(keys) => {
            setBenefitType(Array.from(keys).map(String));
            setPagination((s) => ({ ...s, pageNumber: 1 }));
          }}
          className="min-w-[180px]"
          variant="flat"
          radius="md"
          classNames={{
            trigger: "bg-white text-gray-900",
            listbox: "bg-white text-gray-900",
            popoverContent: "bg-white text-gray-900",
          }}
        >
          {BenefitOptions.map((opt) => (
            <SelectItem key={opt.value}>{opt.label}</SelectItem>
          ))}
        </Select>
        <Select
          size="lg"
          placeholder="Situação"
          selectionMode="multiple"
          selectedKeys={situation}
          onSelectionChange={(keys) => {
            setSituation(Array.from(keys).map(String));
            setPagination((s) => ({ ...s, pageNumber: 1 }));
          }}
          className="min-w-[140px]"
          variant="flat"
          radius="md"
          classNames={{
            trigger: "bg-white text-gray-900",
            listbox: "bg-white text-gray-900",
            popoverContent: "bg-white text-gray-900",
          }}
        >
          {SituationOptions.map((opt) => (
            <SelectItem key={opt.value}>{opt.label}</SelectItem>
          ))}
        </Select>
        <DateRangePicker
          showMonthAndYearPickers
          label="Período"
          size="sm"
          radius="md"
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
          errorMessage={dateError ?? undefined}
          className="min-w-[160px]"
          classNames={{
            calendarContent: "bg-primary",
            inputWrapper: "bg-white",
            input: "bg-white",
            description: "bg-white text-green-900",
            selectorIcon: "text-primary",
          }}
        />
        <Button
          size="lg"
          variant="flat"
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
          size="lg"
          variant="bordered"
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
      <Table
        aria-label="Tabela de clientes"
        isStriped={false}
        shadow="none"
        radius="sm"
        selectionMode="single"
        color="secondary"
      >
        <TableHeader>
          {tableColumns.map((column) => (
            <TableColumn
              className="text-sm text-center bg-white border-b-1 text-secondary border-secondary/20 border-solid"
              key={column.key}
            >
              {column.label}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-32 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-24 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-20 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-24 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-28 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                {/* <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-20 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell> */}
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-20 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="rounded-lg">
                    <div className="h-6 w-24 rounded-lg bg-default-300" />
                  </Skeleton>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="rounded-full">
                        <div className="h-8 w-8 rounded-full bg-default-300" />
                      </Skeleton>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : error ? (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className="text-center py-8 text-lg text-red-500"
              >
                {error}
              </TableCell>
            </TableRow>
          ) : paginated.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className="text-center py-8 text-lg text-gray-500"
              >
                Nenhum cliente encontrado.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((item) => (
              <TableRow
                key={item.id}
                className={`text-gray-100 ${item.beneficiaryNumber ? "border-2 border-solid border-green-200 rounded-lg relative" : ""}`}
              >
                <TableCell className="text-base text-center max-w-48 relative">
                  {display(item.fullName)}
                  {item.beneficiaryNumber ? (
                    <span className="absolute top-1 right-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                      Isento
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-base text-center">
                  {display(item.cpf)}
                </TableCell>
                {/* <TableCell className="text-base text-center">
                  {item.nit_pis}
                </TableCell> */}
                <TableCell className="text-base text-center">
                  {display(item.beneficiaryNumber)}
                </TableCell>
                <TableCell className="text-base text-center font-semibold max-w-52">
                  {display(item.benefit)}
                </TableCell>
                <TableCell className="text-base text-center">
                  {formatDate(item.createdAt)}
                </TableCell>
                <TableCell
                  className={`text-base text-center ${isUpdated(item) ? "text-success" : "text-gray-600"}`}
                >
                  {formatDate(item.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <SituationChips situations={[item.situation]} />
                  </div>
                </TableCell>
                <TableCell className="h-20 flex justify-center items-center gap-2">
                  <Tooltip
                    color="primary"
                    placement="bottom"
                    content="Visualizar este cliente"
                    showArrow={true}
                  >
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      color="primary"
                      onPress={() => {
                        console.debug(
                          "Clients page: open details for",
                          item.id,
                        );
                        setClientDetails({
                          id: String(item.id),
                          name: item.fullName,
                        });
                        setEditDetailsMode(false);
                        setModalDetailsOpen(true);
                      }}
                    >
                      <Image
                        src="/svg/icons/details.svg"
                        alt="botao ver detalhes do cliente"
                        height={25}
                        width={25}
                      />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    color="secondary"
                    placement="bottom"
                    content="Editar este cliente"
                    showArrow={true}
                  >
                    <Button
                      variant="light"
                      isIconOnly
                      size="sm"
                      color="warning"
                      onPress={() => {
                        console.debug("Clients page: open edit for", item.id);
                        setClientDetails({
                          id: String(item.id),
                          name: item.fullName,
                        });
                        setEditDetailsMode(true);
                        setModalDetailsOpen(true);
                      }}
                    >
                      <Image
                        src="/svg/icons/edit.svg"
                        alt="botao editar cliente"
                        height={25}
                        width={25}
                      />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    color="danger"
                    placement="bottom"
                    content="Excluir este cliente"
                    showArrow={true}
                  >
                    <Button
                      variant="light"
                      isIconOnly
                      size="sm"
                      color="danger"
                      onPress={() => {
                        setClientDelete({
                          id: String(item.id),
                          name: item.fullName,
                        });
                        setModalDeleteOpen(true);
                      }}
                    >
                      <Image
                        src="/svg/icons/trash.svg"
                        alt="botao de excluir cliente"
                        height={25}
                        width={25}
                      />
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Paginação */}
      <div className="flex items-center justify-between pt-4">
        <div />
        {loading ? (
          <Skeleton className="rounded-lg">
            <div className="h-8 w-48 rounded-lg bg-default-300" />
          </Skeleton>
        ) : (
          <Pagination
            variant="light"
            color="primary"
            total={totalPages}
            page={pagination.pageNumber}
            onChange={(p) => setPagination((s) => ({ ...s, pageNumber: p }))}
            showControls
          />
        )}
        {loading ? (
          <Skeleton className="rounded-lg">
            <div className="h-6 w-40 rounded-lg bg-default-300" />
          </Skeleton>
        ) : (
          <div className="text-base font-semibold text-gray-600">
            Total de clientes:
            <span className="ml-2 py-1 px-2 border-solid border-1 border-secondary rounded-lg bg-secondary/10">
              {total}
            </span>
          </div>
        )}
      </div>

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
        onConfirm={() => setRefreshTrigger((prev) => prev + 1)}
      />
      <AddNewClientModal
        isOpen={modalAddClientOpen}
        onClose={() => setModalAddClientOpen(false)}
        onConfirm={handleAddClientSuccess}
      />
    </div>
  );
}
