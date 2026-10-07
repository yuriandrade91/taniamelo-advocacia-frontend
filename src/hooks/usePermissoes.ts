"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  podeDestruir,
  podeListarUsuarios,
  podeVerFinanceiro,
  podeVerSenhaDoInss,
} from "@/lib/permissions";

export type Permissoes = {
  podeDestruir: boolean;
  podeVerSenhaDoInss: boolean;
  podeListarUsuarios: boolean;
  /** Só ADMIN — advogado também não vê. Ver `podeVerFinanceiro` em permissions. */
  podeVerFinanceiro: boolean;
};

/** As quatro permissões como texto ("1010"): snapshot estável para comparar por valor. */
const readKey = () =>
  [podeDestruir(), podeVerSenhaDoInss(), podeListarUsuarios(), podeVerFinanceiro()]
    .map(Number)
    .join("");

/** Outra aba que entra ou sai muda a sessão: o evento `storage` avisa. */
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * Permissões do usuário da sessão, para a UI decidir o que mostrar.
 *
 * A origem é o `localStorage`, que não existe no servidor: o HTML pré-gerado
 * sai com tudo `false` (`getServerSnapshot`) e a hidratação lê a sessão logo
 * em seguida. Em navegação dentro do app a leitura é imediata — a tela já
 * nasce sabendo, sem um render com tudo `false` que dispararia chamadas duas
 * vezes.
 */
export function usePermissoes(): Permissoes {
  const key = useSyncExternalStore(subscribe, readKey, () => "0000");
  return useMemo(() => {
    const [destruir, senha, usuarios, financeiro] = key.split("").map((c) => c === "1");
    return {
      podeDestruir: destruir,
      podeVerSenhaDoInss: senha,
      podeListarUsuarios: usuarios,
      podeVerFinanceiro: financeiro,
    };
  }, [key]);
}
