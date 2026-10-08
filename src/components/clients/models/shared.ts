import type { ReactNode } from "react";
import type { Clients } from "@/interfaces/Clients.interface";
import type { SituationKey } from "@/enums/situation/Situation";
import type { UseClientFiltersResult } from "@/app/(private)/clientes/useClientFilters";

/**
 * O que a página de Clientes entrega à lista (`CompiledModel`).
 *
 * A página é dona da busca, dos filtros, da paginação, do cache, da exclusão
 * com janela de desfazer e dos modais (ficha, edição, exclusão). A lista
 * recebe a página de clientes pronta e as ações; só decide o desenho.
 *
 * Campos úteis de `Clients` (a API devolve **rótulos** PT-BR):
 * `fullName`, `cpf` (use `maskCPF` de `@/lib/masks/masks`), `benefit`,
 * `situation` (etapa da esteira), `beneficiaryNumber`, `notBillable` (isento),
 * `clientType` ("Verificado" | "Potencial" — potencial é lead), `createdAt`,
 * `updatedAt`, `mobilePhone`, `email`, `age`.
 */
export type ClientsModelProps = {
  /** A página atual de clientes (10 por página), já com exclusões pendentes aplicadas. */
  clients: Clients[];
  isLoading: boolean;
  /** Mensagem de erro da carga, ou "" sem erro. */
  error: string;
  /** Estado dos filtros — a lista desenha a própria barra (`CurrentFilters`). */
  filterState: UseClientFiltersResult;
  /** O campo de período já montado (DateRangePicker em pt-BR). */
  dateRangeField: ReactNode;
  /** Paginação pronta. */
  pagination: ReactNode;
  /** ADMIN/SUPPORT: só eles veem o botão de excluir. */
  canDelete: boolean;
  actions: {
    onCreate: () => void;
    onView: (client: Clients) => void;
    onEdit: (client: Clients) => void;
    /** Pede confirmação (modal) e exclui com janela de desfazer. */
    onDelete: (client: Clients) => void;
    /**
     * Muda a situação (PATCH /clients/{id}). Resolve quando o servidor
     * confirma; rejeita em erro (o toast já sai do interceptor).
     */
    onChangeSituation: (client: Clients, situationKey: SituationKey) => Promise<void>;
    /**
     * Abre o financeiro do cliente (benefício e honorários). Só vem para
     * quem pode ver o financeiro (`canSeeFinance`); sem ela, sem ícone.
     */
    onViewFinance?: (client: Clients) => void;
  };
};
