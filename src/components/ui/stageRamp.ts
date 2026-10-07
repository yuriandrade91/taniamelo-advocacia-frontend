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

/** A mesma rampa no dourado da marca, para uso sobre fundo escuro. */
export const STAGE_BG_DARK = [
  "bg-secondary",
  "bg-secondary/85",
  "bg-secondary/70",
  "bg-secondary/55",
  "bg-secondary/40",
  "bg-secondary/25",
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
export const STAGE_OPACITY = [1, 0.85, 0.7, 0.55, 0.4, 0.25] as const;

/** Índice preso ao tamanho da rampa: etapa fora dela cai no tom mais claro. */
const atRamp = (length: number, index: number) =>
  Math.min(Math.max(index, 0), length - 1);

export const stageBg = (index: number, dark = false) =>
  (dark ? STAGE_BG_DARK : STAGE_BG)[atRamp(STAGE_BG.length, index)];

export const stageTile = (index: number) =>
  STAGE_TILE[atRamp(STAGE_TILE.length, index)];

export const stageOpacity = (index: number) =>
  STAGE_OPACITY[atRamp(STAGE_OPACITY.length, index)];
