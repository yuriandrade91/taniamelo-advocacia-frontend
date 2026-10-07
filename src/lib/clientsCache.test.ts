import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { Clients } from "@/interfaces/Clients.interface";
import { clearClientsCache, getCachedClients, loadClients } from "./clientsCache";

const envelope = (n: number) => ({ data: [], pagination: { totalRecords: n } }) as unknown as ApiEnvelope<Clients[]>;

describe("loadClients", () => {
  beforeEach(() => clearClientsCache());

  it("duas chamadas da mesma chave em andamento viram uma requisição só", async () => {
    const fetcher = vi.fn(() => Promise.resolve(envelope(1)));
    const [a, b] = await Promise.all([loadClients("k", fetcher), loadClients("k", fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it("depois de voltar, a chave sai do cache, sem nova chamada", async () => {
    const fetcher = vi.fn(() => Promise.resolve(envelope(1)));
    await loadClients("k", fetcher);
    await loadClients("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("chaves diferentes (outro filtro ou página) chamam cada uma a sua", async () => {
    const fetcher = vi.fn(() => Promise.resolve(envelope(1)));
    await Promise.all([loadClients("a", fetcher), loadClients("b", fetcher)]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("erro não fica guardado: a próxima tentativa chama de novo", async () => {
    const failing = vi.fn(() => Promise.reject(new Error("falhou")));
    await expect(loadClients("k", failing)).rejects.toThrow("falhou");
    const ok = vi.fn(() => Promise.resolve(envelope(2)));
    await loadClients("k", ok);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("resposta que chega depois de limpar o cache não volta para ele", async () => {
    let resolve!: (e: ApiEnvelope<Clients[]>) => void;
    const slow = () => new Promise<ApiEnvelope<Clients[]>>((r) => (resolve = r));
    const request = loadClients("k", slow);
    clearClientsCache();
    resolve(envelope(1));
    await request;
    expect(getCachedClients("k")).toBeUndefined();
  });
});
