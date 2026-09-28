"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isAuthenticated } from "@/services/authService";
import { privateRoutes, publicRoutes } from "@/constants/paths/routes";

/**
 * A raiz do site.
 *
 * A aplicação nunca teve página em `/` — as rotas começam em `/login` e
 * `/home`. Com o Next servindo, isso dava um 404 do próprio framework e ninguém
 * reparava, porque ninguém digita a raiz em desenvolvimento.
 *
 * Publicado como site estático, `/` é justamente o que o CloudFront entrega
 * primeiro para quem abre o domínio. Sem esta página o visitante recebe o erro
 * do S3; com ela, vai para onde deveria ter ido.
 *
 * Redireciona pelo cliente porque `redirect()` de servidor não existe num
 * export estático: o HTML é gerado uma vez, no build, sem saber quem pediu.
 */
export default function Raiz() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated() ? privateRoutes.home : publicRoutes.login);
  }, [router]);

  return null;
}
