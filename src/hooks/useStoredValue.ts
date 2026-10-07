"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Um valor lembrado no navegador (`localStorage`), como texto.
 *
 * - No HTML pré-gerado não existe `localStorage`: o servidor (e a hidratação)
 *   veem `null`, e o valor salvo entra logo depois — sem divergência de
 *   hidratação e sem `setState` dentro de efeito.
 * - Gravar avisa os outros componentes da mesma aba (o evento `storage` só
 *   chega às outras abas).
 * - Sem storage (aba privada, bloqueio): fica `null` e gravar não faz nada.
 */
const LOCAL_EVENT = "stored-value";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
};

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function useStoredValue(key: string): [string | null, (next: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const write = useCallback(
    (next: string | null) => {
      try {
        if (next === null) localStorage.removeItem(key);
        else localStorage.setItem(key, next);
      } catch {
        return;
      }
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key],
  );
  return [value, write];
}

/** Um parâmetro da URL atual, ou `null` (também no HTML pré-gerado). */
export function useUrlParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/**
 * Uma escolha entre opções conhecidas, lembrada no navegador e espelhada num
 * parâmetro da URL (para mandar o link direto). A URL vale sobre o salvo;
 * valor desconhecido cai no padrão.
 */
export function useStoredChoice<T extends string>(
  storageKey: string,
  urlParam: string,
  options: readonly T[],
  fallback: T,
): readonly [T, (next: T) => void] {
  const [stored, store] = useStoredValue(storageKey);
  const fromUrl = useUrlParam(urlParam);
  const pick = (value: string | null) => options.find((option) => option === value);
  const choice = pick(fromUrl) ?? pick(stored) ?? fallback;

  const choose = (next: T) => {
    // A URL primeiro: gravar avisa quem lê, e a releitura já pega o parâmetro novo.
    const url = new URL(window.location.href);
    url.searchParams.set(urlParam, next);
    window.history.replaceState(null, "", url);
    store(next);
  };
  return [choice, choose] as const;
}
