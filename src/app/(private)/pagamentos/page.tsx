"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Pagination } from "@heroui/react";

import {
  PaymentsFilters,
  EMPTY_FILTERS,
  type PaymentsFiltersValue,
} from "@/components/payments/PaymentsFilters";
import { PaymentsSummary } from "@/components/payments/PaymentsSummary";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { SemAcessoFinanceiro } from "@/components/ui/feedback/SemAcessoFinanceiro";
import { usePermissoes } from "@/hooks/usePermissoes";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { RegisterReceiptModal } from "@/components/payments/RegisterReceiptModal";
import { BenefitPaymentModal } from "@/components/payments/BenefitPaymentModal";
import {
  ELLIPSIS,
  buildPageList,
  clampPage,
  pageRange,
} from "@/lib/pagination";
import {
  getOfficePaymentSummary,
  getOfficePaymentTimeline,
  listOfficePayments,
} from "@/services/officePaymentService";
import { PaymentsTimelineChart } from "@/components/payments/PaymentsTimelineChart";
import { PaymentsTrendChart } from "@/components/payments/PaymentsTrendChart";
import { samplePaymentTimeline } from "@/components/charts/sampleData";
import { currentMonth, monthRange, shiftMonth } from "@/lib/period";
import type {
  OfficePaymentResponse,
  OfficePaymentSummary,
  PaymentTimelinePoint,
} from "@/interfaces/payment/OfficePayment.interface";
import type {
  PaymentMethodInput,
  PaymentStatusInput,
} from "@/enums/payment/Payment";

/**
 * Valores que os clientes têm a receber **do INSS** — visão consolidada de
 * `client_payments`.
 *
 * ## Que dinheiro é este
 *
 * Atrasados da concessão, benefício mensal, parcela de acordo: o que o INSS
 * paga ao cliente. **Não é honorário.** Honorário é receita do escritório e
 * mora na Carteira.
 *
 * A confusão é fácil e cara, porque a tabela não distingue: `client_payments`
 * é "um valor com vencimento e data de pagamento preso a um cliente", que
 * serve de forma igual aos dois. O significado vem de quem escreve nela — e
 * esta tela é o único lugar que escreve, o que é o que mantém a coluna com um
 * sentido só.
 *
 * ## Por que esta tela existe separada da ficha do cliente
 *
 * A pergunta que ela responde é da carteira de clientes, não de um cliente:
 * "quem está esperando crédito", "o que entra este mês", "quem já recebeu".
 * Responder isso abrindo cliente por cliente é o que a tela substitui.
 *
 * ## O que ela ainda não tem
 *
 * `GET /api/v1/payments` **não existe no backend**. Enquanto não existir, as
 * chamadas respondem 404 e a tela diz isso com todas as letras, em vez de
 * mostrar "nenhum pagamento encontrado" — que seria mentira, e a pior espécie:
 * a que parece funcionamento normal. A especificação para implementar está em
 * `docs/ESPEC_FINANCEIRO.md`.
 *
 * Descartei agregar no front (listar clientes e pedir os pagamentos de cada):
 * são 126 requisições para 125 clientes, e piora a cada cadastro.
 */

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

/** Estado de carregamento que distingue "sem dado" de "sem rota". */
type LoadState = "loading" | "ready" | "missing-endpoint" | "error";

