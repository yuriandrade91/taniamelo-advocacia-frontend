/**
 * O HTML do editor rico (`RichTextField`) pronto para ser mostrado fora dele —
 * a Revisão do cadastro, por exemplo — sem perder a formatação.
 *
 * Mostrar exige `innerHTML`, e o texto pode ter vindo de fora do editor
 * (colado, ou gravado na API por outro cliente). Por isso só passam as marcas
 * que a barra do editor produz, e **sem atributo nenhum**: `onerror`, `style`
 * e `href` ficam de fora junto com `<script>`, `<img>` e `<a>`. O texto entre
 * as marcas continua como veio — o editor já o entrega escapado (`&lt;`).
 */

/** As marcas da barra do editor (StarterKit): parágrafo, ênfases, listas, citação. */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
]);

/**
 * Toda marca, de abertura ou fechamento, com o que vier dentro dela até o `>`;
 * ou um `<` que não abre marca nenhuma.
 */
const TAG_OR_STRAY = /<(\/?)([a-z][a-z0-9]*)\b[^>]*>|</gi;

/**
 * Todo `<` da saída é de uma marca da lista: o solto vira texto. Sem isso,
 * tirar a marca de `<<img>img onerror=…>` deixaria o primeiro `<` colado no
 * resto, e o resultado seria um `<img>` inteiro.
 */
export function safeRichText(html: string): string {
  return html.replaceAll(TAG_OR_STRAY, (_match, closing: string | undefined, name: string | undefined) => {
    if (name === undefined) return "&lt;";
    const tag = name.toLowerCase();
    return ALLOWED_TAGS.has(tag) ? `<${closing}${tag}>` : "";
  });
}

/**
 * A tipografia do conteúdo — a mesma no editor e em quem o mostra, para o
 * relato não mudar de cara entre escrever e revisar. O Tailwind zera listas e
 * citações por padrão; aqui elas voltam.
 */
export const RICH_TEXT_CLASS =
  "[&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-secondary/50 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500";
