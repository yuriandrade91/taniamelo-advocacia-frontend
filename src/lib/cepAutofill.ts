import type { CepLookupResponse } from "@/services/cepService";
import { digitsOf } from "@/lib/masks/masks";

/** Os campos de endereço que um CEP sabe preencher. */
export type CepFillable = {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

/**
 * O que um CEP encontrado escreve no formulário.
 *
 * Campo que o CEP traz substitui o que estava lá: trocar o CEP é dizer "o
 * endereço é outro", e manter a rua antiga com a cidade nova montaria um
 * endereço que não existe.
 *
 * Campo que o CEP **não** traz fica como está. CEP de cidade pequena é um só
 * para o município inteiro e vem sem rua nem bairro; apagar o que a pessoa já
 * digitou por causa disso seria punir quem preencheu primeiro.
 *
 * Número e complemento nunca são tocados — o CEP não sabe nenhum dos dois.
 */
export function cepPatch(
  current: CepFillable,
  found: CepLookupResponse,
): CepFillable {
  const keep = (next: string | null | undefined, previous: string) =>
    next && next.trim() ? next.trim() : previous;

  return {
    zipCode: keep(found.zipCode, current.zipCode),
    street: keep(found.street, current.street),
    neighborhood: keep(found.neighborhood, current.neighborhood),
    city: keep(found.city, current.city),
    state: keep(found.state, current.state).toUpperCase(),
  };
}

/** Os campos que o CEP preenche e que, preenchidos por ele, travam. */
export type CepLockable = "street" | "neighborhood" | "city" | "state";

/**
 * O campo veio do CEP e deve ficar desabilitado?
 *
 * Trava só o que o CEP **de fato** trouxe: CEP de município inteiro chega sem
 * rua e sem bairro, e travar esses dois em branco deixaria o endereço sem
 * como ser completado.
 *
 * Deriva dos valores atuais em vez de guardar uma lista de travados. Na tela de
 * cadastro, remover a aba "Endereço 1" desloca os valores das outras abas para
 * cima — um estado de "travado" guardado por componente ficaria preso à aba
 * errada. Comparando com o CEP digitado agora, a trava acompanha o endereço:
 * trocou o CEP (ou os valores vieram de outra aba), destrava.
 */
export function isCepLocked(
  found: CepLookupResponse | null,
  current: CepFillable,
  field: CepLockable,
): boolean {
  if (!found) return false;
  if (digitsOf(current.zipCode) !== digitsOf(found.zipCode ?? "")) return false;

  const fromCep = (found[field] ?? "").trim();
  if (!fromCep) return false;
  const expected = field === "state" ? fromCep.toUpperCase() : fromCep;
  return current[field] === expected;
}

/**
 * A resposta do CEP como texto, para morar nos valores de um formulário.
 *
 * `useSectionForm` só aceita `string | boolean` por campo — é o que as regras
 * de validação recebem. Guardar a resposta ali (e não num estado da seção) é o
 * que mantém a trava quando a aba desmonta; serializar é o preço disso.
 */
export function encodeCepLookup(found: CepLookupResponse | null): string {
  return found ? JSON.stringify(found) : "";
}

/** O inverso de `encodeCepLookup`. Texto vazio ou ilegível não trava nada. */
export function decodeCepLookup(
  raw: string | null | undefined,
): CepLookupResponse | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CepLookupResponse | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** A mensagem que o campo CEP mostra para cada desfecho que não preencheu. */
export const CEP_MESSAGES = {
  loading: "Buscando endereço…",
  notFound: "CEP não encontrado. Preencha o endereço manualmente.",
  unavailable:
    "Não foi possível consultar o CEP agora. Preencha o endereço manualmente.",
} as const;
