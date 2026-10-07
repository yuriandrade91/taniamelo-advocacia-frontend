/**
 * Leva o topo do bloco para a tela se ele ficou acima dela.
 *
 * "Próxima", "Revisar" e o salvar com erro trocam de aba a partir do fim de
 * uma aba que pode ser longa; sem isto a aba nova abriria com a tela rolada
 * lá embaixo. Clicar na barra de abas, que já está visível, não mexe na
 * rolagem.
 */
export function revealTop(element: HTMLElement | null) {
  if (element && element.getBoundingClientRect().top < 0) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
