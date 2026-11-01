"use client";

import { ActionButton } from "@/components/ui/actions/ActionGroup";
import { PageMessage } from "@/components/ui/feedback/PageMessage";

/**
 * Fronteira de erro: um erro de renderização cai aqui, e não numa página em
 * branco. O detalhe técnico não aparece — ele não ajuda quem está atendendo.
 */
export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <PageMessage
      title="Algo deu errado nesta tela"
      description="O que já estava gravado não foi afetado. Tente de novo; se continuar, recarregue a página."
    >
      <ActionButton tone="primary" onClick={reset}>
        Tentar de novo
      </ActionButton>
    </PageMessage>
  );
}
