import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O contrato que a Carteira depende da receita do escritório.
 *
 * Não se testa "chamou axios". Testa-se o que já deu errado nesta tela: a
 * receita batendo na rota de pagamentos (que é dinheiro do cliente), o resumo
 * indo com recorte de vencimento quando o card é de caixa, e o erro de leitura
 * virando silêncio — que numa tela financeira aparece como saldo zero, e zero
 * é um número.
 */

vi.mock("@/services/axiosService", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import {
  createOfficeRevenue,
  getOfficeRevenueSummary,
  getOfficeRevenueTimeline,
  listOfficeRevenues,
} from "@/services/officeRevenueService";

const get = vi.mocked(axiosInstance.get);
const post = vi.mocked(axiosInstance.post);

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { success: true, data: [] } });
  post.mockResolvedValue({ data: { success: true, data: {} } });
});

/**
 * Estes testes voltaram a valer.
 *
 * A pausa é por ambiente (`NEXT_PUBLIC_PENDING_INTEGRATIONS`), e o Vitest roda
 * sem ela — então o serviço chama o axios como sempre chamou, e a asserção é
 * sobre a requisição de verdade. É o comportamento que se quer: o contrato
 * continua verificado em toda execução, mesmo com a rota pausada em algum
 * servidor.
 */
describe("a rota", () => {
  it("é /revenues, e nunca /payments — aquela é o dinheiro do cliente", async () => {
    await listOfficeRevenues();
    await getOfficeRevenueSummary();
    await getOfficeRevenueTimeline({ from: "2026-01-01", to: "2026-06-30" });
    await createOfficeRevenue({
      description: "Honorário de êxito",
      amount: 1200,
      dueDate: "2026-03-10",
    });

    const calls = [
      ...get.mock.calls.map((c) => c[0]),
      ...post.mock.calls.map((c) => c[0]),
    ];
    // Sufixo, e não igualdade: o host vem da env e muda por ambiente; o que
    // não pode mudar é o recurso.
    expect(calls.map((url) => url.replace(/^.*\/api\/v1/, ""))).toEqual([
      "/revenues",
      "/revenues/summary",
      "/revenues/timeline",
      "/revenues",
    ]);
    expect(calls.some((url) => url.includes("/payments"))).toBe(false);
  });
});

describe("os filtros", () => {
  it("repassa o recorte de caixa como veio — quem escolhe competência ou caixa é a tela", async () => {
    await getOfficeRevenueSummary({
      paidFrom: "2026-03-01",
      paidTo: "2026-03-31",
    });

    expect(get.mock.calls[0][1]).toMatchObject({
      params: { paidFrom: "2026-03-01", paidTo: "2026-03-31" },
    });
  });

  it("não inventa recorte quando a tela não pede nenhum", async () => {
    await listOfficeRevenues();
    expect(get.mock.calls[0][1]).toMatchObject({ params: undefined });
  });
});

describe("erro de leitura", () => {
  it("não é silenciado: saldo zerado sem aviso é pior que erro na tela", async () => {
    await listOfficeRevenues();
    await getOfficeRevenueSummary();
    await getOfficeRevenueTimeline({ from: "2026-01-01", to: "2026-06-30" });

    for (const [, config] of get.mock.calls) {
      expect(config).not.toHaveProperty("skipErrorToast", true);
    }
  });

  it("propaga a falha em vez de devolver lista vazia", async () => {
    get.mockRejectedValueOnce(new Error("403"));
    await expect(listOfficeRevenues()).rejects.toThrow("403");
  });
});
