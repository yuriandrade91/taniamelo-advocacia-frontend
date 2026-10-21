/**
 * O corpo como ele chega ao backend: serializado e lido de volta. Chave com
 * `undefined` some do JSON — é isso que vários testes de payload conferem, e
 * por isso não é um `structuredClone` (que manteria a chave).
 */
export function overTheWire<T = Record<string, unknown>>(value: unknown): T {
  const text = JSON.stringify(value);
  return JSON.parse(text) as T;
}
