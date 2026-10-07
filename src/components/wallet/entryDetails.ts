import { plural } from "@/lib/format";
import { daysBetween } from "@/lib/period";
import { formatDateBR } from "@/lib/format";
import {
  bucketOf,
  type PaymentBucket,
} from "@/components/payments/paymentBuckets";

/**
 * Frase de prazo do detalhe de um lançamento: "vence em 7 dias", "atrasado
 * há 3 dias", "pago em 05/10/2026".
 *
 * O balde vem de `bucketOf` — o mesmo do selo da tabela —, e não de comparar
 * datas aqui: o `overdue` é calculado pelo servidor, e duas fontes para
 * "está atrasado" é como o selo diz uma coisa e a frase outra. As datas só
 * medem **quanto**.
 */


export function dueLine(
  entry: {
    status?: string;
    overdue?: boolean;
    dueDate: string;
    paidDate?: string;
  },
  today: string,
): { bucket: PaymentBucket; text: string } {
  const bucket = bucketOf(entry);

  switch (bucket) {
    case "paid":
      return {
        bucket,
        text: entry.paidDate
          ? `Pago em ${formatDateBR(entry.paidDate)}`
          : "Pago",
      };
    case "cancelled":
      return { bucket, text: "Lançamento cancelado" };
    case "overdue": {
      const late = daysBetween(entry.dueDate, today);
      return {
        bucket,
        text:
          late > 0 ? `Atrasado há ${plural(late, "dia", "dias")}` : "Atrasado",
      };
    }
    case "upcoming": {
      const left = daysBetween(today, entry.dueDate);
      return {
        bucket,
        text:
          left <= 0
            ? "Vence hoje"
            : left === 1
              ? "Vence amanhã"
              : `Vence em ${plural(left, "dia", "dias")}`,
      };
    }
  }
}

/**
 * Quanto do prazo já passou — o anel do bloco "Prazo" no detalhe.
 *
 * Do lançamento ao vencimento: lançado hoje com vencimento em 10 dias é 0%;
 * no dia do vencimento, 100%. Pago fecha o anel em verde; atrasado, em
 * vermelho; cancelado fica vazio. O número no centro é o mesmo que a frase de
 * prazo diz — dias que faltam ou de atraso —, para os dois não divergirem.
 */
export function dueProgress(
  entry: {
    status?: string;
    overdue?: boolean;
    dueDate: string;
    paidDate?: string;
    createdAt?: string;
  },
  today: string,
): {
  bucket: PaymentBucket;
  fraction: number;
  center: string;
  caption: string;
} {
  const bucket = bucketOf(entry);

  if (bucket === "paid")
    return { bucket, fraction: 1, center: "✓", caption: "pago" };
  if (bucket === "cancelled")
    return { bucket, fraction: 0, center: "—", caption: "cancelado" };

  if (bucket === "overdue") {
    const late = Math.max(daysBetween(entry.dueDate, today), 0);
    return {
      bucket,
      fraction: 1,
      center: String(late),
      caption: late === 1 ? "dia de atraso" : "dias de atraso",
    };
  }

  const left = Math.max(daysBetween(today, entry.dueDate), 0);
  const start = entry.createdAt ?? today;
  const total = daysBetween(start, entry.dueDate);
  const elapsed = daysBetween(start, today);
  const fraction = total <= 0 ? 1 : Math.min(Math.max(elapsed / total, 0), 1);
  return {
    bucket,
    fraction,
    center: left === 0 ? "hoje" : String(left),
    caption:
      left === 0 ? "vence" : left === 1 ? "dia restante" : "dias restantes",
  };
}

export type TimelineStepId = "created" | "due" | "paid";

/**
 * Em que etapa o lançamento **está agora** — a única com halo (`PulseHalo`).
 *
 * Em aberto (previsto ou atrasado), o que importa é o vencimento; pago, o
 * pagamento; cancelado não tem etapa viva. Pulsar todas as etapas dizia
 * "tudo pede atenção", que é o mesmo que nada pedir.
 */
export function currentStep(bucket: PaymentBucket): TimelineStepId | null {
  if (bucket === "paid") return "paid";
  if (bucket === "cancelled") return null;
  return "due";
}

/**
 * Valor para a área de transferência — o botão "Copiar" do detalhe.
 *
 * Sem "R$" e sem separador de milhar, com vírgula decimal: é o formato que
 * cola como **número** numa planilha em pt-BR. "R$ 1.234,50" colaria como
 * texto, e a soma da coluna daria zero sem avisar.
 */
export const amountForClipboard = (amount: number): string =>
  amount.toFixed(2).replace(".", ",");
