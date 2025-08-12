"use client";
import AddNewClientModal from "@/components/modals/AddNewClientModal/AddNewClientModal";
import DeleteClientModal from "@/components/modals/DeleteClientModal/DeleteClientModal";
import DetailsClientModal from "@/components/modals/DetailsClientModal/DetailsClientModal";
import endpoints from "@/constants/endpoints/endpoints";
import {
  RetirementType,
  RetirementTypeText,
} from "@/enums/retirementType/RetirementType";
import { Client } from "@/interfaces/client/clientInterface";
import { Button } from "@heroui/button";
import { DateRangePicker } from "@heroui/date-picker";
import { Input } from "@heroui/input";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import Image from "next/image";
import { useEffect, useState } from "react";
import axiosInstance from "@/services/axiosService";

// Tipos locais para DateValue e RangeValue
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DateValue = any;
type RangeValue<T> = { start: T; end: T } | null;

export default function Clients() {
  const tableColumns = [
    { key: "fullName", label: "NOME COMPLETO" },
    { key: "cpf", label: "CPF" },
    { key: "nitPis", label: "NIT/PIS" },
    { key: "beneficiaryName", label: "Nº BENEFICIÁRIO" },
    { key: "requestedBenefit", label: "BENEFÍCIO PRETENDIDO" },
    { key: "registrationDate", label: "DATA DO REGISTRO" },
    { key: "status", label: "SITUAÇÃO" },
    { key: "actions", label: "AÇÕES" },
  ];

  // Estado para clientes vindos da API
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

useEffect(() => {
  setLoading(true);
  setError("");
  axiosInstance
    .get(endpoints.CLIENTS.URL_CLIENTS)
    .then((res) => setClients(res.data))
    .catch((err) => setError(err.message || "Erro desconhecido"))
    .finally(() => setLoading(false));
}, []);

  // Gera dinamicamente os benefícios e situações únicos presentes nos dados dos clientes
  const beneficios = Array.from(new Set(clients.map((c) => c.benefit_type)));
  const situacoes = Array.from(new Set(clients.map((c) => c.situation_status)));
  const PAGE_SIZE = 10;

  const [search, setSearch] = useState("");
  const [beneficio, setBeneficio] = useState<string[]>([]);
  const [situacao, setSituacao] = useState<string[]>([]);
  const [data, setData] = useState<RangeValue<DateValue>>(null);
  const [page, setPage] = useState(1);
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

  // Remover cliente
  const handleDeleteClient = () => {
    if (clientToDelete) {
      setClients((prev) =>
        prev.filter((c) => String(c.id) !== clientToDelete.id)
      );
      setModalDeleteOpen(false);
      setClientDelete(null);
    }
  };

  // Estado para controlar o modal de adicionar novo cliente
  const [modalAddClientOpen, setModalAddClientOpen] = useState(false);

  const filtered = clients.filter((item) => {
    return (
      (search === "" ||
        item.full_name.toLowerCase().includes(search.toLowerCase()) ||
        item.cpf.includes(search)) &&
      (beneficio.length === 0 ||
        beneficio.includes(String(item.benefit_type))) &&
      (situacao.length === 0 || situacao.includes(item.situation_status)) &&
      (!data || item.created_at === data?.toString())
    );
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      {/* Header de filtros */}
      <div className="w-full bg-primary rounded-t-lg p-4 flex gap-3">
        <Input
          size="lg"
          placeholder="Pesquisar beneficiário..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-[220px]"
        />
        <Select
          size="lg"
          placeholder="Benefício pretendido"
          selectionMode="multiple"
          selectedKeys={beneficio}
          onSelectionChange={(keys) => {
            setBeneficio(Array.from(keys).map(String));
            setPage(1);
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
          {beneficios.map((b) => (
            <SelectItem key={String(b)}>
              {RetirementTypeText[b as unknown as RetirementType] || b}
            </SelectItem>
          ))}
        </Select>
        <Select
          size="lg"
          placeholder="Situação"
          selectionMode="multiple"
          selectedKeys={situacao}
          onSelectionChange={(keys) => {
            setSituacao(Array.from(keys).map(String));
            setPage(1);
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
          {situacoes.map((s) => (
            <SelectItem key={s}>{s}</SelectItem>
          ))}
        </Select>
        <DateRangePicker
          label="Período"
          size="sm"
          radius="md"
          value={data}
          onChange={(date) => {
            setData(date);
            setPage(1);
          }}
          className="min-w-[160px] text-primary"
        />
        <Button
          size="lg"
          variant="flat"
          className="text-white px-12"
          onPress={() => {
            setSearch("");
            setBeneficio([]);
            setSituacao([]);
            setData(null);
            setPage(1);
          }}
          isDisabled={
            search === "" &&
            beneficio.length === 0 &&
            situacao.length === 0 &&
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
            <TableRow>
              <TableCell
                colSpan={tableColumns.length}
                className="text-center py-8 text-lg text-gray-500"
              >
                Carregando clientes...
              </TableCell>
            </TableRow>
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
                Nenhum cliente encontrado com os filtros selecionados.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((item) => (
              <TableRow key={item.id} className="text-gray-100">
                <TableCell className="text-base text-center max-w-48">
                  {item.full_name}
                </TableCell>
                <TableCell className="text-base text-center">
                  {item.cpf}
                </TableCell>
                <TableCell className="text-base text-center">
                  {item.nit_pis}
                </TableCell>
                <TableCell className="text-base text-center">
                  {item.benefit_number}
                </TableCell>
                <TableCell className="text-base text-center font-semibold max-w-52">
                  {item.benefit_type}
                </TableCell>
                <TableCell className="text-base text-center">
                  {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-base text-center">
                  {item.situation_status}
                </TableCell>
                <TableCell className="h-16 flex justify-center items-center gap-2">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    color="primary"
                    title="Visualizar detalhes deste cliente"
                    onPress={() => {
                      setClientDetails({
                        id: String(item.id),
                        name: item.full_name,
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
                  <Button
                    variant="light"
                    isIconOnly
                    size="sm"
                    color="warning"
                    title="Editar este cliente"
                    onPress={() => {
                      setClientDetails({
                        id: String(item.id),
                        name: item.full_name,
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
                  <Button
                    variant="light"
                    isIconOnly
                    size="sm"
                    color="danger"
                    title="Excluir este cliente"
                    onPress={() => {
                      setClientDelete({
                        id: String(item.id),
                        name: item.full_name,
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* Paginação */}
      <div className="flex items-center justify-between pt-4">
        <div />
        <Pagination
          variant="light"
          color="primary"
          total={totalPages}
          page={page}
          onChange={setPage}
          showControls
        />
        <div className="text-base font-semibold text-gray-600">
          Total de clientes:
          <span className="ml-2 py-1 px-2 border-solid border-1 border-secondary rounded-lg bg-secondary/10">
            {total}
          </span>
        </div>
      </div>

      <DeleteClientModal
        isOpen={modalDeleteOpen}
        onClose={() => {
          setModalDeleteOpen(false);
          setClientDelete(null);
        }}
        clientName={clientToDelete?.name || ""}
        onConfirm={handleDeleteClient}
      ></DeleteClientModal>

      <DetailsClientModal
        isOpen={modalDetailsOpen}
        onClose={() => {
          setModalDetailsOpen(false);
          setClientDelete(null);
        }}
        clientName={clientToDetails?.name || ""}
        editOnOpen={editDetailsMode}
      />
      <AddNewClientModal
        isOpen={modalAddClientOpen}
        onClose={() => setModalAddClientOpen(false)}
      />
    </div>
  );
}
