"use client";

import { PageHeader } from "@/components/ui/layout/PageHeader";

/**
 * O que ocupa a tela quando quem entrou não tem acesso ao financeiro.
 *
 * O backend já recusa: `/clients/{id}/payments` é `@RequerAdmin`, e advogado
 * toma 403 igual a atendente. O que falta é a outra metade — deixar a tela
 * dizer isso em vez de carregar, falhar em silêncio e mostrar uma lista vazia
 * que parece "não há pagamentos".
 *
 * O texto nomeia o papel que resolve. "Acesso negado" manda o usuário abrir um
 * chamado para descobrir o que já poderia estar escrito aqui.
 */
export function SemAcessoFinanceiro({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={titulo} />
      <div className="rounded-2xl border border-gray-100/20 bg-white p-8 text-center">
        <p className="text-sm text-primary">
          O financeiro é restrito ao administrador do escritório.
        </p>
        <p className="mt-1 text-sm text-gray-100">
          Honorários e recebimentos não aparecem para os demais papéis, nem para
          advogado. Se precisa consultá-los, peça acesso a quem administra o
          escritório.
        </p>
      </div>
    </div>
  );
}
