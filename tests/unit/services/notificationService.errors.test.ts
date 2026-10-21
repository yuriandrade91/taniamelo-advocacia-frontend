import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosError, AxiosResponse } from "axios";

/**
 * Os erros que viram toast, e os que se calam: cada formato de falha que o
 * axios entrega (com resposta, sem resposta, sem nem requisição) tem a sua
 * frase. Com a sessão acabando, nada aparece — quem fala é o login.
 */

vi.mock("@heroui/react", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), info: vi.fn(), warning: vi.fn(), danger: vi.fn() }),
}));
const ending = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/session", () => ({ isSessionEnding: () => ending.value }));

import { toast } from "@heroui/react";
import { getApiErrorMessage, notificationCenter } from "@/services/notificationService";

const error = (shape: Partial<AxiosError<never>>) => shape as AxiosError<never>;

beforeEach(() => {
  vi.clearAllMocks();
  ending.value = false;
});

describe("notifyError", () => {
  it("lista de erros da API: a primeira mensagem é o título, todas a descrição", () => {
    notificationCenter.notifyError(error({ response: { status: 400, data: { errors: [{ message: "CPF inválido" }, { message: "Nome curto" }] } } as never }));
    expect(toast.danger).toHaveBeenCalledWith("CPF inválido", { description: "CPF inválido; Nome curto" });
  });

  it("erros sem mensagem caem no texto genérico de validação", () => {
    notificationCenter.notifyError(error({ response: { status: 400, data: { errors: [{ field: "cpf" }] } } as never }));
    expect(toast.danger).toHaveBeenCalledWith("Erro de validação", { description: expect.stringContaining("inválido") });
  });

  it("sem lista: o texto do status, ou a mensagem do corpo para status sem texto", () => {
    notificationCenter.notifyError(error({ response: { status: 404, data: {} } as never }));
    notificationCenter.notifyError(error({ response: { status: 418, data: { message: "Sou um bule" } } as never }));
    notificationCenter.notifyError(error({ response: { status: 418, data: {} } as never }));
    expect(toast.danger).toHaveBeenCalledTimes(3);
    expect(vi.mocked(toast.danger).mock.calls[1][1]).toEqual({ description: "Sou um bule" });
  });

  it("sem resposta (rede fora) e sem requisição (erro de montagem)", () => {
    notificationCenter.notifyError(error({ request: {} }));
    notificationCenter.notifyError(error({ message: "config inválida" }));
    notificationCenter.notifyError(error({ message: undefined }));
    expect(toast.danger).toHaveBeenCalledTimes(3);
    expect(vi.mocked(toast.danger).mock.calls[1][1]).toEqual({ description: "config inválida" });
  });

  it("com a sessão acabando, cala erro e aviso", () => {
    ending.value = true;
    notificationCenter.notifyError(error({ request: {} }));
    notificationCenter.warning("x");
    notificationCenter.danger("y");
    expect(toast.danger).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });
});

const response = (data: unknown) => ({ status: 200, data, config: { method: "post" } }) as unknown as AxiosResponse;

describe("notifyResponse com success: false", () => {

  it("com lista de erros e sem lista", () => {
    notificationCenter.notifyResponse(response({ success: false, errors: [{ message: "Duplicado" }] }));
    notificationCenter.notifyResponse(response({ success: false, message: "Não deu" }));
    notificationCenter.notifyResponse(response({ success: false }));
    expect(toast.warning).toHaveBeenCalledTimes(3);
  });

  it("leitura sem método conhecido não vira toast", () => {
    notificationCenter.notifyResponse({ status: 200, data: { success: true }, config: {} } as unknown as AxiosResponse);
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("getApiErrorMessage", () => {
  it("lê errors[0].message e ignora o resto", () => {
    expect(getApiErrorMessage({ errors: [{ message: "Credenciais inválidas" }] })).toBe("Credenciais inválidas");
    expect(getApiErrorMessage({ errors: [] })).toBeUndefined();
    expect(getApiErrorMessage(undefined)).toBeUndefined();
  });
});
