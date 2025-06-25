"use client";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { DateRangePicker } from "@heroui/date-picker";
import { Pagination } from "@heroui/pagination";
import type { DateValue } from "@heroui/date-picker";
import Image from "next/image";

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
  const mockData = [
    {
      id: "1",
      nome: "Ana Paula Silva",
      cpf: "123.456.789-00",
      nit: "1234567890",
      beneficiario: "10001",
      beneficio: "Aposentadoria",
      dataRegistro: "2025-06-01",
      situacao: "Ativo",
    },
    {
      id: "2",
      nome: "Carlos Souza",
      cpf: "987.654.321-11",
      nit: "9876543210",
      beneficiario: "10002",
      beneficio: "Auxílio Doença",
      dataRegistro: "2025-05-15",
      situacao: "Pendente",
    },
    {
      id: "3",
      nome: "Maria Oliveira",
      cpf: "111.222.333-44",
      nit: "1122334455",
      beneficiario: "10003",
      beneficio: "Pensão",
      dataRegistro: "2025-04-20",
      situacao: "Inativo",
    },
    {
      id: "4",
      nome: "João Lima",
      cpf: "555.666.777-88",
      nit: "5566778899",
      beneficiario: "10004",
      beneficio: "Aposentadoria",
      dataRegistro: "2025-06-10",
      situacao: "Ativo",
    },
    {
      id: "5",
      nome: "Fernanda Costa",
      cpf: "999.888.777-66",
      nit: "9988776655",
      beneficiario: "10005",
      beneficio: "Auxílio Doença",
      dataRegistro: "2025-06-01",
      situacao: "Ativo",
    },
  ];

  const beneficios = ["Aposentadoria", "Auxílio Doença", "Pensão"];
  const situacoes = ["Ativo", "Pendente", "Inativo"];
  const PAGE_SIZE = 3;

  const [search, setSearch] = useState("");
  const [beneficio, setBeneficio] = useState<string>("");
  const [situacao, setSituacao] = useState<string>("");
  const [data, setData] = useState<DateValue | null>(null);
  const [page, setPage] = useState(1);

  // Filtro simples
  const filtered = mockData.filter((item) => {
    return (
      (search === "" ||
        item.nome.toLowerCase().includes(search.toLowerCase()) ||
        item.cpf.includes(search)) &&
      (beneficio === "" || item.beneficio === beneficio) &&
      (situacao === "" || item.situacao === situacao) &&
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
          selectedKeys={beneficio ? [beneficio] : []}
          onSelectionChange={(keys) => {
            const key = Array.isArray(keys)
              ? keys[0]
              : Array.from(keys)[0] || "";
            setBeneficio(key);
            setPage(1);
          }}
          className="min-w-[180px]"
        >
          <>
            <SelectItem key="">Todos os benefícios</SelectItem>
            {beneficios.map((b) => (
              <SelectItem key={b}>{b}</SelectItem>
            ))}
          </>
        </Select>
        <Select
          size="lg"
          placeholder="Situação"
          selectedKeys={situacao ? [situacao] : []}
          onSelectionChange={(keys) => {
            const key = Array.isArray(keys)
              ? keys[0]
              : Array.from(keys)[0] || "";
            setSituacao(key);
            setPage(1);
          }}
          className="min-w-[140px]"
        >
          <SelectItem key="">Todas as situações</SelectItem>
          <>
            {situacoes.map((s) => (
              <SelectItem key={s}>{s}</SelectItem>
            ))}
          </>
        </Select>
        <DateRangePicker
          size="lg"
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
            setBeneficio("");
            setSituacao("");
            setData(null);
            setPage(1);
          }}
          disabled={!search && !beneficio && !situacao && !data}
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
          {paginated.map((item) => (
            <TableRow key={item.id} className="text-gray-600">
              <TableCell className="text-center">{item.nome}</TableCell>
              <TableCell className="text-center">{item.cpf}</TableCell>
              <TableCell className="text-center">{item.nit}</TableCell>
              <TableCell className="text-center">{item.beneficiario}</TableCell>
              <TableCell className="text-center font-semibold">
                {item.beneficio}
              </TableCell>
              <TableCell className="text-center">
                {new Date(item.dataRegistro).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell className="text-center">{item.situacao}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                  <Button
                    variant="light"
                    isIconOnly
                    size="sm"
                    color="primary"
                    title="Visualizar detalhes deste cliente"
                  >
                    <Image
                      src="../../svg/icons/details.svg"
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
                  >
                    <Image
                      src="../../svg/icons/edit.svg"
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
                  >
                    <Image
                      src="../../svg/icons/trash.svg"
                      alt="botao de excluir cliente"
                      height={25}
                      width={25}
                    />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
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
          Total de clientes:{" "}
          <span className="py-1 px-2 border-solid border-1 border-secondary rounded-lg bg-secondary/10">
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}
