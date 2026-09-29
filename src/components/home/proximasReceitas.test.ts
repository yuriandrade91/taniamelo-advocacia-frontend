import { describe, expect, it } from "vitest";

import { LINHAS_DO_CARTAO, toRevenueItems } from "./proximasReceitas";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";

const parcela = (
  extra: Partial<OfficePaymentResponse>,
): OfficePaymentResponse =>
  ({
    id: "p-1",
    clientId: "c-1",
    clientName: "Maria Silva",
    description: "Atrasados",
    amount: 1000,
    dueDate: "2026-09-10",
    overdue: false,
    status: "Pendente",
    ...extra,
  }) as OfficePaymentResponse;

describe("toRevenueItems", () => {
  it("usa o mesmo balde da tabela de Pagamentos", () => {
    // Se a linha diz "Atrasado" aqui e "A vencer" lá, nenhuma das duas telas
    // serve para decidir nada.
    const itens = toRevenueItems([
      parcela({ id: "a", overdue: true }),
      parcela({ id: "b", overdue: false }),
      parcela({ id: "c", status: "Pago" }),
    ]);
    expect(itens.map((i) => i.status)).toEqual([
      "ATRASADO",
      "PENDENTE",
      "PAGO",
    ]);
  });

  it("cancelada não entra: o cartão é sobre o que ainda vai acontecer", () => {
    const itens = toRevenueItems([
      parcela({ id: "a", status: "Cancelado" }),
      parcela({ id: "b" }),
    ]);
    expect(itens.map((i) => i.id)).toEqual(["b"]);
  });

  it("mostra o nome do cliente, não a descrição da parcela", () => {
    // Sem ele o cartão vira uma lista de "Atrasados", "Atrasados",
    // "Atrasados" — verdadeira e inútil.
    expect(toRevenueItems([parcela({})])[0].name).toBe("Maria Silva");
  });

  it("sem nome de cliente usa um travessão, não 'undefined'", () => {
    expect(toRevenueItems([parcela({ clientName: undefined })])[0].name).toBe(
      "—",
    );
  });

  it("formata a data no padrão brasileiro", () => {
    expect(toRevenueItems([parcela({ dueDate: "2026-09-10" })])[0].date).toBe(
      "10/09/2026",
    );
  });

  it("corta no tamanho do cartão — cancelada descartada não ocupa vaga", () => {
    const muitas = [
      parcela({ id: "x", status: "Cancelado" }),
      ...Array.from({ length: 10 }, (_, i) => parcela({ id: `p${i}` })),
    ];
    const itens = toRevenueItems(muitas);
    expect(itens).toHaveLength(LINHAS_DO_CARTAO);
    expect(itens.map((i) => i.id)).toEqual(["p0", "p1", "p2", "p3"]);
  });

  it("lista vazia não explode — o cartão tem estado próprio para isso", () => {
    expect(toRevenueItems([])).toEqual([]);
  });
});
