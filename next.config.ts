import type { NextConfig } from "next";

/**
 * Site estático: o build gera HTML em `out/`, que vai para o S3 e é servido
 * pelo CloudFront. Não há Node em produção.
 *
 * ## O que isso custa, para ficar registrado
 *
 * `output: "export"` **desliga o middleware** (o `src/proxy.ts`, que era a
 * guarda de rota) e as rotas de API do Next. O Next não falha o build por
 * isso — imprime um aviso no meio da saída e segue. A guarda foi reescrita em
 * `components/auth/GuardaDeRota.tsx`, no cliente; se alguém recriar um
 * `proxy.ts` aqui, ele será ignorado em produção e funcionará em
 * desenvolvimento, que é a pior combinação possível.
 *
 * `images.unoptimized` porque o otimizador do `next/image` é um serviço que
 * roda no servidor. Sem isto o build falha ao encontrar o primeiro
 * `<Image>` — e a aplicação usa vários.
 *
 * **Sem `trailingSlash`**, de propósito. Ligá-lo faz cada rota virar
 * `rota/index.html`, o que o S3 resolveria sozinho — mas também muda toda URL
 * da aplicação de `/home` para `/home/`. O primeiro teste a rodar com ele
 * ligado morreu esperando a URL `/home` numa página que já estava em
 * `/home/`, e a mesma troca chegaria aos links que as pessoas têm salvos.
 *
 * O preço é uma função de reescrita no CloudFront acrescentando `.html` ao
 * caminho sem extensão (`/home` → `/home.html`). São seis linhas, ficam em
 * `docs/DEPLOY_FRONTEND.md`, e o formato das URLs não muda.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
