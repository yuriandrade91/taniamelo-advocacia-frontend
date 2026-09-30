"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SemAcessoFinanceiro } from "@/components/ui/feedback/SemAcessoFinanceiro";
import { usePermissoes } from "@/hooks/usePermissoes";
import { BenefitPaymentModal } from "@/components/payments/BenefitPaymentModal";

/**
 * Pagamentos aos clientes — parcialmente desligada.
 *
 * ## O corte, e por que não é a tela inteira
 *
 * Esta tela sempre misturou duas rotas com destinos diferentes:
 *
 * - **Ler** era `/api/v1/payments` (consolidado do escritório) mais
 *   `/summary` e `/timeline`. As três dão 404 no servidor de desenvolvimento,
 *   então saíram: a lista, os totais, os filtros, a paginação, os dois
 *   gráficos, e junto deles editar, excluir e confirmar o crédito — que só
 *   eram alcançáveis por uma linha da lista.
 * - **Lançar** é `POST /api/v1/clients/{clientId}/payments`, que responde 200.
 *   Esse **fica**. Desligar o que funciona porque o vizinho não responde
 *   tiraria da pessoa a única coisa que ela consegue fazer aqui hoje.
 *
 * O lançamento continua visível na ficha do cliente, na aba financeira — que é
 * onde a parcela mora de verdade.
 *
 * ## O que NÃO foi apagado
 *
 * `officePaymentService`, `PaymentsTable` (com as três ações),
 * `PaymentsSummary`, `PaymentsFilters`, `RegisterReceiptModal`,
 * `EditPaymentModal`, `paymentBuckets` (5 testes) e `paymentForm` (24 testes).
 * Religar é o `git revert` do commit que removeu isto.
 */
export default function PaymentsPage() {
  const { podeVerFinanceiro } = usePermissoes();
  const [isChargeFormOpen, setIsChargeFormOpen] = useState(false);

  if (!podeVerFinanceiro) {
    return <SemAcessoFinanceiro titulo="Pagamentos aos clientes" />;
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Pagamentos"
        description="O que os clientes têm a receber do INSS."
        actions={
          <Button
            type="button"
            variant="outline"
            className="on-primary-button"
            onPress={() => setIsChargeFormOpen(true)}
          >
            Lançar valor a receber
          </Button>
        }
      />

      <div
        role="status"
        className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary"
      >
        <p className="font-medium">Visão consolidada pendente</p>
        <p className="mt-1 text-gray-100">
          A lista de todos os clientes, os totais do período e os gráficos
          dependem de <code>/api/v1/payments</code>, que ainda não está no ar no
          servidor de desenvolvimento.
        </p>
        {/*
          Segunda frase obrigatória: sem ela "pendente" leria como "nada nesta
          tela funciona", e o botão do cabeçalho — que grava de verdade —
          pareceria enfeite.
        */}
        <p className="mt-2 text-gray-100">
          <strong>Lançar valor a receber funciona.</strong> Vai para{" "}
          <code>/clients/{"{id}"}/payments</code>, que responde, e a parcela
          fica visível na aba financeira da ficha do cliente.
        </p>
      </div>

      <BenefitPaymentModal
        isOpen={isChargeFormOpen}
        onOpenChange={setIsChargeFormOpen}
        onSaved={() => setIsChargeFormOpen(false)}
      />
    </div>
  );
}
