import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Integração pausada num ambiente (`NEXT_PUBLIC_PENDING_INTEGRATIONS`): a
 * leitura falha com a mensagem certa (a tela já sabe mostrar), a lista vem
 * vazia e a escrita avisa e estoura — nada sai para a rede.
 *
 * O conjunto pausado é lido ao carregar o módulo, então os serviços entram
 * depois de o ambiente mudar.
 */
vi.mock("@/services/axiosService", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@heroui/react", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), info: vi.fn(), warning: vi.fn(), danger: vi.fn() }),
}));

let revenue: typeof import("@/services/officeRevenueService");
let expense: typeof import("@/services/officeExpenseService");
let payment: typeof import("@/services/officePaymentService");
let users: typeof import("@/services/userService");
let cep: typeof import("@/services/cepService");
let pending: typeof import("@/services/pendingIntegration");
let axios: { get: ReturnType<typeof vi.fn> };
let toast: { danger: ReturnType<typeof vi.fn> };

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_PENDING_INTEGRATIONS", "Revenues, expenses,payments , cep,users-me");
  vi.resetModules();
  revenue = await import("@/services/officeRevenueService");
  expense = await import("@/services/officeExpenseService");
  payment = await import("@/services/officePaymentService");
  users = await import("@/services/userService");
  cep = await import("@/services/cepService");
  pending = await import("@/services/pendingIntegration");
  axios = (await import("@/services/axiosService")).default as never;
  toast = (await import("@heroui/react")).toast as never;
});

const range = { from: "2026-01", to: "2026-06" } as never;

describe("integração pausada", () => {
  it("o grupo é reconhecido sem diferença de caixa e de espaço", () => {
    expect(pending.pendingIntegration("revenues")).toBe(true);
    expect(pending.pendingIntegration("PAYMENTS")).toBe(true);
    expect(pending.pendingIntegration("clients")).toBe(false);
  });

  it("listas e séries vêm vazias", async () => {
    for (const list of [revenue.listOfficeRevenues({}), expense.listOfficeExpenses({}), payment.listOfficePayments({})]) {
      await expect(list).resolves.toMatchObject({ success: true, data: [] });
    }
    for (const series of [revenue.getOfficeRevenueTimeline(range), expense.getOfficeExpenseTimeline(range), payment.getOfficePaymentTimeline(range)]) {
      await expect(series).resolves.toMatchObject({ data: [] });
    }
  });

  it("leituras falham com o envelope que a tela lê", async () => {
    const reads = [
      revenue.getOfficeRevenue("r1"),
      revenue.getOfficeRevenueSummary({}),
      expense.getOfficeExpense("e1"),
      expense.getOfficeExpenseSummary({}),
      payment.getOfficePaymentSummary({}),
      users.myProfile(),
    ];
    for (const read of reads) {
      await expect(read).rejects.toMatchObject({
        isPendingIntegration: true,
        response: { status: 501, data: { errors: [{ code: "INTEGRACAO_PENDENTE" }] } },
      });
    }
  });

  it("escritas avisam (menos a silenciosa) e estouram", async () => {
    const writes = [
      revenue.createOfficeRevenue({} as never),
      revenue.updateOfficeRevenue("r1", {} as never),
      revenue.deleteOfficeRevenue("r1"),
      expense.createOfficeExpense({} as never),
      expense.updateOfficeExpense("e1", {} as never),
      expense.deleteOfficeExpense("e1"),
      users.updateMyProfile({} as never),
    ];
    for (const write of writes) await expect(write).rejects.toBeInstanceOf(Error);
    expect(toast.danger).toHaveBeenCalledTimes(writes.length);

    await expect(users.changeMyPassword({} as never)).rejects.toBeInstanceOf(Error);
    expect(toast.danger).toHaveBeenCalledTimes(writes.length);
  });

  it("CEP pausado nem consulta", async () => {
    await expect(cep.lookupCep("30140-000")).resolves.toEqual({ status: "unavailable" });
    expect(axios.get).not.toHaveBeenCalled();
  });
});
