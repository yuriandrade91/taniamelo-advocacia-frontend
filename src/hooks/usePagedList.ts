"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ListPage } from "@/lib/pagination";
import { createRequestCache, listKey, type RequestCache } from "@/lib/requestCache";

/**
 * Uma lista paginada do servidor que só vai buscar quando precisa.
 *
 * - **Página presa à consulta**: mudou um filtro (outra `params`), a página
 *   volta a 1 no mesmo render — sem uma requisição com a página velha antes.
 * - **Passou do fim** (excluiu a última linha da última página): pede a
 *   última que existe, em vez de mostrar "nenhum resultado".
 * - **Cache por consulta e página**: voltar a uma aba ou página já vista lê
 *   da memória; a mesma consulta pedida duas vezes no ar vira uma só
 *   (`createRequestCache`). Erro não fica guardado.
 * - **Sob demanda**: com `enabled` falso não busca (aba fechada, sem
 *   permissão). `params` `null` = consulta sem resultado possível: lista
 *   vazia, sem requisição.
 * - Resposta de uma consulta antiga não pisa na nova.
 * - **O rodapé não salta**: enquanto a página nova da mesma consulta carrega,
 *   `total` e `totalPages` continuam os da última resposta.
 * - `cache` externo (`createSessionCache`) para a lista que sobrevive à
 *   navegação — sem ele, o cache é desta montagem.
 *
 * `invalidate()` descarta o cache e relê — chamado depois de gravar ou
 * excluir. Enquanto relê, as linhas atuais ficam na tela.
 */


type Loaded<T> = ListPage<T> & { key: string; queryKey: string };

export function usePagedList<T, P>({
  enabled = true,
  params,
  fetchPage,
  cache: sharedCache,
}: {
  enabled?: boolean;
  params: P | null;
  fetchPage: (params: P, page: number) => Promise<ListPage<T>>;
  cache?: RequestCache<ListPage<T>>;
}) {
  const [ownCache] = useState(() => createRequestCache<ListPage<T>>());
  const cache = sharedCache ?? ownCache;
  // A função muda de identidade a cada render; o que importa é a consulta.
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });

  const queryKey = listKey(params, 0);
  const [paging, setPaging] = useState({ key: "", page: 1 });
  const page = paging.key === queryKey ? paging.page : 1;
  const key = listKey(params, page);

  /** Muda só para forçar nova leitura depois de `invalidate`. */
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [failure, setFailure] = useState<{ key: string; reason: unknown } | null>(null);

  useEffect(() => {
    if (!enabled || params === null) return;
    let active = true;
    cache.load(key, () => fetchRef.current(params, page)).then(
      (result) => {
        if (!active) return;
        if (result.totalPages > 0 && page > result.totalPages) {
          setPaging({ key: queryKey, page: result.totalPages });
          return;
        }
        setLoaded({ ...result, key, queryKey });
        setFailure(null);
      },
      (reason: unknown) => {
        if (active) setFailure({ key, reason });
      },
    );
    return () => {
      active = false;
    };
    // `params` e `page` entram pela `key`, a forma estável deles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, version, cache]);

  const invalidate = useCallback(() => {
    cache.invalidate();
    setVersion((v) => v + 1);
  }, [cache]);

  const isEmptyQuery = params === null;
  const failed = !isEmptyQuery && failure?.key === key;
  // Página já vista sai do cache já no render: voltar a ela não pisca o carregando.
  const cached = loaded?.key === key ? loaded : cache.peek(key);
  const current = isEmptyQuery || failed ? null : cached;
  const lastOfQuery = !isEmptyQuery && loaded?.queryKey === queryKey ? loaded : null;
  return {
    items: current?.items ?? [],
    total: current?.total ?? lastOfQuery?.total ?? 0,
    totalPages: current?.totalPages ?? lastOfQuery?.totalPages ?? 0,
    isLoading: enabled && !isEmptyQuery && !failed && !cached,
    failed,
    /** O motivo da falha (ex.: para distinguir 404 de erro). */
    failureReason: failed ? failure?.reason : undefined,
    page,
    setPage: (next: number) => setPaging({ key: queryKey, page: next }),
    invalidate,
  };
}
