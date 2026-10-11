/**
 * Cache de páginas de uma lista, por consulta.
 *
 * A chave é a consulta inteira (filtros + página), não só a página: a página 2
 * de "Atrasado" e a página 2 sem filtro são respostas diferentes, e confundir
 * as duas mostraria linhas que o filtro não pediu.
 *
 * Limite de entradas porque a tela não tem fim: cada combinação de mês,
 * filtro e página vira uma chave, e quem passa a tarde navegando acumularia
 * todas. Ao estourar, sai a mais antiga — `Map` guarda a ordem de inserção, e
 * reler uma chave a move para o fim (é a recém-usada).
 */
type ListCache<V> = {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
  delete: (key: string) => void;
  clear: () => void;
  readonly size: number;
};

export function createListCache<V>(maxEntries = 50): ListCache<V> {
  const entries = new Map<string, V>();
  return {
    get(key) {
      if (!entries.has(key)) return undefined;
      const value = entries.get(key) as V;
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key, value) {
      entries.delete(key);
      entries.set(key, value);
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value as string;
        entries.delete(oldest);
      }
    },
    delete(key) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    },
  };
}

/** Chave estável de uma consulta: mesmos filtros e página, mesma chave. */
export const listKey = (params: unknown, page: number): string =>
  JSON.stringify([params, page]);

/**
 * Cache de requisições por chave — o único jeito de guardar resposta de API
 * no projeto (lista de clientes, trilha de situação, parcelas do acordo,
 * páginas da Carteira).
 *
 * - O que já voltou sai do cache (LRU de `maxEntries`).
 * - A mesma chave pedida de novo antes de voltar espera a **mesma** promessa:
 *   um clique duplo ou um efeito montado duas vezes não vira duas chamadas.
 * - Erro não fica guardado: a próxima tentativa chama de novo.
 * - `invalidate()` descarta tudo, e uma resposta que estava no ar quando isso
 *   aconteceu não volta para o cache (é de antes da mudança).
 */
export function createRequestCache<V>(maxEntries = 50) {
  const done = createListCache<V>(maxEntries);
  const inFlight = new Map<string, Promise<V>>();
  let generation = 0;

  return {
    peek: (key: string): V | undefined => done.get(key),

    load(key: string, fetcher: () => Promise<V>): Promise<V> {
      const cached = done.get(key);
      if (cached !== undefined) return Promise.resolve(cached);
      const pending = inFlight.get(key);
      if (pending) return pending;

      const startedAt = generation;
      const request = fetcher()
        .then((value) => {
          if (startedAt === generation) done.set(key, value);
          return value;
        })
        .finally(() => {
          if (inFlight.get(key) === request) inFlight.delete(key);
        });
      inFlight.set(key, request);
      return request;
    },

    /** Uma chave, ou tudo (sem argumento). */
    invalidate(key?: string): void {
      if (key !== undefined) {
        done.delete(key);
        inFlight.delete(key);
        return;
      }
      done.clear();
      inFlight.clear();
      generation += 1;
    },
  };
}

export type RequestCache<V> = ReturnType<typeof createRequestCache<V>>;

/**
 * Dedupe **sem memória**: a mesma chave pedida de novo enquanto a primeira
 * ainda está no ar espera a mesma promessa; terminada, a próxima chamada
 * busca de novo.
 *
 * É o que o detalhe de um registro precisa, e o cache acima não serve: o
 * StrictMode monta o painel duas vezes e o duplo clique pede duas, mas
 * reabrir depois tem que reler o valor atual — guardar a resposta mostraria o
 * registro como ele era antes da edição. Os painéis da Carteira e de
 * Pagamentos tinham cada um o seu `Map` para isso.
 */
export function createInFlight<V>(): (
  key: string,
  fetcher: () => Promise<V>,
) => Promise<V> {
  const pending = new Map<string, Promise<V>>();
  return (key, fetcher) => {
    const current = pending.get(key);
    if (current) return current;

    const request = fetcher().finally(() => {
      if (pending.get(key) === request) pending.delete(key);
    });
    pending.set(key, request);
    return request;
  };
}

const sessionCaches = new Set<{ invalidate: () => void }>();

/**
 * Cache que vive a sessão inteira (em módulo, entre telas) e some no logout:
 * dado de um escritório não pode aparecer para quem entrar depois na mesma aba.
 */
export function createSessionCache<V>(maxEntries = 50): RequestCache<V> {
  const cache = createRequestCache<V>(maxEntries);
  sessionCaches.add(cache);
  return cache;
}

/** Esvazia todos os caches de sessão — chamado no logout (real ou forçado). */
export function clearSessionCaches(): void {
  for (const cache of sessionCaches) cache.invalidate();
}
