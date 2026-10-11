import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import { readableWait } from "@/lib/retryAfter";
import { digitsOf } from "@/lib/masks/masks";
import { pendingIntegration } from "@/services/pendingIntegration";

/**
 * Consulta de CEP — CepController. Rota: GET /api/v1/cep/{cep}
 *
 * Os campos já vêm com os nomes do endereço do cliente (`street`,
 * `neighborhood`, `city`, `state`), e não com os do provedor (`logradouro`,
 * `bairro`...). A tela copia campo a campo, sem tradução.
 */
export type CepLookupResponse = {
  /** No formato em que é gravado: `30240-000`. */
  zipCode: string;
  street: string | null;
  /**
   * Complemento **do CEP** ("lado ímpar", "até 999"), não o do cliente. Não
   * vai para o campo Complemento: lá mora "apto 302", e misturar os dois
   * gravaria uma faixa de numeração como se fosse o apartamento de alguém.
   */
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  /** Sigla de 2 letras. */
  state: string | null;
};

/**
 * O resultado já dito em termos de tela.
 *
 * Cada resposta do backend vira um estado que a seção sabe desenhar. O erro
 * não sai como exceção porque nenhum deles impede o cadastro: CEP é atalho
 * para preencher, não validação — a pessoa sempre pode digitar o endereço.
 */
type CepLookupResult =
  | { status: "found"; address: CepLookupResponse }
  /** 400 ou menos de 8 dígitos: nem sai para a rede. */
  | { status: "invalid" }
  /** 404 — o CEP não existe. */
  | { status: "not-found" }
  /** 429 — cota do usuário. `message` já diz quando tentar de novo. */
  | { status: "rate-limited"; message: string }
  /** 5xx, timeout, rede: o provedor não respondeu. */
  | { status: "unavailable" };

/** Oito dígitos — o único requisito do backend. */
export const isCompleteCep = (value: string) => digitsOf(value).length === 8;

type HttpError = {
  response?: { status?: number; headers?: Record<string, unknown> };
};

export const lookupCep = async (value: string): Promise<CepLookupResult> => {
  const digits = digitsOf(value);
  if (digits.length !== 8) return { status: "invalid" };

  // Ambiente sem a rota: um 404 de rota inexistente seria lido como "CEP não
  // encontrado" — mentira para quem digitou um CEP válido. Pausada, a consulta
  // nem sai, e a tela diz que não deu para consultar.
  if (pendingIntegration("cep")) return { status: "unavailable" };

  try {
    const { data } = await axiosInstance.get<ApiEnvelope<CepLookupResponse>>(
      endpoints.CEP.LOOKUP(digits),
      // A seção mostra o resultado no próprio campo. Um toast vermelho para
      // "CEP não encontrado" trataria como falha o que é só um atalho que
      // não deu — a pessoa segue digitando o endereço.
      { skipErrorToast: true },
    );
    const address = data?.data;
    return address ? { status: "found", address } : { status: "not-found" };
  } catch (error) {
    const response = (error as HttpError)?.response;
    switch (response?.status) {
      case 400:
        return { status: "invalid" };
      case 404:
        return { status: "not-found" };
      case 429: {
        const wait = readableWait(
          response.headers?.["retry-after"] as string | undefined,
        );
        return {
          status: "rate-limited",
          message: wait
            ? `Muitas consultas de CEP. Tente novamente ${wait}.`
            : "Muitas consultas de CEP. Tente novamente em instantes.",
        };
      }
      default:
        return { status: "unavailable" };
    }
  }
};