export default function PaymentsPage() {
  /**
   * D3: dinheiro é só do administrador. O backend impõe (`@RequerAdmin` na
   * classe do `ClientPaymentController`), e sem esta guarda a tela carregava,
   * tomava 403 em silêncio e exibia uma lista vazia — que se lê como "não há
   * pagamentos", não como "você não tem acesso".
   */
  const { podeVerFinanceiro } = usePermissoes();
  const [filters, setFilters] = useState<PaymentsFiltersValue>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);

  const [items, setItems] = useState<OfficePaymentResponse[]>([]);
  const [summary, setSummary] = useState<OfficePaymentSummary | null>(null);
  const [timeline, setTimeline] = useState<PaymentTimelinePoint[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [state, setState] = useState<LoadState>("loading");

  // Busca só dispara depois que o usuário para de digitar — sem isso é uma
  // requisição por tecla.
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(filters.searchTerm.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  /**
   * Filtros aplicados, sem o texto cru — memoizado para não refazer a busca a
   * cada render. `dueFrom`/`dueTo`/arrays entram só quando têm valor: mandar
   * `status=[]` na query seria filtrar por nada e o backend teria que saber
   * ignorar.
   */
  const query = useMemo(
    () => ({
      searchTerm: debouncedSearch || undefined,
      dueFrom: filters.dueFrom || undefined,
      dueTo: filters.dueTo || undefined,
      status: filters.status.length
        ? (filters.status as PaymentStatusInput[])
        : undefined,
      paymentMethod: filters.paymentMethod.length
        ? (filters.paymentMethod as PaymentMethodInput[])
        : undefined,
    }),
    [
      debouncedSearch,
      filters.dueFrom,
      filters.dueTo,
      filters.status,
      filters.paymentMethod,
    ],
  );

  // Mudou o filtro, a página volta para a primeira: manter a 7 depois de
  // filtrar mostraria "nenhum resultado" num conjunto que tem resultado.
  useEffect(() => {
    setPageNumber(1);
  }, [query]);

  /**
   * O gráfico olha uma janela fixa de 6 meses terminando no mês atual, e não o
   * filtro da tabela: o filtro serve para achar uma cobrança específica, o
   * gráfico serve para ver a tendência. Amarrar os dois faria o gráfico sumir
   * toda vez que alguém buscasse por um nome.
   */
  const chartRange = useMemo(() => {
    const now = currentMonth();
    return {
      from: monthRange(shiftMonth(now, -5)).from,
      to: monthRange(now).to,
    };
  }, []);

  /** Lançar um novo valor a receber do INSS. */
  const [isChargeFormOpen, setIsChargeFormOpen] = useState(false);
  /** Parcela cujo crédito está sendo confirmado. */
  const [receiptTarget, setReceiptTarget] =
    useState<OfficePaymentResponse | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [list, totals] = await Promise.all([
        listOfficePayments({ ...query, pageNumber, pageSize: PAGE_SIZE }),
        getOfficePaymentSummary({
          dueFrom: query.dueFrom,
          dueTo: query.dueTo,
        }),
      ]);

      setItems(list.data ?? []);
      setTotal(list.pagination?.totalRecords ?? 0);
      setTotalPages(list.pagination?.totalPages ?? 0);
      setSummary(totals.data ?? null);

      // Falha do gráfico não derruba a tabela: são perguntas independentes.
      try {
        const series = await getOfficePaymentTimeline({
          from: chartRange.from,
          to: chartRange.to,
          basis: "due",
        });
        setTimeline(series.data ?? []);
      } catch {
        setTimeline([]);
      }

      setState("ready");
    } catch (error) {
      // 404 aqui não é "não achei pagamento" — é "a rota não existe ainda".
      // Distinguir os dois é o que impede a tela de mentir.
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      setItems([]);
      setSummary(null);
      setTotal(0);
      setTotalPages(0);
      setTimeline([]);
      setState(status === 404 ? "missing-endpoint" : "error");
    }
  }, [query, pageNumber, chartRange]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Sem a rota, os gráficos caem no exemplo — e o card passa a exibir o selo
   * "dados de exemplo". A alternativa (dois retângulos vazios) não permite
   * avaliar escala, rótulo nem legibilidade, que é o que se quer ver agora.
   */
  const isSampleChart = timeline.length === 0;
  const chartPoints = isSampleChart ? samplePaymentTimeline() : timeline;

  const { start: rangeStart, end: rangeEnd } = pageRange(
    pageNumber,
    PAGE_SIZE,
    total,
  );

  const goToPage = (next: number) => setPageNumber(clampPage(next, totalPages));

  const emptyMessage =
    state === "missing-endpoint"
      ? "A consolidação de pagamentos ainda não está disponível no servidor."
      : state === "error"
        ? "Não foi possível carregar os valores. Tente novamente."
        : "Nenhum recebimento encontrado para os filtros escolhidos.";

  if (!podeVerFinanceiro) {
    return <SemAcessoFinanceiro titulo="Pagamentos aos clientes" />;
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Pagamentos aos clientes"
        description={
          <>
            O que os clientes têm a receber do INSS — atrasados, benefício,
            acordo — pela data prevista do crédito. Para receitas e despesas do
            escritório, veja{" "}
            <Link
              href="/carteira"
              className="font-medium text-secondary underline underline-offset-2"
            >
              Carteira
            </Link>
            .
          </>
        }
        actions={
          /*
            Lançar funciona hoje: vai para `POST /clients/{id}/payments`, que
            existe. Quem some enquanto o agregado não sobe é a **lista** — o
            lançamento é gravado e aparece na ficha do cliente.
          */
          <Button
            type="button"
            variant="ghost"
            className="on-primary-button"
            onPress={() => setIsChargeFormOpen(true)}
          >
            Lançar valor a receber
          </Button>
        }
      />

      <PaymentsSummary summary={summary} isLoading={state === "loading"} />

      <section>
        <PaymentsFilters
          value={filters}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        <PaymentsTable
          items={items}
          isLoading={state === "loading"}
          emptyMessage={emptyMessage}
          onRegisterReceipt={setReceiptTarget}
        />

        {totalPages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination size="sm" className="text-gray-100">
              <Pagination.Summary className="text-sm text-gray-100">
                {total === 0
                  ? "Nenhum recebimento"
                  : `${rangeStart} a ${rangeEnd} de ${total} recebimento${total === 1 ? "" : "s"}`}
              </Pagination.Summary>

              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    className="text-sm text-gray-100"
                    isDisabled={pageNumber <= 1}
                    onPress={() => goToPage(pageNumber - 1)}
                  >
                    <Pagination.PreviousIcon />
                    Anterior
                  </Pagination.Previous>
                </Pagination.Item>

                {buildPageList(pageNumber, totalPages).map((entry, index) =>
                  entry === ELLIPSIS ? (
                    <Pagination.Item key={`gap-${index}`}>
                      <Pagination.Ellipsis className="text-sm text-gray-100" />
                    </Pagination.Item>
                  ) : (
                    <Pagination.Item key={entry}>
                      <Pagination.Link
                        isActive={entry === pageNumber}
                        onPress={() => goToPage(entry)}
                        className={`text-sm ${
                          entry === pageNumber
                            ? "bg-gray-100 text-white"
                            : "text-gray-100"
                        }`}
                      >
                        {entry}
                      </Pagination.Link>
                    </Pagination.Item>
                  ),
                )}

                <Pagination.Item>
                  <Pagination.Next
                    className="text-sm text-gray-100"
                    isDisabled={pageNumber >= totalPages}
                    onPress={() => goToPage(pageNumber + 1)}
                  >
                    Próxima
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PaymentsTimelineChart points={chartPoints} isSample={isSampleChart} />
        <PaymentsTrendChart points={chartPoints} isSample={isSampleChart} />
      </div>

      {state === "missing-endpoint" && (
        <div
          role="status"
          className="rounded-2xl border border-secondary/40 bg-light-secondary px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">Aguardando o servidor</p>
          <p className="mt-1 text-gray-100">
            A <strong>lista</strong> consulta <code>/api/v1/payments</code>, que
            ainda não existe no backend — por isso ela e os totais estão vazios.
            Nada aqui é dado de exemplo.
          </p>
          {/*
            Sem esta segunda frase, "aguardando o servidor" leria como "nada
            nesta tela funciona", e o botão de lançar cobrança — que grava de
            verdade — pareceria enfeite.
          */}
          <p className="mt-2 text-gray-100">
            <strong>Lançar valor a receber funciona.</strong> Vai para{" "}
            <code>/clients/{"{id}"}/payments</code>, que existe, e fica visível
            na ficha do cliente. O que só aparece aqui depois da rota agregada é
            a listagem — e é nela que fica o botão de confirmar o crédito de
            cada parcela.
          </p>
        </div>
      )}

      <BenefitPaymentModal
        isOpen={isChargeFormOpen}
        onOpenChange={setIsChargeFormOpen}
        onSaved={() => void load()}
      />

      <RegisterReceiptModal
        payment={receiptTarget}
        onClose={() => setReceiptTarget(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
