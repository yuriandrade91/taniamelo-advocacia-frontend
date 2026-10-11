import { describe, expect, it, vi } from "vitest";
import { clearClientsCache, clientsListCache } from "@/lib/clientsCache";

/**
 * O cache da listagem é um `createSessionCache` (as regras de cache estão
 * testadas em `requestCache.test`). O que se afirma aqui é o contrato com quem
 * grava cliente fora da lista: limpar obriga a lista a reler.
 */
describe("clearClientsCache", () => {
  it("depois de limpar, a mesma página é pedida de novo", async () => {
    const page = { items: [], total: 0, totalPages: 0 };
    const fetcher = vi.fn().mockResolvedValue(page);

    await clientsListCache.load("pagina-1", fetcher);
    await clientsListCache.load("pagina-1", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);

    clearClientsCache();
    await clientsListCache.load("pagina-1", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
