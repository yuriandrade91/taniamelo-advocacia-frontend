"use client";

import { useEffect, useState } from "react";
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

/**
 * Permissões do usuário da sessão, para a UI decidir o que mostrar.
 *
 * Lê em `useEffect`, e não durante o render, porque a origem é o
 * `localStorage`: no servidor ele não existe, e ler direto faria o HTML do
 * servidor divergir do primeiro render do cliente (erro de hidratação do
 * React). O preço é um instante com tudo `false` — que esconde o botão em vez
 * de piscá-lo e tirá-lo da tela, ordem menos ruim para quem está olhando.
 */
export function usePermissoes(): Permissoes {
  const [permissoes, setPermissoes] = useState<Permissoes>({
    podeDestruir: false,
    podeVerSenhaDoInss: false,
    podeListarUsuarios: false,
    podeVerFinanceiro: false,
  });

  useEffect(() => {
    setPermissoes({
      podeDestruir: podeDestruir(),
      podeVerFinanceiro: podeVerFinanceiro(),
      podeVerSenhaDoInss: podeVerSenhaDoInss(),
      podeListarUsuarios: podeListarUsuarios(),
    });
  }, []);

  return permissoes;
}
