import { describe, expect, it } from "vitest";
import { BUCKET_BADGE, bucketOf, bucketQuery } from "@/components/payments/paymentBuckets";

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

describe("bucketQuery", () => {
  const today = "2026-10-01";

  it("sem balde, só repassa o período", () => {
    expect(bucketQuery("", { dueFrom: "2026-09-01" }, today)).toEqual({
      empty: false,
      status: undefined,
      dueFrom: "2026-09-01",
      dueTo: undefined,
    });
  });

  it("atrasado é pendente com vencimento até ontem — atravessando o mês", () => {
    expect(bucketQuery("overdue", {}, today)).toMatchObject({
      status: ["PENDENTE"],
      dueTo: "2026-09-30",
    });
  });

  it("previsto é pendente de hoje em diante", () => {
    expect(bucketQuery("upcoming", {}, today)).toMatchObject({
      status: ["PENDENTE"],
      dueFrom: "2026-10-01",
    });
  });

  it("o corte do balde se intersecta com o período escolhido", () => {
    // O período começa depois de hoje: o "a partir de hoje" do balde não
    // pode puxar o início para trás.
    expect(
      bucketQuery("upcoming", { dueFrom: "2026-11-01", dueTo: "2026-12-31" }, today),
    ).toMatchObject({ dueFrom: "2026-11-01", dueTo: "2026-12-31" });
    expect(bucketQuery("overdue", { dueTo: "2026-08-31" }, today)).toMatchObject({
      dueTo: "2026-08-31",
    });
  });

  it("interseção sem dia nenhum é vazio, sem chamar o servidor", () => {
    expect(bucketQuery("overdue", { dueFrom: "2026-11-01" }, today)).toEqual({
      empty: true,
    });
  });

  it("recebido e cancelado não mexem nas datas", () => {
    expect(bucketQuery("paid", {}, today)).toMatchObject({ status: ["PAGO"] });
    expect(bucketQuery("cancelled", { dueTo: "2026-01-31" }, today)).toMatchObject({
      status: ["CANCELADO"],
      dueTo: "2026-01-31",
    });
  });
});
