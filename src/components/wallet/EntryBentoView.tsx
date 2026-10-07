"use client";

import { formatDateBR } from "@/lib/format";
import { DetailBento } from "./DetailBento";
import type { Detail } from "./EntryDetailsDrawer";

/**
 * Detalhe de um lançamento da Carteira no desenho bento (`DetailBento`).
 *
 * Só traduz entrada/saída para os blocos: a outra parte é o cliente (entrada)
 * ou o fornecedor (saída), e o terceiro fato é a data de lançamento ou a
 * categoria.
 */
export function EntryBentoView({
  detail,
  onEdit,
  onSettle,
}: {
  detail: Detail;
  onEdit?: () => void;
  onSettle?: () => void;
}) {
  const { data } = detail;
  const isIncome = detail.kind === "entrada";

  return (
    <DetailBento
      entry={data}
      eyebrow={isIncome ? "Entrada" : "Saída"}
      party={{
        label: isIncome ? "Cliente" : "Fornecedor",
        name: isIncome
          ? detail.data.clientName || null
          : detail.data.supplier || null,
        emptyText: isIncome ? "Sem cliente" : "Não informado",
      }}
      facts={[
        { label: "Vencimento", value: formatDateBR(data.dueDate) },
        { label: "Forma", value: data.paymentMethod ?? "—" },
        isIncome
          ? { label: "Lançado", value: formatDateBR(data.createdAt) }
          : { label: "Categoria", value: detail.data.category ?? "—" },
      ]}
      settledStep={isIncome ? "Recebido" : "Pago"}
      settleLabel={isIncome ? "Marcar como recebido" : "Marcar como pago"}
      onEdit={onEdit}
      onSettle={onSettle}
    />
  );
}
