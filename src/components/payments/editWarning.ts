import { formatDateBR } from "@/lib/format";
import { bucketOf } from "./paymentBuckets";

/**
 * Aviso antes de editar algo já liquidado ou cancelado.
 *
 * Editar um lançamento em aberto é rotina; editar um **já recebido/pago**
 * muda um registro que já entrou no caixa (ou no que o cliente recebeu) e
 * provavelmente já foi conferido; editar um **cancelado** pode reabri-lo. Nos
 * dois casos a pessoa confirma antes — `null` quando não há o que avisar.
 *
 * O estado vem de `bucketOf`, a mesma regra do selo da tabela: o aviso nunca
 * fala de um status diferente do que está escrito na linha.
 */

export type EditWarning = {
  heading: string;
  description: string;
  confirmLabel: string;
};

export function editWarning(
  entry: { status?: string; overdue?: boolean; paidDate?: string },
  /** "recebido" (entrada, pagamento ao cliente) ou "pago" (saída). */
  settledWord: "recebido" | "pago",
): EditWarning | null {
  const bucket = bucketOf(entry);

  if (bucket === "paid") {
    const when = entry.paidDate ? ` em ${formatDateBR(entry.paidDate)}` : "";
    return {
      heading: `Editar um lançamento já ${settledWord}?`,
      description: `Ele foi ${settledWord}${when} e já entra nos totais. Mudar valor ou datas altera um registro que provavelmente já foi conferido.`,
      confirmLabel: "Editar mesmo assim",
    };
  }

  if (bucket === "cancelled") {
    return {
      heading: "Editar um lançamento cancelado?",
      description:
        "Ele está cancelado e fora dos totais. Editar pode reabri-lo e fazê-lo voltar a contar.",
      confirmLabel: "Editar mesmo assim",
    };
  }

  return null;
}
