"use client";

import { useMemo } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";

const STORAGE_KEY = "relatorios:ordem";

/** As visões na ordem salva: o que não existe mais sai, o que é novo vai para o fim. */
export function orderViews<V extends { id: string }>(views: readonly V[], order: readonly string[] | null): V[] {
  if (!order) return [...views];
  const byId = new Map(views.map((v) => [v.id, v]));
  const known = order.flatMap((id) => byId.get(id) ?? []);
  return [...known, ...views.filter((v) => !order.includes(v.id))];
}

/** A lista de ids com `id` levado para a posição `to` (limitada às pontas). */
export function moveId(ids: readonly string[], id: string, to: number): string[] {
  const rest = ids.filter((x) => x !== id);
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, id);
  return rest;
}

/**
 * A ordem das abas de Relatórios escolhida pelo usuário, lembrada por
 * navegador (`localStorage`), como a própria visão escolhida.
 *
 * Guarda só os `id`s. Ao ler, descarta o que não existe mais e põe no fim o
 * que é novo: uma visão criada depois não some só porque não estava na ordem
 * salva, e uma removida não deixa buraco.
 *
 * No HTML pré-gerado vale a ordem padrão; a salva entra na hidratação
 * (`useStoredValue`).
 */
export function useReportViewOrder<V extends { id: string }>(
  views: readonly V[],
) {
  const [raw, store] = useStoredValue(STORAGE_KEY);
  const order = useMemo(() => {
    try {
      const saved = JSON.parse(raw ?? "null");
      return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : null;
    } catch {
      return null; // valor corrompido: fica na ordem padrão
    }
  }, [raw]);

  const ordered = useMemo(() => orderViews(views, order), [order, views]);

  const save = (next: string[] | null) => store(next && JSON.stringify(next));

  /** Leva a visão `id` para a posição `to` (0 = primeira). */
  const move = (id: string, to: number) => save(moveId(ordered.map((v) => v.id), id, to));

  const isCustom = ordered.some((v, i) => v.id !== views[i]?.id);

  return { ordered, move, reset: () => save(null), isCustom };
}
