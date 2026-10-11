import { PaymentStatusLabelByKey } from "@/enums/payment/Payment";
import type { BadgeTone } from "@/components/ui/feedback/Badges";

/**
 * Classificação de um recebimento nos mesmos baldes que o `summary` usa.
 *
 * Precisa concordar com o backend campo a campo: se a linha diz "Previsto" e o
 * total de "Vencidos" a inclui, ninguém vai confiar em nenhum dos dois. Por
 * isso a regra é função pura e testada, e a definição está escrita no mesmo
 * lugar em que o contrato do `summary` está documentado.
 *
 * `overdue` vem calculado do backend — não recalculamos com `new Date()` aqui.
 * O relógio do navegador é do usuário; o do servidor é o do sistema. Duas
 * fontes para "hoje" é como uma linha aparece vencida numa tela e em dia na
 * outra.
 */

export type PaymentBucket = "overdue" | "upcoming" | "paid" | "cancelled";

type Classifiable = {
  status?: string;
  overdue?: boolean;
};

export function bucketOf(payment: Classifiable): PaymentBucket {
  if (payment.status === PaymentStatusLabelByKey.CANCELADO) return "cancelled";
  if (payment.status === PaymentStatusLabelByKey.PAGO) return "paid";
  return payment.overdue ? "overdue" : "upcoming";
}

/** Rótulo e tom do selo. "Atrasado" é o termo que a `StatusBadge` já usa. */
export const BUCKET_BADGE: Record<
  PaymentBucket,
  { label: string; tone: BadgeTone }
> = {
  overdue: { label: "Atrasado", tone: "danger" },
  upcoming: { label: "Previsto", tone: "warning" },
  // "Recebido" e não "Pago": quem recebe é o cliente, do INSS.
  paid: { label: "Recebido", tone: "success" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

/** O balde em ordem de leitura do filtro — a mesma dos cards e dos selos. */
export const BUCKET_FILTER_ORDER: readonly PaymentBucket[] = [
  "overdue",
  "upcoming",
  "paid",
  "cancelled",
];

type BucketQuery =
  | { empty: true }
  | {
      empty: false;
      status?: ("PENDENTE" | "PAGO" | "CANCELADO")[];
      dueFrom?: string;
      dueTo?: string;
    };

/** `yyyy-MM-dd` do dia anterior, sem passar por fuso. */
function previousDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - 1));
  return date.toISOString().slice(0, 10);
}

const later = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);
const earlier = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);

/**
 * Traduz o balde escolhido no filtro para o que `GET /payments` entende.
 *
 * O backend filtra por `status` (Pendente/Pago/Cancelado) e por vencimento —
 * não por balde. Atrasado e Previsto são os dois "Pendente", separados pelo
 * vencimento: antes de hoje é atrasado, de hoje em diante é previsto (a mesma
 * regra do `overdue` que o servidor calcula). Então o balde vira status +
 * um corte de data, **intersectado** com o "Vence de/até" que a pessoa já
 * escolheu.
 *
 * Um balde por vez, e não vários: "Atrasado + Recebido" pediria o corte de
 * data só para uma parte dos status, o que não cabe numa query.
 *
 * `today` é o do navegador. O `overdue` da linha vem do relógio do servidor;
 * os dois só divergem na virada do dia, e nesse minuto uma parcela pode
 * aparecer no balde vizinho — aceitável para um filtro, e o selo da linha
 * continua dizendo a verdade do servidor.
 *
 * `empty` quando a interseção não tem dia nenhum ("Atrasado" com "Vence de"
 * no futuro): a tela mostra vazio sem perguntar ao servidor.
 */
export function bucketQuery(
  bucket: PaymentBucket | "",
  range: { dueFrom?: string; dueTo?: string },
  today: string,
): BucketQuery {
  let { dueFrom, dueTo } = range;
  let status: ("PENDENTE" | "PAGO" | "CANCELADO")[] | undefined;

  switch (bucket) {
    case "overdue":
      status = ["PENDENTE"];
      dueTo = earlier(dueTo, previousDay(today));
      break;
    case "upcoming":
      status = ["PENDENTE"];
      dueFrom = later(dueFrom, today);
      break;
    case "paid":
      status = ["PAGO"];
      break;
    case "cancelled":
      status = ["CANCELADO"];
      break;
  }

  if (dueFrom && dueTo && dueFrom > dueTo) return { empty: true };
  return { empty: false, status, dueFrom, dueTo };
}
