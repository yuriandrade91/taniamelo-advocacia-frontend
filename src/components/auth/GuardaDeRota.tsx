"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isAuthenticated, tryRestoreSession } from "@/services/authService";
import { publicRoutes } from "@/constants/paths/routes";

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
 */
export function GuardaDeRota({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    let ativo = true;

    void (async () => {
      if (isAuthenticated()) {
        if (ativo) setLiberado(true);
        return;
      }

      // Access token expirado não é sessão encerrada enquanto o refresh valer.
      const restaurada = await tryRestoreSession();
      if (!ativo) return;

      if (restaurada) {
        setLiberado(true);
        return;
      }

      // Preserva o destino para retomar após o login (?next=/rota) — o mesmo
      // contrato que o proxy usava, e que a tela de login já sabe ler.
      const destino = new URL(publicRoutes.login, window.location.origin);
      if (pathname && pathname !== "/") {
        destino.searchParams.set("next", pathname + window.location.search);
      }
      router.replace(destino.pathname + destino.search);
    })();

    return () => {
      ativo = false;
    };
  }, [router, pathname]);

  if (!liberado) return null;
  return <>{children}</>;
}
