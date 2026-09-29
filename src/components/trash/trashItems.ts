/**
 * A lixeira, como dado.
 *
 * Cliente e compromisso são recursos diferentes, com rotas diferentes e
 * telas diferentes — mas na lixeira a pergunta é a mesma: *o que foi excluído,
 * quando, e quero de volta?* Esta camada normaliza os dois no mesmo item para
 * a tela não virar duas tabelas quase iguais que divergem com o tempo.
 *
 * Módulo puro: ordenar e formatar dá para conferir sem abrir o navegador.
 */

import type { Clients } from "@/interfaces/Clients.interface";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

export type TrashKind = "cliente" | "compromisso";

export type TrashItem = {
  kind: TrashKind;
  id: string;
  /** O que identifica a linha para quem está olhando. */
  title: string;
  /** Uma linha de contexto: CPF do cliente, quando foi o compromisso. */
  subtitle: string;
  /** ISO-8601 com hora, como o backend manda. Vazio quando não veio. */
  deletedAt: string;
};

export function clienteParaItem(cliente: Clients): TrashItem {
  return {
    kind: "cliente",
    // `clientId`, e não `id`: o recurso cliente manda o id nesse nome.
    id: cliente.clientId ?? "",
    title: cliente.fullName ?? "(sem nome)",
    subtitle: cliente.cpf ? `CPF ${cliente.cpf}` : "",
    deletedAt: cliente.deletedAt ?? "",
  };
}

export function compromissoParaItem(
  appointment: AppointmentResponse,
): TrashItem {
  return {
    kind: "compromisso",
    id: appointment.id,
    title: appointment.title ?? "(sem título)",
    subtitle: appointment.clientName ?? "",
    deletedAt: appointment.deletedAt ?? "",
  };
}

/**
 * Mais recente primeiro.
 *
 * O arrependimento é quase sempre sobre o que acabou de sair. Ordenar ao
 * contrário faria a pessoa paginar até o fim justamente para achar o que
 * excluiu há um minuto.
 *
 * Item sem `deletedAt` vai para o fim, e não para o começo: string vazia
 * ordena antes de qualquer data numa comparação ingênua, e o registro mais
 * incompleto acabaria no topo.
 */
export function ordenarPorExclusao(itens: readonly TrashItem[]): TrashItem[] {
  return [...itens].sort((a, b) => {
    if (!a.deletedAt && !b.deletedAt) return 0;
    if (!a.deletedAt) return 1;
    if (!b.deletedAt) return -1;
    return b.deletedAt.localeCompare(a.deletedAt);
  });
}

/** `2026-09-29T14:03:11Z` → `29/09/2026 11:03` no fuso do escritório. */
export function formatarExclusao(iso: string): string {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

/** Chave estável para o React e para o alvo da confirmação. */
export const chaveDoItem = (item: TrashItem): string =>
  `${item.kind}:${item.id}`;
