"use client";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DateRangePicker } from "@heroui/date-picker";
import { Pagination } from "@heroui/pagination";
import Image from "next/image";
import DeleteClientModal from "@/components/modals/DeleteClientModal/DeleteClientModal";
import { useState } from "react";
import { RetirementType, RetirementTypeText } from "@/enums/retirementType/RetirementType";
import { IntendedBenefit } from "@/enums/intendedBenefit/IntendedBenefit";
import DetailsClientModal from "@/components/modals/DetailsClientModal/DetailsClientModal";

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

  // Simulação de dados
  const [clients, setClients] = useState([
    {
      id: "1",
      nome: "Ana Paula Silva",
      cpf: "123.456.789-00",
      nit: "1234567890",
      beneficiario: "10001",
      beneficio: RetirementType.Age,
      dataRegistro: "2025-06-01",
      situacao: IntendedBenefit.FormFilled,
    },
    {
      id: "2",
      nome: "Carlos Souza",
      cpf: "987.654.321-11",
      nit: "9876543210",
      beneficiario: "10002",
      beneficio: RetirementType.ContributionTime,
      dataRegistro: "2025-05-15",
      situacao: IntendedBenefit.DocumentAnalysis,
    },
    {
      id: "3",
      nome: "Maria Oliveira",
      cpf: "111.222.333-44",
      nit: "1122334455",
      beneficiario: "10003",
      beneficio: RetirementType.PermanentDisability,
      dataRegistro: "2025-04-20",
      situacao: IntendedBenefit.PlanningInProgress,
    },
    {
      id: "4",
      nome: "João Lima",
      cpf: "555.666.777-88",
      nit: "5566778899",
      beneficiario: "10004",
      beneficio: RetirementType.PermanentDisability,
      dataRegistro: "2025-06-10",
      situacao: IntendedBenefit.PlanningCompleted,
    },
    {
      id: "5",
      nome: "Fernanda Costa de Melo Andrade Pacheco",
      cpf: "999.888.777-66",
      nit: "9988776655",
      beneficiario: "10005",
      beneficio: RetirementType.Special,
      dataRegistro: "2025-06-01",
      situacao: IntendedBenefit.FutureBenefit,
    },
    {
      id: "6",
      nome: "Fernanda Costa",
      cpf: "999.888.777-66",
      nit: "9988776655",
      beneficiario: "10005",
      beneficio: RetirementType.Disability,
      dataRegistro: "2025-06-01",
      situacao: IntendedBenefit.BenefitCompleted,
    },
    {
      id: "7",
      nome: "Yuri Felipe de Melo Andrade",
      cpf: "999.888.777-66",
      nit: "9988776655",
      beneficiario: "10005",
      beneficio: RetirementType.TeacherContributionTime,
      dataRegistro: "2025-06-01",
      situacao: IntendedBenefit.BenefitCompleted,
    },
    {
      id: "8",
      nome: "Fernanda Costa",
      cpf: "999.888.777-66",
      nit: "9988776655",
      beneficiario: "10005",
      beneficio: RetirementType.Invalidity,
      dataRegistro: "2025-06-01",
      situacao: IntendedBenefit.BenefitCompleted,
    },
  ]);

  // Gera dinamicamente os benefícios e situações únicos presentes nos dados dos clientes
  const beneficios = Array.from(new Set(clients.map((c) => c.beneficio)));
  const situacoes = Array.from(new Set(clients.map((c) => c.situacao)));
  const PAGE_SIZE = 3;

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
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setModalDeleteOpen(false);
      setClientDelete(null);
    }
  };

  const filtered = clients.filter((item) => {
    return (
      (search === "" ||
        item.nome.toLowerCase().includes(search.toLowerCase()) ||
        item.cpf.includes(search)) &&
      (beneficio.length === 0 || beneficio.includes(String(item.beneficio))) &&
      (situacao.length === 0 || situacao.includes(item.situacao)) &&
      (!data || item.dataRegistro === data?.toString())
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
          classNames={{ trigger: "bg-white text-gray-900", listbox: "bg-white text-gray-900", popoverContent: "bg-white text-gray-900" }}
        >
          {beneficios.map((b) => (
            <SelectItem key={String(b)}>{RetirementTypeText[b as RetirementType] || b}</SelectItem>
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
          classNames={{ trigger: "bg-white text-gray-900", listbox: "bg-white text-gray-900", popoverContent: "bg-white text-gray-900" }}
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
        >
          <Image
            src="../../svg/icons/add.svg"
            alt="botao adicionar cliente"
            height={100}
            width={100}
          />{" "}
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
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tableColumns.length} className="text-center py-8 text-lg text-gray-500">
                Nenhum cliente encontrado com os filtros selecionados.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((item) => (
              <TableRow key={item.id} className="text-gray-100">
                <TableCell className="text-base text-center max-w-48">{item.nome}</TableCell>
                <TableCell className="text-base text-center">{item.cpf}</TableCell>
                <TableCell className="text-base text-center">{item.nit}</TableCell>
                <TableCell className="text-base text-center">{item.beneficiario}</TableCell>
                <TableCell className="text-base text-center font-semibold max-w-52">
                  {RetirementTypeText[item.beneficio as RetirementType] || item.beneficio}
                </TableCell>
                <TableCell className="text-base text-center">
                  {new Date(item.dataRegistro).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-base text-center">{item.situacao}</TableCell>
                <TableCell className="h-16 flex justify-center items-center gap-2">
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    color="primary"
                    title="Visualizar detalhes deste cliente"
                    onPress={() => {
                      setClientDetails({ id: item.id, name: item.nome });
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
                      setClientDetails({ id: item.id, name: item.nome });
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
                      setClientDelete({ id: item.id, name: item.nome });
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
      <div className="flex items-center justify-between mt-4">
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
      >
      </DeleteClientModal>

      <DetailsClientModal
        isOpen={modalDetailsOpen}
        onClose={() => {
          setModalDetailsOpen(false);
          setClientDelete(null);
        }}
        clientName={clientToDetails?.name || ""}
        editOnOpen={editDetailsMode}
      />
    </div>
  );
}
