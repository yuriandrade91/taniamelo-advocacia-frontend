import type { PaymentBucket } from "@/components/payments/paymentBuckets";
import type { EntryKind } from "./entryForms";

/**
 * Entrada × saída: o vocabulário de cada lado da Carteira. Puro — a lista, o
 * filtro e o financeiro do cliente falam a mesma língua.
 */

export const KIND_META: Record<
  EntryKind,
  {
    label: string;
    noun: string;
    /** O que o "pago" quer dizer deste lado. */
    paidVerb: string;
    /** Nome da coluna de quem está do outro lado. */
    partyLabel: string;
    /** Nome da coluna da data em que o dinheiro se moveu. */
    paidDateLabel: string;
  }
> = {
  income: {
    label: "Entradas",
    noun: "receita",
    paidVerb: "Recebido",
    partyLabel: "Cliente",
    paidDateLabel: "Recebimento",
  },
  expense: {
    label: "Saídas",
    noun: "despesa",
    paidVerb: "Pago",
    partyLabel: "Fornecedor",
    paidDateLabel: "Pagamento",
  },
};


/** Cor do ponto do selo: previsto em azul claro, cancelado em cinza claro. */
export const BUCKET_DOT: Record<PaymentBucket, string> = {
  overdue: "bg-danger",
  upcoming: "bg-sky-400",
  paid: "bg-success",
  cancelled: "bg-light-gray",
};

/**
 * "Pago" numa despesa, "Recebido" numa receita; o resto é igual. Em
 * Pagamentos, "Recebido" é o cliente recebendo do INSS; aqui é o dinheiro
 * entrando no caixa do escritório — mesmo estado, dono diferente.
 */
export function bucketLabel(kind: EntryKind, bucket: PaymentBucket): string {
  switch (bucket) {
    case "overdue":
      return "Atrasado";
    case "upcoming":
      return "Previsto";
    case "paid":
      return KIND_META[kind].paidVerb;
    case "cancelled":
      return "Cancelado";
  }
}

