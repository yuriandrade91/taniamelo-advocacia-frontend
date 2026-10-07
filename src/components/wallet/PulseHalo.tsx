import type { PaymentBucket } from "@/components/payments/paymentBuckets";

/**
 * Cor do status, sólida — o ponto da etapa atual fica **parado** nela.
 *
 * Mesma escala do selo da tabela: atrasado vermelho, previsto laranja, pago
 * verde, cancelado neutro.
 */
export const STATUS_DOT: Record<PaymentBucket, string> = {
  overdue: "bg-danger",
  upcoming: "bg-previsto",
  paid: "bg-success",
  cancelled: "bg-gray-100/40",
};

const HALO: Record<PaymentBucket, string> = {
  overdue: "bg-danger",
  upcoming: "bg-previsto",
  paid: "bg-success",
  cancelled: "",
};

/**
 * O anel que pulsa em volta da etapa atual — só ele se move; o ponto
 * continua estático.
 *
 * Vai como **primeiro filho** do ponto (que precisa ser `relative` ou
 * `absolute`). Sem z-index negativo: dentro do painel, que tem contexto de
 * empilhamento próprio, ele iria para trás do fundo branco do card e sumiria.
 * Conteúdo do ponto (✓, !, número) vai num `relative` depois dele, por cima.
 * `motion-reduce:hidden`: quem pediu menos movimento no sistema não vê o
 * anel, e o ponto colorido sozinho já marca a etapa.
 */
export function PulseHalo({
  bucket,
  colorClass,
}: {
  bucket: PaymentBucket;
  /** Sobrescreve a cor (ex.: fundo escuro, onde o navy do previsto sumiria). */
  colorClass?: string;
}) {
  if (bucket === "cancelled") return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 animate-halo rounded-full motion-reduce:hidden ${colorClass ?? HALO[bucket]}`}
    />
  );
}
