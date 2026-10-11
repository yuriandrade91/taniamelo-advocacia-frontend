"use client";

import { useEffect, useState } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { clients as fetchClients } from "@/services/clientService";
import type { ClientListItem } from "@/interfaces/client/Client.interface";

/**
 * Busca de clientes por nome, com debounce.
 *
 * Existe para tirar o I/O de dentro dos componentes de campo: um componente
 * cujo trabalho é renderizar `<input>` não deveria abrir conexão HTTP — isso o
 * torna impossível de renderizar isolado e acopla um formulário de agenda ao
 * serviço de clientes.
 *
 * A busca é suprimida quando já existe um `linkedClientId`: nesse caso o texto
 * do campo é o nome do cliente vinculado, e consultar de novo só produziria a
 * sugestão que já está selecionada.
 */

/** Caracteres mínimos antes de consultar a API. */
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 8;

type UseClientSearchOptions = {
  /** Texto digitado pelo usuário. */
  query: string;
  /** Quando preenchido, a busca é suspensa (já há cliente vinculado). */
  linkedClientId?: string;
  enabled?: boolean;
};

type UseClientSearchResult = {
  suggestions: ClientListItem[];
  isSearching: boolean;
};

export function useClientSearch({
  query,
  linkedClientId,
  enabled = true,
}: UseClientSearchOptions): UseClientSearchResult {
  const term = useDebouncedValue(query.trim());
  const active = enabled && !linkedClientId && term.length >= MIN_QUERY_LENGTH;
  /** A resposta marcada com o termo que a pediu: resposta de termo antigo não vale. */
  const [result, setResult] = useState<{ term: string; suggestions: ClientListItem[] } | null>(null);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    fetchClients({ searchTerm: term, pageNumber: 1, pageSize: MAX_SUGGESTIONS })
      // O axiosService já notificou o erro; aqui a lista só fica vazia.
      .then((envelope) => envelope?.data ?? [], () => [])
      .then((suggestions) => {
        if (alive) setResult({ term, suggestions });
      });
    return () => {
      alive = false;
    };
  }, [active, term]);

  const isCurrent = active && result?.term === term;
  return {
    suggestions: isCurrent ? result.suggestions : [],
    isSearching: active && !isCurrent,
  };
}
