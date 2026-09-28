"use client";

import { useEffect, useState } from "react";

import { usePermissoes } from "@/hooks/usePermissoes";
import { indexarPorId, listUsers } from "@/services/userService";

/**
 * Índice `id do usuário -> nome`, para a tela mostrar quem agiu.
 *
 * Os recursos gravam só o UUID de quem criou, editou ou mudou a situação. Até
 * existir `GET /users` não havia como traduzir isso, e a tela simplesmente
 * omitia a autoria — a informação estava no banco e em lugar nenhum.
 *
 * `includeInactive` por padrão, de propósito: registro antigo costuma estar
 * assinado por quem já saiu do escritório, e é justamente o registro antigo
 * que alguém vai abrir querendo saber quem foi. Filtrar os desativados aqui
 * devolveria UUID exatamente nos casos que motivam a pergunta. (O seletor de
 * *responsável*, quando existir, é outro caso: ali o desativado não deve
 * aparecer, e a chamada é outra.)
 *
 * A rota é de ADMIN/LAWYER. Para atendente nem chamamos — 403 previsível não
 * precisa de viagem à rede — e o índice fica vazio, o que devolve a tela ao
 * comportamento que ela tinha antes: sem nome, sem UUID, sem erro.
 */
export function useAutoresDoEscritorio(): Record<string, string> {
  const { podeListarUsuarios } = usePermissoes();
  const [indice, setIndice] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!podeListarUsuarios) return;

    // Evita gravar estado depois que o componente saiu da tela — abrir e
    // fechar a ficha rápido é comum, e o aviso do React sobre isso manda
    // procurar o problema em quem fechou, não em quem buscou.
    let ativo = true;

    void (async () => {
      try {
        const envelope = await listUsers({ includeInactive: true });
        if (ativo) setIndice(indexarPorId(envelope?.data));
      } catch {
        // Silêncio é a resposta certa: a autoria é enfeite de uma tela que
        // funciona sem ela. O `userService` já não mostra toast.
        if (ativo) setIndice({});
      }
    })();

    return () => {
      ativo = false;
    };
  }, [podeListarUsuarios]);

  return indice;
}
