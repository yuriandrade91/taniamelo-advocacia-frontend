/**
 * O que desenhar no lugar de uma área que carrega: o esqueleto, o aviso de
 * falha, o vazio ou o conteúdo. A ordem é a regra — carregando vence falha
 * (ainda não se sabe), falha vence vazio (vazio de quê?).
 *
 * Existe para a tela ler `view === "empty"` em vez de três ternários
 * encaixados, que escondem justamente essa ordem.
 */
export type LoadView = "loading" | "failed" | "empty" | "ready";

export function loadView(state: { isLoading: boolean; failed: boolean; isEmpty: boolean }): LoadView {
  if (state.isLoading) return "loading";
  if (state.failed) return "failed";
  return state.isEmpty ? "empty" : "ready";
}
