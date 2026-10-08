"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAuthenticated, tryRestoreSession } from "@/services/authService";
import { publicRoutes } from "@/constants/paths/routes";
import { expireSession } from "@/lib/session";

/** De quanto em quanto tempo a sessão é conferida com a página aberta. */
const SESSION_CHECK_MS = 60_000;

/**
 * A guarda de rota da área autenticada.
 *
 * ## Por que ela existe, e por que aqui
 *
 * Esta checagem morava em `src/proxy.ts` e rodava **no servidor**, antes de
 * qualquer HTML sair. O frontend passou a ser publicado como site estático no
 * S3, e site estático não tem servidor: o `output: "export"` do Next desliga o
 * proxy — sem erro de build, sem aviso em runtime. A guarda simplesmente
 * deixaria de existir, e `/home` renderizaria para qualquer um.
 *
 * ## O que muda em relação ao proxy, honestamente
 *
 * Antes, quem não tinha token recebia um 307 e **nunca** via a tela protegida.
 * Agora o HTML da tela chega ao navegador e é o JavaScript que decide. A
 * diferença importa e não dá para fingir que não: quem souber desligar o
 * JavaScript vê a casca da aplicação.
 *
 * O que essa pessoa **não** vê é dado de cliente. Toda leitura passa pela API,
 * que exige o token e responde 401 sem ele — a autorização sempre esteve lá, e
 * continua onde estava. O que se perdeu foi a porta de entrada; o cofre não
 * mudou de lugar.
 *
 * ## O piscar da tela
 *
 * Enquanto a decisão não sai, este componente não renderiza os filhos. É de
 * propósito: mostrar a tela protegida e tirá-la meio segundo depois é pior que
 * uma tela em branco — dá tempo de ler, e parece defeito.
 *
 * ## A tentativa de restaurar a sessão
 *
 * Sem cookie de access token ainda não é "não autenticado": o refresh token é
 * httpOnly, dura 14 dias, e o access expira antes. O proxy não tinha como
 * saber disso (não podia chamar a API); aqui dá, e quem volta no dia seguinte
 * continua entrando direto em vez de rever o formulário de login.
 *
 * ## Com a página aberta
 *
 * A guarda não decide só na entrada. A cada minuto, e sempre que a aba volta
 * a ficar visível, ela confere a sessão de novo: o cookie do access token
 * vence junto com o token (`applySession`), então cookie ausente é token
 * vencido. Aí tenta o refresh e, se ele for recusado, manda para o login
 * (`expireSession`) — antes de a pessoa clicar em algo e a tela responder com
 * erro. O que escapar disso (um 401 no meio de uma ação) o `axiosService`
 * trata do mesmo jeito.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      if (isAuthenticated()) {
        if (active) setLiberado(true);
        return;
      }

      // Access token expirado não é sessão encerrada enquanto o refresh valer.
      const restored = await tryRestoreSession();
      if (!active) return;

      if (restored) {
        setLiberado(true);
        return;
      }

      // Preserva o destino para retomar após o login (?next=/rota) — o mesmo
      // contrato que o proxy usava, e que a tela de login já sabe ler.
      const target = new URL(publicRoutes.login, window.location.origin);
      if (pathname && pathname !== "/") {
        target.searchParams.set("next", pathname + window.location.search);
      }
      router.replace(target.pathname + target.search);
    })();

    return () => {
      active = false;
    };
  }, [router, pathname]);

  useEffect(() => {
    if (!liberado) return;
    let checking = false;

    const check = async () => {
      if (checking || isAuthenticated()) return;
      checking = true;
      const restored = await tryRestoreSession();
      checking = false;
      if (!restored) expireSession();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };

    const timer = window.setInterval(() => void check(), SESSION_CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [liberado]);

  if (!liberado) return null;
  return <>{children}</>;
}
