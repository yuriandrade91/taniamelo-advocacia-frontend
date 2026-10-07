/**
 * "Há algo digitado que se perderia?" — a pergunta do botão Cancelar.
 *
 * Compara com o estado **inicial** da seção, e não com "vazio": algumas seções
 * nascem com valor (o primeiro endereço já vem como principal, por exemplo), e
 * contar isso como preenchimento faria o aviso aparecer num formulário que
 * ninguém tocou.
 *
 * Texto só com espaços não conta: não é dado que alguém lamente perder.
 */
export function sectionHasInput<V extends Record<string, unknown>>(
  values: V,
  initial: V,
): boolean {
  return (Object.keys(values) as (keyof V)[]).some((key) => {
    const value = values[key];
    const start = initial[key];
    if (typeof value === "string") {
      return value.trim() !== (typeof start === "string" ? start.trim() : "");
    }
    return value !== start;
  });
}
