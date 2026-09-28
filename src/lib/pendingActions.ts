/**
 * Sobreposição visual das ações com janela de desfazer.
 *
 * Uma ação agendada (concluir/cancelar/excluir) muda a tela na hora, mas só
 * vira requisição quando a janela expira. Entre um momento e outro a lista
 * ainda carrega o dado antigo vindo do backend — esta função aplica por cima
 * o efeito que o usuário já está vendo.
 *
 * Fica fora do React de propósito: é a única parte com regra de verdade, e
 * assim dá para testar sem montar componente.
 */

export type PendingKind = "complete" | "cancel" | "delete";

/** id do compromisso → ação agendada e ainda não efetivada. */
export type PendingMap = ReadonlyMap<string, PendingKind>;

/** Labels de status (a API trabalha com o label PT-BR, não com a chave). */
export type PendingStatusLabels = {
  complete: string;
  cancel: string;
};

/**
 * `id` é opcional porque as listagens do projeto tipam assim (ex.: `Clients`).
 * Item sem id nunca pode estar pendente — não há chave para casar com o mapa.
 */
type WithStatus = { id?: string; status?: string };

/**
 * Remove os itens com exclusão agendada e reescreve o status dos que têm
 * conclusão/cancelamento agendados.
 *
 * Não muta a entrada: devolve novos objetos só para os itens afetados, para
 * que a igualdade referencial dos demais continue valendo (importante para o
 * `key` das listas e para memoização).
 */
export function applyPendingOverlay<T extends WithStatus>(
  items: readonly T[],
  pending: PendingMap,
  labels: PendingStatusLabels,
): T[] {
  if (pending.size === 0) return items as T[];

  const result: T[] = [];
  for (const item of items) {
    const kind = item.id ? pending.get(item.id) : undefined;
    if (kind === "delete") continue;
    if (kind === "complete") {
      result.push({ ...item, status: labels.complete });
      continue;
    }
    if (kind === "cancel") {
      result.push({ ...item, status: labels.cancel });
      continue;
    }
    result.push(item);
  }
  return result;
}

/**
 * Total exibido depois da sobreposição. O backend devolve o total real do
 * mês; cada exclusão agendada **desta página** tira um do que está na tela.
 *
 * Conta sobre os itens recebidos, não sobre o mapa inteiro: uma exclusão
 * agendada num outro mês não pode descontar do total deste.
 *
 * Conclusão e cancelamento não mexem no total — o compromisso continua
 * existindo, só muda de status.
 */
export function applyPendingTotal<T extends WithStatus>(
  total: number,
  items: readonly T[],
  pending: PendingMap,
): number {
  if (pending.size === 0) return total;
  let deletions = 0;
  for (const item of items) {
    if (item.id && pending.get(item.id) === "delete") deletions += 1;
  }
  return Math.max(0, total - deletions);
}
