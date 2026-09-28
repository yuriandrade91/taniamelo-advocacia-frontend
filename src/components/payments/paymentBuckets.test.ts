import { describe, expect, it } from "vitest";
import { BUCKET_BADGE, bucketOf } from "./paymentBuckets";

describe("bucketOf", () => {
  it("cancelado vence qualquer outra condição", () => {
    // Mesmo marcado como vencido pelo backend, cancelado não é cobrança.
    expect(bucketOf({ status: "Cancelado", overdue: true })).toBe("cancelled");
  });

  it("pago não é vencido, mesmo que a flag venha true", () => {
    // Pago depois do vencimento: a dívida acabou, o selo não pode ser vermelho.
    expect(bucketOf({ status: "Pago", overdue: true })).toBe("paid");
  });

  it("pendente segue a flag do servidor", () => {
    expect(bucketOf({ status: "Pendente", overdue: true })).toBe("overdue");
    expect(bucketOf({ status: "Pendente", overdue: false })).toBe("upcoming");
  });

  it("sem status nem flag, cai em 'a vencer' — nunca em vermelho por omissão", () => {
    expect(bucketOf({})).toBe("upcoming");
  });

  it("todo balde tem rótulo e tom", () => {
    for (const bucket of ["overdue", "upcoming", "paid", "cancelled"] as const) {
      expect(BUCKET_BADGE[bucket].label).toBeTruthy();
      expect(BUCKET_BADGE[bucket].tone).toBeTruthy();
    }
  });
});
