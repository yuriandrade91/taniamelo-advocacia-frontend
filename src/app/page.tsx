"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isAuthenticated } from "@/services/authService";
import { privateRoutes, publicRoutes } from "@/constants/paths/routes";

/**
 * A raiz do site.
 *
 * A raiz pública do domínio leva visitantes ao site institucional e usuários
 * autenticados à área interna.
 *
 * Publicado como site estático, `/` é o que o CloudFront entrega primeiro para
 * quem abre o domínio. O destino é escolhido no cliente porque o HTML é gerado
 * uma vez, no build, sem saber quem pediu.
 *
 * `redirect()` de servidor não serve para esta decisão num export estático.
 */
export default function Root() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? privateRoutes.home : publicRoutes.site);
  }, [router]);

  return null;
}
