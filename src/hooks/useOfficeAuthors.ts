"use client";

import { useEffect, useState } from "react";

import { usePermissions } from "@/hooks/usePermissions";
import { indexById, listUsers } from "@/services/userService";
import { createSessionCache } from "@/lib/requestCache";

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
/** O índice muda raramente (o front não cria usuário): uma busca por sessão. */
const authors = createSessionCache<Record<string, string>>(1);

export function useOfficeAuthors(): Record<string, string> {
  const { canListUsers } = usePermissions();
  const [indice, setIndice] = useState<Record<string, string>>(() => authors.peek("all") ?? {});

  useEffect(() => {
    if (!canListUsers) return;
    // Evita gravar estado depois que a ficha fechou — abrir e fechar rápido é comum.
    let active = true;
    authors
      .load("all", () => listUsers({ includeInactive: true }).then((envelope) => indexById(envelope?.data)))
      // Silêncio é a resposta certa: a autoria é enfeite de uma tela que funciona sem ela.
      .then((found) => {
        if (active) setIndice(found);
      }, () => undefined);
    return () => {
      active = false;
    };
  }, [canListUsers]);

  return indice;
}
