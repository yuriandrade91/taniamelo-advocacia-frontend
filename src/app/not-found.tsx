import Link from "next/link";

import { PageMessage } from "@/components/ui/feedback/PageMessage";

/** Vira o `404.html` do export, que o CloudFront serve para rota inexistente (`docs/DEPLOY.md`). */
export default function NotFound() {
  return (
    <PageMessage title="Página não encontrada" description="O endereço pode estar errado ou a página mudou de lugar.">
      <Link
        href="/"
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
      >
        Voltar ao início
      </Link>
    </PageMessage>
  );
}
