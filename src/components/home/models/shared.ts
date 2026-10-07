import type { ReactNode } from "react";
import type { SituationKey } from "@/enums/situation/Situation";
import type { PipelineCard } from "@/components/home/ContributorPipeline";
import type { PendingDocumentItem } from "@/components/home/PendingDocuments";
import type { BirthdayPerson } from "@/components/home/birthdays";
import type { RevenueItem } from "@/components/home/UpcomingRevenues";
import type { StatCardProps } from "@/components/home/StatCard";
import type { BalanceSlice } from "@/components/wallet/walletOverview";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

/**
 * O que a página Início entrega a cada modelo de visualização.
 *
 * A página carrega e o modelo desenha. Nenhum modelo chama service; mover um
 * cliente de etapa, abrir os leads ou ir para outra tela são ações recebidas.
 *
 * Os componentes atuais da home (`PendingForms`, `UpcomingRevenues`,
 * `MonthlyBalance`, `PendingDocuments`, `ContributorPipeline`) podem ser
 * reaproveitados num modelo — mas o estudo pede desenho novo, então prefira
 * compor com as primitivas de `@/components/ui/models/viz`.
 */
export type HomeModelProps = {
  /** Nome do mês corrente ("Outubro"). */
  periodLabel: string;
  /**
   * Formulários preenchidos que ainda não viraram clientes (leads). `null`
   * enquanto a contagem não chegou — mostre "—", nunca 0.
   */
  pendingCount: number | null;
  /** Três indicadores do topo — ainda ilustrativos (sem endpoint de métricas). */
  stats: StatCardProps[];

  /**
   * Financeiro só para ADMIN. Sem permissão as listas vêm vazias: o modelo
   * mostra o vazio que sabe mostrar, sem esconder o bloco (a home não muda de
   * forma conforme o papel).
   */
  canSeeFinance: boolean;
  /** Próximos recebimentos dos clientes (ordenados por vencimento), crus. */
  upcomingPayments: OfficePaymentResponse[];
  /** Os mesmos, já no formato da lista atual (nome, data formatada, status). */
  upcomingItems: RevenueItem[];
  /** Despesas pagas no mês: total e composição por categoria (%). */
  outflow: { total: number; slices: BalanceSlice[] };

  /** Pendências de documentação (ainda ilustrativas). */
  pendingDocuments: PendingDocumentItem[];
  /**
   * Quem faz aniversário nos próximos 30 dias, do mais perto ao mais longe —
   * dado real, derivado da listagem. `null` enquanto carrega.
   *
   * Vem vazio enquanto a listagem desta instância não devolver `birthDate`
   * (ver `UpcomingBirthdays`): não há como distinguir "ninguém" de "não sei"
   * só por aqui, então um modelo que mostre o cartão deve dizer "próximos
   * aniversários" e não "nenhum aniversário".
   */
  birthdays: BirthdayPerson[] | null;

  /** Clientes reais por etapa da esteira (até 50). */
  pipeline: PipelineCard[];

  /**
   * Próximos compromissos (a partir de agora, até 8), para modelos que
   * resumem a agenda. `null` enquanto carrega.
   */
  upcomingAppointments: AppointmentResponse[] | null;
  /**
   * O cartão de compromissos completo de hoje (com criação e edição), pronto
   * para encaixar — para quem quiser a agenda inteira em vez do resumo.
   */
  appointmentsCard: ReactNode;

  actions: {
    /** Abre o modal de leads pendentes. */
    openLeads: () => void;
    /** Vai para /pagamentos. */
    seeAllPayments: () => void;
    /** Vai para /agenda. */
    openAgenda: () => void;
    /** Vai para /clientes. */
    openClients: () => void;
    /** Vai para /clientes/novo. */
    newClient: () => void;
    /** Move um cliente de etapa (persiste com `patchClient`). */
    moveCard: (cardId: string, situation: SituationKey) => void;
  };
};
