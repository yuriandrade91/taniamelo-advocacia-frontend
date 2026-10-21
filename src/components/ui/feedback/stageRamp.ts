/**
 * A rampa de azul do funil — a cor das seis etapas da esteira.
 *
 * As etapas são **ordinais**: a cor acompanha a posição no funil, não um
 * "tipo". Por isso uma rampa de uma cor só, do escuro (primeira etapa) ao
 * claro (última), e não uma paleta de matizes diferentes. Reordenar por
 * tamanho apagaria o funil; trocar a cor de uma etapa diria que ela mudou de
 * natureza.
 *
 * Nasceu na visão Jornada do cliente dos Relatórios e já tinha duas cópias
 * literais (a sanfona da Agenda copiou a rampa com um comentário apontando
 * para cá). Mora num módulo sem dependência nenhuma para que a Home, a Agenda
 * e os Relatórios leiam a MESMA rampa sem arrastar o kit de Relatórios atrás.
 *
 * Classes literais de propósito: o Tailwind só gera o que encontra escrito.
 */

/** Fundo na rampa (claro → o azul da marca com opacidade decrescente). */
export const STAGE_BG = [
  "bg-primary",
  "bg-primary/85",
  "bg-primary/70",
  "bg-primary/55",
  "bg-primary/40",
  "bg-primary/25",
] as const;

/**
 * Fundo **mais** a cor de traço que fica legível sobre ele — para ladrilho,
 * selo e avatar. Nos dois tons mais claros o traço passa a azul, como o
 * número dentro da barra do funil: branco ali não teria contraste.
 */
export const STAGE_TILE = [
  "bg-primary text-white",
  "bg-primary/85 text-white",
  "bg-primary/70 text-white",
  "bg-primary/55 text-white",
  "bg-primary/40 text-primary",
  "bg-primary/25 text-primary",
] as const;

/** A mesma rampa para SVG e canvas (`stroke-opacity`, `rgba`). */
const STAGE_OPACITY = [1, 0.85, 0.7, 0.55, 0.4, 0.25] as const;

/** Índice preso ao tamanho da rampa: etapa fora dela cai no tom mais claro. */
const atRamp = (length: number, index: number) =>
  Math.min(Math.max(index, 0), length - 1);

export const stageBg = (index: number) => STAGE_BG[atRamp(STAGE_BG.length, index)];

export const stageTile = (index: number) =>
  STAGE_TILE[atRamp(STAGE_TILE.length, index)];

export const stageOpacity = (index: number) =>
  STAGE_OPACITY[atRamp(STAGE_OPACITY.length, index)];

/**
 * A mesma rampa em cinza (`gray-100`, o cinza do texto do sistema), para
 * telas onde o azul em massa pesa: o quadro da esteira na Home tem um avatar,
 * um ponto e um selo por cartão, e em azul a tela inteira virava a cor da
 * marca. A ordem do funil fica no tom; o azul fica para o texto.
 *
 * O tom mais claro para em 30%: abaixo disso o ponto da coluna some no
 * `bg-page` e o avatar some no cartão branco. Branco só sobre os dois mais
 * escuros — no `/70` ele já cai abaixo de 4.5:1; dali em diante as iniciais
 * vão em tinta escura.
 */
export const STAGE_NEUTRAL_BG = [
  "bg-gray-100",
  "bg-gray-100/85",
  "bg-gray-100/70",
  "bg-gray-100/55",
  "bg-gray-100/40",
  "bg-gray-100/30",
] as const;

export const STAGE_NEUTRAL_TILE = [
  "bg-gray-100 text-white",
  "bg-gray-100/85 text-white",
  "bg-gray-100/70 text-black/80",
  "bg-gray-100/55 text-black/80",
  "bg-gray-100/40 text-black/75",
  "bg-gray-100/30 text-black/75",
] as const;

export const stageNeutralBg = (index: number) =>
  STAGE_NEUTRAL_BG[atRamp(STAGE_NEUTRAL_BG.length, index)];

export const stageNeutralTile = (index: number) =>
  STAGE_NEUTRAL_TILE[atRamp(STAGE_NEUTRAL_TILE.length, index)];
