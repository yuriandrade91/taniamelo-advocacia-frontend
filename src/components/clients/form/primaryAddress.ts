/**
 * A regra do endereço principal, isolada do React.
 *
 * "Principal" não é um booleano de cada endereço — é uma escolha **entre**
 * eles. Escrita como propriedade independente, nada impede dois marcados, e aí
 * alguém decide em silêncio qual vale: hoje é o backend, que desmarca o
 * anterior a cada `POST /clients/{id}/addresses` e faz o último vencer sem
 * avisar ninguém.
 *
 * Aqui a escolha vira transformação sobre a lista inteira, o que torna a
 * invariante verificável — e testável sem montar componente.
 */

type WithPrimary = { isPrimary: boolean };

/** Índice do principal, ou `-1` quando nenhum está marcado. */
export function findPrimaryIndex(
  values: readonly WithPrimary[],
): number {
  return values.findIndex((value) => value.isPrimary);
}

export function countPrimaries(values: readonly WithPrimary[]): number {
  return values.filter((value) => value.isPrimary).length;
}

/**
 * Devolve a lista com **exatamente um** principal, na posição pedida.
 *
 * Índice fora da faixa não zera a escolha: a lista volta intacta. Um clique
 * perdido não pode deixar o cliente sem endereço principal — estado que o
 * backend recusa (ele força o primeiro endereço a ser principal) e que a tela
 * não teria como desenhar.
 */
export function withPrimaryAt<T extends WithPrimary>(
  values: readonly T[],
  index: number,
): T[] {
  if (index < 0 || index >= values.length) return [...values];
  return values.map((value, i) => ({ ...value, isPrimary: i === index }));
}

/**
 * Guarda antes de enviar o lote. `true` quando a lista está no formato que a
 * API aceita: um principal, nem zero nem dois.
 *
 * Lista vazia é válida — não há endereço a enviar.
 */
export function isValidPrimarySelection(
  values: readonly WithPrimary[],
): boolean {
  return values.length === 0 || countPrimaries(values) === 1;
}

/**
 * Remove abas de endereço — uma ou várias de uma vez —, deslocando valores
 * **e** ids juntos.
 *
 * Os `useSectionForm` das abas são três hooks fixos — hook não nasce dentro de
 * loop. Então "remover a aba do meio" não é tirar um item de uma lista: é
 * copiar o conteúdo de cada aba seguinte para a anterior e deixar as últimas
 * em branco.
 *
 * O perigo mora aí. `addressIds[i]` é o id que o backend deu para o endereço
 * da aba `i`; se valores e ids deslocarem de forma diferente por um índice, o
 * próximo "salvar" manda os dados de um endereço para o `PUT` de outro — e
 * sobrescreve o endereço errado sem erro nenhum. Por isso os dois deslocam na
 * mesma função, com os mesmos índices, e por isso ela é testada.
 *
 * Índice fora da faixa é ignorado.
 */
export function removeSlots<T>(
  values: readonly T[],
  ids: readonly (string | null)[],
  removed: readonly number[],
  blank: T,
): { values: T[]; ids: (string | null)[] } {
  const keep = (_: unknown, index: number) => !removed.includes(index);
  const nextValues = values.filter(keep);
  const nextIds = ids.filter(keep);

  // Recompõe o tamanho fixo: as últimas posições voltam a ser abas em branco,
  // sem id — senão o array encolheria e o hook das últimas abas ficaria órfão.
  while (nextValues.length < values.length) nextValues.push(blank);
  while (nextIds.length < ids.length) nextIds.push(null);

  return { values: nextValues, ids: nextIds };
}

/**
 * Reindexa uma posição depois de remover as abas `removed`.
 *
 * O diálogo de exclusão devolve o próximo principal na numeração **anterior**
 * à remoção; quem estava depois de uma aba removida anda uma casa para trás
 * por aba removida antes dele. Sem essa conversão, escolher "Endereço 3" e
 * remover o 1 promoveria o endereço errado — e em silêncio, porque o índice
 * continua válido.
 *
 * Uma aba removida devolve `-1`: não existe mais.
 */
export function indexAfterRemoval(
  index: number,
  removed: readonly number[],
): number {
  if (removed.includes(index)) return -1;
  return index - removed.filter((gone) => gone < index).length;
}

/**
 * Índice a selecionar depois de remover as abas `removed`, dado quantas
 * restam.
 *
 * A aba visível que sobrevive continua visível. Removida a visível, o foco
 * fica na posição em que ela estava (agora a aba seguinte) ou, no fim da
 * lista, vai para a anterior — não para a primeira: saltar para o começo faz o
 * usuário perder o lugar.
 */
export function nextSelectedIndex(
  removed: readonly number[],
  selected: number,
  remainingCount: number,
): number {
  if (remainingCount <= 0) return 0;
  const candidate = selected - removed.filter((gone) => gone < selected).length;
  return Math.max(0, Math.min(candidate, remainingCount - 1));
}

/**
 * Casa os ids devolvidos pelo lote com as abas que os originaram.
 *
 * O `/addresses/batch` devolve os criados **na ordem enviada**, e só as abas
 * preenchidas são enviadas — então a resposta é densa (0,1,2) e as abas são
 * esparsas (pode ser a 0 e a 2). Casar por posição da resposta com posição da
 * aba grava o id do endereço da aba 2 na aba 1: uma edição posterior viraria
 * PUT no endereço errado, sobrescrevendo um endereço que ninguém pediu para
 * mudar. Nada na tela denunciaria, porque as duas abas continuam com um id
 * válido.
 *
 * `enviados` traz os índices de aba na ordem em que foram enviados. O id só
 * substitui o valor atual quando existe: resposta mais curta que o pedido
 * (não deveria acontecer) deixa o que estava, em vez de apagar id de aba já
 * gravada.
 */
export function matchAddressIds(
  idsAtuais: readonly (string | null)[],
  enviados: readonly number[],
  criados: readonly { id?: string }[],
): (string | null)[] {
  return idsAtuais.map((atual, indiceDaAba) => {
    const positionInPayload = enviados.indexOf(indiceDaAba);
    if (positionInPayload < 0) return atual;
    return criados[positionInPayload]?.id ?? atual;
  });
}
