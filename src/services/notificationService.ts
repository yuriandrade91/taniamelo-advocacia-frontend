"use client";

import httpMessages from "@/constants/messages/httpMessages";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import type { ApiErrorItem, ApiEnvelope } from "@/interfaces/Envelope.interface";
import { toast } from "@heroui/react";
import type { AxiosError, AxiosResponse } from "axios";

/** Monta título/descrição do toast a partir de um array `errors` não vazio. */
function describeApiErrors(errors: ApiErrorItem[]) {
  const messages = errors.map((e) => e.message).filter(Boolean) as string[];
  return {
    title: messages[0] ?? "Erro de validação",
    description:
      messages.join("; ") ||
      "Dado(s) inválido(s). Verifique o(s) campo(s) e tente novamente.",
  };
}

/**
 * Mensagem padrão de sucesso por método HTTP — usada quando a resposta não
 * tem corpo (204) e quem chamou não passou `successMessage` no config da
 * requisição. Chaves em minúsculo porque `AxiosRequestConfig.method` vem
 * assim (`"delete"`, `"put"`...).
 */
const DEFAULT_SUCCESS_MESSAGE_BY_METHOD: Record<string, string> = {
  delete: "Excluído com sucesso.",
  put: "Atualizado com sucesso.",
  patch: "Atualizado com sucesso.",
  post: "Criado com sucesso.",
};

/**. s
 * Extrai a mensagem de negócio de um envelope da API (`errors[0].message`),
 * quando houver. É o único ponto que sabe olhar dentro de `errors` — todo o
 * resto do app (interceptor e telas específicas, como o login) usa isto em
 * vez de reimplementar a checagem de array.
 */
export function getApiErrorMessage(
  envelope: ApiEnvelope<unknown> | undefined | null,
): string | undefined {
  const errors = envelope?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  return describeApiErrors(errors).title;
}

/**
 * Central de notificações: único ponto que decide o que aparece na tela para
 * qualquer requisição, com base no que o endpoint retorna (status, corpo,
 * erro de rede...). O `axiosService` só chama `notifyResponse`/`notifyError`
 * daqui — não monta mensagem sozinho.
 *
 * `notify`/`success`/`info`/`warning`/`danger` seguem o mesmo padrão da API
 * de toast do HeroUI, para uso direto em qualquer outro ponto da tela — em
 * especial a mensagem de sucesso de uma requisição, que é responsabilidade
 * de quem a fez (o backend não diz "o que" foi feito, só que deu certo).
 */
export const notificationCenter = {
  notify: toast,
  success: toast.success,
  info: toast.info,
  warning: toast.warning,
  danger: toast.danger,

  /**
   * Chamado pelo axiosService a cada resposta 2xx.
   * `success: false` é uma falha de negócio que respondeu 2xx (transporte
   * OK, operação não) — sinalizamos sempre, independente do status.
   * Sucesso de verdade é silencioso por padrão (mensagem é responsabilidade
   * de quem fez a chamada), EXCETO:
   *  - a tela passou `successMessage` explícito no config — vale pra
   *    qualquer status 2xx (200 incluso: PATCH de concluir/cancelar, por
   *    exemplo, responde 200 com o compromisso atualizado no corpo);
   *  - 201 (criação) ou 204/sem corpo, mesmo sem `successMessage` — a tela
   *    normalmente só reflete a mudança (item some da lista, aba atualiza)
   *    sem nenhum outro sinal de que a ação deu certo.
   */
  notifyResponse(response: AxiosResponse<ApiEnvelope<unknown>>) {
    const body = response.data;

    // Falha de negócio continua sendo sinalizada mesmo com `skipSuccessToast`:
    // a flag silencia o SUCESSO, não o erro.
    const silentSuccess = response.config?.skipSuccessToast === true;

    if (body != null && body.success === false) {
      const errors = body.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const { title, description } = describeApiErrors(errors);
        toast.warning(title, { description });
        return;
      }

      // `success: false` sem lista estruturada: ainda assim precisa avisar.
      toast.warning(body.message ?? fallbackMessages.GENERIC.OPERATION_FAILED, {
        description: "Revise os dados e tente novamente.",
      });
      return;
    }

    if (silentSuccess) return;

    const explicitMessage = response.config?.successMessage;
    if (explicitMessage) {
      toast.success(explicitMessage);
      return;
    }

    const { status } = response;
    if (status === 201 || status === 204 || body == null) {
      const method = response.config?.method?.toLowerCase();
      const message = method ? DEFAULT_SUCCESS_MESSAGE_BY_METHOD[method] : undefined;
      if (message) toast.success(message);
    }
  },

  /** Chamado pelo axiosService a cada erro de requisição não silenciado (`skipErrorToast`). */
  notifyError(error: AxiosError<ApiEnvelope<unknown>>) {
    if (error.response) {
      const { data, status } = error.response;
      const errors = data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const { title, description } = describeApiErrors(errors);
        toast.danger(title, { description });
        return;
      }

      // Sem lista de erros da API: cai no texto padrão do status (4xx/5xx conhecidos).
      const fallback = httpMessages[status as keyof typeof httpMessages];
      toast.danger(fallback?.title ?? fallbackMessages.GENERIC.TITLE, {
        description:
          fallback?.description ??
          data?.message ??
          fallbackMessages.GENERIC.UNEXPECTED,
      });
      return;
    }

    if (error.request) {
      toast.danger(fallbackMessages.GENERIC.CONNECTION_TITLE, {
        description: fallbackMessages.GENERIC.CONNECTION,
      });
      return;
    }

    toast.danger(fallbackMessages.GENERIC.TITLE, {
      description: error.message ?? fallbackMessages.GENERIC.UNEXPECTED,
    });
  },
};
