/**
 * Os logos servidos de `public/svg`. Caminho absoluto (a partir da raiz), o
 * formato que o Next exige para asset de `public/` em qualquer profundidade.
 *
 * Ícone não mora aqui: é de traço, inline, em `components/ui/icons` — herda a
 * cor de quem usa, o que um `<img>` não faz.
 */
const svgPaths = {
  LOGOS: {
    GOLD: "/svg/gold-logo.svg",
    BLUE: "/svg/blue-logo.svg",
  },
  /** A marca da Tânia, só dela: os demais escritórios usam `LOGOS`. */
  TANIA_LOGOS: {
    GOLD: "/svg/tania/gold-logo.svg",
    BLUE: "/svg/tania/blue-logo.svg",
  },
} as const;

export default svgPaths;
