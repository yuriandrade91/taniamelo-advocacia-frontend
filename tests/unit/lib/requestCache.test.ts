import { describe, expect, it, vi } from "vitest";
import {
  clearSessionCaches,
  createInFlight,
  createListCache,
  createRequestCache,
  createSessionCache,
  listKey,
} from "@/lib/requestCache";

describe("createListCache", () => {
  it("devolve o que foi guardado e nada para chave desconhecida", () => {
    const cache = createListCache<number>();
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
  });

  it("ao estourar o limite, descarta a menos usada recentemente", () => {
    const cache = createListCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // "a" vira a recém-usada; "b" passa a ser a mais antiga
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
    expect(cache.size).toBe(2);
  });

  it("clear esvazia tudo", () => {
    const cache = createListCache<number>();
    cache.set("a", 1);
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});

describe("listKey", () => {
  it("mesma consulta, mesma chave; outra página, outra chave", () => {
    const params = { dueFrom: "2026-10-01", status: ["PENDENTE"] };
    expect(listKey(params, 1)).toBe(listKey({ ...params }, 1));
    expect(listKey(params, 1)).not.toBe(listKey(params, 2));
  });

  it("filtro diferente na mesma página é outra chave", () => {
    expect(listKey({ status: ["PAGO"] }, 2)).not.toBe(
      listKey({ status: ["PENDENTE"] }, 2),
    );
  });
});

describe("createRequestCache", () => {
  it("a mesma chave no ar vira uma requisição só; depois, sai do cache", async () => {
    const cache = createRequestCache<number>();
    const fetcher = vi.fn(() => Promise.resolve(1));
    await Promise.all([cache.load("k", fetcher), cache.load("k", fetcher)]);
    await cache.load("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.peek("k")).toBe(1);
  });

  it("erro não fica guardado", async () => {
    const cache = createRequestCache<number>();
    await expect(cache.load("k", () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(await cache.load("k", () => Promise.resolve(2))).toBe(2);
  });

  it("invalidar uma chave relê só ela", async () => {
    const cache = createRequestCache<number>();
    await cache.load("a", () => Promise.resolve(1));
    await cache.load("b", () => Promise.resolve(2));
    cache.invalidate("a");
    expect(cache.peek("a")).toBeUndefined();
    expect(cache.peek("b")).toBe(2);
  });

  it("resposta que estava no ar quando tudo foi invalidado não volta para o cache", async () => {
    const cache = createRequestCache<number>();
    let resolve!: (n: number) => void;
    const request = cache.load("k", () => new Promise<number>((r) => (resolve = r)));
    cache.invalidate();
    resolve(1);
    await request;
    expect(cache.peek("k")).toBeUndefined();
  });
});

describe("caches de sessão", () => {
  it("o logout esvazia todos", async () => {
    const a = createSessionCache<number>();
    const b = createSessionCache<string>();
    await a.load("x", () => Promise.resolve(1));
    await b.load("y", () => Promise.resolve("ok"));
    clearSessionCaches();
    expect(a.peek("x")).toBeUndefined();
    expect(b.peek("y")).toBeUndefined();
  });
});

describe("createInFlight", () => {
  it("junta as chamadas que estão no ar e busca de novo depois", async () => {
    const dedupe = createInFlight<number>();
    const fetcher = vi.fn(() => Promise.resolve(1));

    const [a, b] = await Promise.all([
      dedupe("k", fetcher),
      dedupe("k", fetcher),
    ]);
    expect([a, b]).toEqual([1, 1]);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Terminada a primeira, a próxima relê: o detalhe pode ter mudado.
    await dedupe("k", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("chaves diferentes não se misturam", async () => {
    const dedupe = createInFlight<string>();
    const [a, b] = await Promise.all([
      dedupe("a", () => Promise.resolve("a")),
      dedupe("b", () => Promise.resolve("b")),
    ]);
    expect([a, b]).toEqual(["a", "b"]);
  });

  it("erro não deixa a chave presa", async () => {
    const dedupe = createInFlight<number>();
    await expect(dedupe("k", () => Promise.reject(new Error("falhou")))).rejects.toThrow();
    await expect(dedupe("k", () => Promise.resolve(7))).resolves.toBe(7);
  });
});
