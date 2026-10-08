/**
 * O desenho das abas da aplicação: segmentos `rounded-xl` num contêiner branco
 * com filete; a ativa em azul, como a ação principal; as outras em cinza. O
 * hover vai para o cinza-claro da página. Sobrescreve o padrão do HeroUI
 * (altura fixa, pílula, opacidade no hover) — as utilitárias vencem por
 * estarem na camada de depois.
 *
 * Só `SegmentedTabs` lê estas classes: as telas usam as peças de lá.
 */

/** O contêiner da lista (`Tabs.ListContainer`). */
export const TAB_LIST_CONTAINER_CLASS = "rounded-2xl bg-white p-1.5 ring-1 ring-light-gray";

/** A lista (`Tabs.List`). */
export const TAB_LIST_CLASS = "gap-1.5 p-0";

/** Cada aba (`Tabs.Tab`). `group` para o conteúdo reagir à aba ativa. */
export const TAB_CLASS =
  "group h-auto gap-2 rounded-xl px-4 py-2.5 whitespace-nowrap text-gray-100 transition active:scale-[0.98] motion-reduce:active:scale-100 hover:bg-page hover:text-primary hover:opacity-100 data-[selected=true]:font-semibold data-[selected=true]:text-white data-[selected=true]:hover:bg-transparent";

/** O fundo da aba ativa (`Tabs.Indicator`). */
export const TAB_INDICATOR_CLASS = "rounded-xl bg-primary shadow-none";
