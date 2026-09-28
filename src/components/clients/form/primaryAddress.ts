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
 * Remove uma aba de endereço, deslocando valores **e** ids juntos.
 *
 * Os `useSectionForm` das abas são três hooks fixos — hook não nasce dentro de
 * loop. Então "remover a aba do meio" não é tirar um item de uma lista: é
 * copiar o conteúdo de cada aba seguinte para a anterior e deixar a última em
 * branco.
 *
 * O perigo mora aí. `addressIds[i]` é o id que o backend deu para o endereço
 * da aba `i`; se valores e ids deslocarem de forma diferente por um índice, o
 * próximo "salvar" manda os dados de um endereço para o `PUT` de outro — e
 * sobrescreve o endereço errado sem erro nenhum. Por isso os dois deslocam na
 * mesma função, com o mesmo índice, e por isso ela é testada.
 */
export function removeSlotAt<T>(
  values: readonly T[],
  ids: readonly (string | null)[],
  index: number,
  blank: T,
): { values: T[]; ids: (string | null)[] } {
  if (index < 0 || index >= values.length) {
    return { values: [...values], ids: [...ids] };
  }

  const nextValues = [...values.slice(0, index), ...values.slice(index + 1)];
  const nextIds = [...ids.slice(0, index), ...ids.slice(index + 1)];

  // Recompõe o tamanho fixo: a última posição volta a ser uma aba em branco,
  // sem id — senão o array encolheria e o hook da última aba ficaria órfão.
  nextValues.push(blank);
  nextIds.push(null);

  return { values: nextValues, ids: nextIds };
}

/**
 * Índice a selecionar depois de remover a aba `removed`, dado quantas restam.
 *
 * Removida a aba visível, o foco vai para a anterior — não para a primeira.
 * Saltar para o começo faz o usuário perder o lugar numa lista de três.
 */
export function nextSelectedIndex(
  removed: number,
  selected: number,
  remainingCount: number,
): number {
  if (remainingCount <= 0) return 0;
  const candidate = selected > removed ? selected - 1 : selected;
  return Math.max(0, Math.min(candidate, remainingCount - 1));
}

/**
 * Reindexa uma posição depois de remover a aba `removed`.
 *
 * O diálogo de escolha do próximo principal devolve um índice na numeração
 * **anterior** à remoção; quem estava depois da aba removida anda uma casa
 * para trás. Sem essa conversão, escolher "Endereço 3" e remover o 1 promoveria
 * o endereço errado — e em silêncio, porque o índice continua válido.
 *
 * A própria aba removida devolve `-1`: não existe mais.
 */
export function indexAfterRemoval(index: number, removed: number): number {
  if (index === removed) return -1;
  return index > removed ? index - 1 : index;
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
export function casarIdsDeEndereco(
  idsAtuais: readonly (string | null)[],
  enviados: readonly number[],
  criados: readonly { id?: string }[],
): (string | null)[] {
  return idsAtuais.map((atual, indiceDaAba) => {
    const posicaoNoEnvio = enviados.indexOf(indiceDaAba);
    if (posicaoNoEnvio < 0) return atual;
    return criados[posicaoNoEnvio]?.id ?? atual;
  });
}
