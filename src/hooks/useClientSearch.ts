"use client";

import { useEffect, useState } from "react";
import { clients as fetchClients } from "@/services/clientService";
import type { Clients } from "@/interfaces/Clients.interface";

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
const DEBOUNCE_MS = 400;
const MAX_SUGGESTIONS = 8;

export type UseClientSearchOptions = {
  /** Texto digitado pelo usuário. */
  query: string;
  /** Quando preenchido, a busca é suspensa (já há cliente vinculado). */
  linkedClientId?: string;
  enabled?: boolean;
};

export type UseClientSearchResult = {
  suggestions: Clients[];
  isSearching: boolean;
};

export function useClientSearch({
  query,
  linkedClientId,
  enabled = true,
}: UseClientSearchOptions): UseClientSearchResult {
  const [suggestions, setSuggestions] = useState<Clients[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const term = debouncedQuery.trim();

    if (!enabled || linkedClientId || term.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    // `active` evita que uma resposta antiga sobrescreva uma mais recente
    // (o usuário continua digitando enquanto a requisição está em voo).
    let active = true;
    setIsSearching(true);

    fetchClients({ searchTerm: term, pageNumber: 1, pageSize: MAX_SUGGESTIONS })
      .then((envelope) => {
        if (active) setSuggestions(envelope?.data ?? []);
      })
      .catch(() => {
        // O axiosService já notificou o erro; aqui só limpamos a lista.
        if (active) setSuggestions([]);
      })
      .finally(() => {
        if (active) setIsSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery, linkedClientId, enabled]);

  return { suggestions, isSearching };
}
