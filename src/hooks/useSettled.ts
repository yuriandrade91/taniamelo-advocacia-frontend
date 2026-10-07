"use client";

import { useEffect, useState } from "react";

/**
 * Várias leituras independentes (`Promise.allSettled`), carregadas quando a
 * `key` muda — uma falha não esconde as que responderam.
 *
 * - `null` enquanto a `key` atual não respondeu: "carregando" é derivado, sem
 *   estado a manter em sincronia, e resposta atrasada de outra `key` não entra.
 * - `version` relê a mesma `key` (depois de gravar algo): o resultado anterior
 *   fica na tela até o novo chegar, sem piscar.
 * - `key` `null` = não carregar (sem permissão, por exemplo).
 */
export function useSettled<T>(
  key: string | null,
  load: () => Promise<PromiseSettledResult<T>[]>,
  version = 0,
): PromiseSettledResult<T>[] | null {
  const [loaded, setLoaded] = useState<{ key: string; results: PromiseSettledResult<T>[] } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let active = true;
    void load().then((results) => {
      if (active) setLoaded({ key, results });
    });
    return () => {
      active = false;
    };
    // `load` é recriado a cada render; o que muda a leitura é `key`/`version`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  return loaded && loaded.key === key ? loaded.results : null;
}

/** O valor de uma leitura que deu certo, ou `fallback`. */
export const settledValue = <T,>(result: PromiseSettledResult<T> | undefined, fallback: T): T =>
  result?.status === "fulfilled" ? result.value : fallback;
