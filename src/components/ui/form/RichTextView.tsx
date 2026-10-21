import { RICH_TEXT_CLASS, safeRichText } from "@/lib/richText";

/**
 * O texto do editor rico, só para ler: negrito, listas e citação como foram
 * escritos. Sem o TipTap — mostrar não precisa do editor, e ele é a
 * dependência mais pesada do formulário.
 */
export function RichTextView({ html, className = "" }: Readonly<{ html: string; className?: string }>) {
  return (
    <div
      className={`${RICH_TEXT_CLASS} ${className}`}
      // Só as marcas do editor, sem atributo: ver `safeRichText`.
      dangerouslySetInnerHTML={{ __html: safeRichText(html) }}
    />
  );
}
