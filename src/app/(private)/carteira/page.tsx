"use client";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SemAcessoFinanceiro } from "@/components/ui/feedback/SemAcessoFinanceiro";
import { usePermissoes } from "@/hooks/usePermissoes";

/**
 * Carteira — desligada até o servidor de desenvolvimento servir as rotas.
 *
 * ## O que havia aqui
 *
 * A tela inteira: cards de caixa do mês, gráfico de entradas × saídas, saldo
 * acumulado, rosca de despesas por categoria, as duas tabelas do mês e o
 * cadastro, edição e exclusão de receita e de despesa. Tudo isso vinha de seis
 * consultas — `/revenues`, `/revenues/summary`, `/revenues/timeline`,
 * `/expenses`, `/expenses/summary`, `/expenses/timeline` — e a instância de
 * desenvolvimento ainda não serve nenhuma.
 *
 * Não é tela com um pedaço faltando: sem os dois resumos não existe saldo, e
 * saldo é a razão de a Carteira ser uma tela. Deixá-la no ar erraria seis vezes
 * por carregamento para mostrar zeros — e **zero é um número**. Número errado
 * numa tela financeira é pior que tela ausente: ele é anotado, repetido em
 * reunião e só aparece quando alguém confere com o extrato.
 *
 * ## O que NÃO foi apagado
 *
 * Nada do que a sustenta. Continuam no repositório, com testes:
 *
 * - `services/officeRevenueService`, `services/officeExpenseService` — CRUD,
 *   resumo e série das duas metades.
 * - `components/wallet/` — `EntryFormModal` (com modo de edição),
 *   `RevenuesTable`, `ExpensesTable`, `WalletSummary`, os dois gráficos e o
 *   `walletOverview` com 18 testes.
 * - `components/wallet/entryForms.ts` — validação e payloads, 40 testes.
 *
 * Religar é o `git revert` do commit que removeu isto.
 */
export default function WalletPage() {
  /** D3 continua valendo: dinheiro do escritório é de quem administra. */
  const { podeVerFinanceiro } = usePermissoes();

  if (!podeVerFinanceiro) {
    return <SemAcessoFinanceiro titulo="Carteira" />;
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Carteira"
        description="Receitas e despesas do escritório."
      />

      <div
        role="status"
        className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary"
      >
        <p className="font-medium">Integração pendente</p>
        <p className="mt-1 text-gray-100">
          Esta área depende das rotas de receita e despesa do escritório, que
          ainda não estão no ar no servidor de desenvolvimento. A tela fica
          desligada de propósito, em vez de mostrar saldo zerado: zero é um
          número, e número errado aqui acaba anotado.
        </p>
      </div>
    </div>
  );
}
