"use client";

import httpMessages from "@/constants/messages/httpMessages";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import type { ApiErrorItem, ApiEnvelope } from "@/interfaces/Envelope.interface";
import { toast } from "@heroui/react";
import type { AxiosError, AxiosResponse } from "axios";
import { isSessionEnding } from "@/lib/session";

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
 * Mensagem padrão de sucesso por método HTTP — para a gravação que não
 * declarou a sua (`successMessage`, ver `requestFeedback`). Chaves em
 * minúsculo porque `AxiosRequestConfig.method` vem assim (`"delete"`, `"put"`…).
 */
const DEFAULT_SUCCESS_MESSAGE_BY_METHOD: Record<string, string> = {
  delete: "Excluído.",
  put: "Alterações salvas.",
  patch: "Alterações salvas.",
  post: "Salvo.",
};

/**
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
 * Aviso de problema que se cala enquanto a sessão acaba (`isSessionEnding`):
 * a tela ainda reage aos 401 das requisições que estavam no ar — um "não foi
 * possível carregar" por cartão — no instante em que o navegador já está indo
 * para o login. Quem precisa saber do fim da sessão é avisado lá, uma vez.
 */
const unlessSessionEnding =
  <Args extends unknown[]>(show: (...args: Args) => unknown) =>
  (...args: Args): void => {
    if (!isSessionEnding()) show(...args);
  };

/**
 * Central de notificações: único ponto que decide o que aparece na tela para
 * qualquer requisição, com base no que o endpoint retorna (status, corpo,
 * erro de rede...). O `axiosService` só chama `notifyResponse`/`notifyError`
 * daqui — não monta mensagem sozinho.
 *
 * **Toda gravação tem retorno.** POST, PUT, PATCH e DELETE bem-sucedidos
 * viram toast de sucesso — com a mensagem que o serviço declarou
 * (`requestFeedback`) ou, sem ela, a padrão do método. Só se cala quem pediu
 * (`silent`): o fluxo de várias requisições que avisa uma vez no fim, a ação
 * com janela de desfazer que já avisou no clique. Leitura (GET) não tem toast
 * de sucesso — seria um aviso por lista carregada.
 *
 * `notify`/`success`/`info`/`warning`/`danger` seguem a API de toast do
 * HeroUI, para o aviso que não é de uma requisição (copiar, validar) e para
 * o aviso consolidado de um fluxo.
 */
export const notificationCenter = {
  notify: toast,
  success: toast.success,
  info: toast.info,
  warning: unlessSessionEnding(toast.warning),
  danger: unlessSessionEnding(toast.danger),

  /**
   * Chamado pelo axiosService a cada resposta 2xx.
   *
   * `success: false` é falha de negócio que respondeu 2xx (transporte OK,
   * operação não) — sinalizada sempre, mesmo com `skipSuccessToast`. Sucesso
   * de gravação vira toast (ver acima); sucesso de leitura, só com
   * `successMessage` explícito.
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

    // Login, refresh e logout: o retorno é a navegação, não um toast.
    if (response.config?.url?.includes("/auth/")) return;

    const method = response.config?.method?.toLowerCase();
    const message = method ? DEFAULT_SUCCESS_MESSAGE_BY_METHOD[method] : undefined;
    if (message) toast.success(message);
  },

  /** Chamado pelo axiosService a cada erro de requisição não silenciado (`skipErrorToast`). */
  notifyError(error: AxiosError<ApiEnvelope<unknown>>) {
    if (isSessionEnding()) return;
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
