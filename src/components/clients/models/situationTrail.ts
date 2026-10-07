"use client";

import { useEffect, useState } from "react";
import type { ClientSituationHistory } from "@/interfaces/client/Client.interface";
import { clientSituationHistory } from "@/services/clientService";
import { createSessionCache } from "@/lib/requestCache";

/**
 * Trilha de situação de um cliente, buscada **só quando é preciso** — ao
 * abrir o cartão de mudar etapa daquele cliente — e guardada por cliente.
 *
 * - Reabrir o cartão do mesmo cliente não chama a API de novo.
 * - Duas aberturas antes de a primeira voltar dividem a mesma requisição.
 * - A entrada de um cliente sai quando a situação dele muda
 *   (`invalidateSituationTrail(id)`), e tudo sai quando a lista recarrega
 *   (`invalidateSituationTrail()`), porque a ficha pode ter editado qualquer um.
 *
 * Erro não fica guardado e não trava o cartão: sem trilha, ele só não marca
 * etapas puladas.
 */

/** A trilha inteira cabe numa página: o backend corta em 100 por página. */
const TRAIL_PAGE_SIZE = 100;

/** Referência estável para "sem trilha": não recria um array a cada render. */
const NO_TRAIL: ClientSituationHistory[] = [];

const trails = createSessionCache<ClientSituationHistory[]>();

const loadTrail = (clientId: string) =>
  trails.load(clientId, () =>
    clientSituationHistory(clientId, { pageSize: TRAIL_PAGE_SIZE }).then((envelope) => envelope?.data ?? []),
  );

export const invalidateSituationTrail = (clientId?: string) => trails.invalidate(clientId);

/** A trilha do cliente enquanto `enabled`; `[]` antes de chegar ou em erro. */
export function useSituationTrail(clientId: string | undefined, enabled: boolean) {
  const [loaded, setLoaded] = useState<{ id: string; trail: ClientSituationHistory[] } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled || !clientId) return;
    let active = true;
    loadTrail(clientId)
      .then((trail) => {
        if (active) setLoaded({ id: clientId, trail });
      })
      .catch(() => {
        // Sem trilha o cartão só não marca etapas puladas; o toast já saiu.
      });
    return () => {
      active = false;
    };
  }, [clientId, enabled]);

  return loaded && loaded.id === clientId ? loaded.trail : NO_TRAIL;
}
