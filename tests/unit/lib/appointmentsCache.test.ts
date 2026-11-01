import { describe, expect, it, vi } from "vitest";
import { appointmentsListCache, clearAppointmentsCache } from "@/lib/appointmentsCache";

/**
 * O cache dos meses da Agenda é um `createSessionCache` (as regras estão em
 * `requestCache.test`). Aqui, o contrato com quem grava um compromisso:
 * limpar obriga a lista a reler.
 */
describe("clearAppointmentsCache", () => {
  it("depois de limpar, o mesmo mês é pedido de novo", async () => {
    const page = { items: [], total: 0, totalPages: 1 };
    const fetcher = vi.fn().mockResolvedValue(page);

    await appointmentsListCache.load("2026-11", fetcher);
    await appointmentsListCache.load("2026-11", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    clearAppointmentsCache();
    await appointmentsListCache.load("2026-11", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
