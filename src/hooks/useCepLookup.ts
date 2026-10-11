"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CepLookupResponse,
  isCompleteCep,
  lookupCep,
} from "@/services/cepService";
import { CEP_MESSAGES } from "@/lib/cepAutofill";

type CepLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

/**
 * Busca o endereço quando o CEP fica completo.
 *
 * Dispara **no evento de digitação**, não num efeito sobre o valor: um efeito
 * consultaria também ao abrir a ficha de um cliente já gravado e sobrescreveria
 * a rua que alguém corrigiu à mão. Aqui só consulta quem acabou de digitar.
 *
 * Duas proteções contra resposta fora de ordem e consulta repetida:
 * - guarda o último CEP pedido e descarta a resposta de um anterior — quem
 *   corrige um dígito não pode ter o endereço do CEP errado chegando depois;
 * - não repete a consulta do mesmo CEP (apagar e redigitar o último dígito
 *   gastaria cota para a mesma resposta).
 */
export function useCepLookup(onFound: (address: CepLookupResponse) => void) {
  const [state, setState] = useState<CepLookupState>({ status: "idle" });
  const lastRequested = useRef<string | null>(null);
  // A seção recria o callback a cada render; a consulta em voo precisa chamar
  // o mais recente, senão aplicaria o CEP sobre valores de um render antigo.
  const onFoundRef = useRef(onFound);
  useEffect(() => {
    onFoundRef.current = onFound;
  });

  const handleCepChange = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!isCompleteCep(digits)) {
      // CEP incompleto: o aviso do anterior não vale mais para este valor.
      lastRequested.current = null;
      setState({ status: "idle" });
      return;
    }
    if (lastRequested.current === digits) return;

    lastRequested.current = digits;
    setState({ status: "loading" });

    void lookupCep(digits).then((result) => {
      if (lastRequested.current !== digits) return;

      switch (result.status) {
        case "found":
          // Quem chama guarda o endereço junto dos valores do formulário: é de
          // lá que sai a trava dos campos (ver `isCepLocked`). Guardar aqui
          // perderia a trava sempre que a seção desmontasse — trocar de aba.
          onFoundRef.current(result.address);
          setState({ status: "idle" });
          return;
        case "not-found":
          setState({ status: "error", message: CEP_MESSAGES.notFound });
          return;
        case "rate-limited":
          // Libera a repetição: passado o prazo, o mesmo CEP precisa poder
          // ser consultado de novo.
          lastRequested.current = null;
          setState({ status: "error", message: result.message });
          return;
        case "unavailable":
          lastRequested.current = null;
          setState({ status: "error", message: CEP_MESSAGES.unavailable });
          return;
        case "invalid":
          // A máscara e a regra do campo já cobrem; nada a acrescentar.
          setState({ status: "idle" });
          return;
      }
    });
  }, []);

  return {
    state,
    handleCepChange,
    /** Texto de apoio sob o campo enquanto a consulta corre. */
    hint: state.status === "loading" ? CEP_MESSAGES.loading : undefined,
    /** Aviso de consulta que não preencheu — não é erro de validação. */
    notice: state.status === "error" ? state.message : undefined,
  };
}
