"use client";

import { useEffect, useState } from "react";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { ClientRequestStageHistory, ClientSituationHistory } from "@/interfaces/client/Client.interface";
import { clientRequestStageHistory, clientSituationHistory } from "@/services/clientService";
import { createSessionCache } from "@/lib/requestCache";

/**
 * As trilhas de um cliente — a da situação (esteira do escritório) e a da
 * etapa no INSS —, buscadas **só quando é preciso** — ao abrir o cartão de
 * mudar etapa daquele cliente — e guardadas por cliente.
 *
 * - Reabrir o cartão do mesmo cliente não chama a API de novo.
 * - Duas aberturas antes de a primeira voltar dividem a mesma requisição.
 * - A entrada de um cliente sai quando a etapa dele muda
 *   (`invalidate…Trail(id)`), e tudo sai quando a lista recarrega
 *   (`invalidate…Trail()`), porque a ficha pode ter editado qualquer um.
 *
 * Erro não fica guardado e não trava o cartão: sem trilha, ele só não marca
 * etapas puladas nem mostra as datas.
 */

/** A trilha inteira cabe numa página: o backend corta em 100 por página. */
const TRAIL_PAGE_SIZE = 100;

type HistoryFetcher<T> = (
  clientId: string,
  params: { pageSize: number },
) => Promise<ApiEnvelope<T[]> | undefined>;

function createTrail<T>(fetchHistory: HistoryFetcher<T>) {
  /** Referência estável para "sem trilha": não recria um array a cada render. */
  const noTrail: T[] = [];
  const trails = createSessionCache<T[]>();

  const loadTrail = (clientId: string) =>
    trails.load(clientId, () =>
      fetchHistory(clientId, { pageSize: TRAIL_PAGE_SIZE }).then((envelope) => envelope?.data ?? []),
    );

  const invalidate = (clientId?: string) => trails.invalidate(clientId);

  /** A trilha do cliente enquanto `enabled`: `null` enquanto carrega, `[]` em erro ou sem cliente. */
  function useTrail(clientId: string | undefined, enabled: boolean): T[] | null {
    const [loaded, setLoaded] = useState<{ id: string; trail: T[] } | null>(null);

    useEffect(() => {
      if (!enabled || !clientId) return;
      let active = true;
      loadTrail(clientId)
        .then((trail) => {
          if (active) setLoaded({ id: clientId, trail });
        })
        .catch(() => {
          // Sem trilha o cartão só não marca puladas nem datas; o toast já saiu.
          if (active) setLoaded({ id: clientId, trail: noTrail });
        });
      return () => {
        active = false;
      };
    }, [clientId, enabled]);

    if (!clientId) return noTrail;
    return loaded && loaded.id === clientId ? loaded.trail : null;
  }

  return { useTrail, invalidate };
}

const situationTrail = createTrail<ClientSituationHistory>(clientSituationHistory);
export const useSituationTrail = situationTrail.useTrail;
export const invalidateSituationTrail = situationTrail.invalidate;

const requestStageTrail = createTrail<ClientRequestStageHistory>(clientRequestStageHistory);
export const useRequestStageTrail = requestStageTrail.useTrail;
export const invalidateRequestStageTrail = requestStageTrail.invalidate;
