import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosResponse } from "axios";

/**
 * O retorno de cada requisição.
 *
 * A regra é "toda gravação tem retorno": POST, PUT, PATCH e DELETE que deram
 * certo viram toast — com a mensagem do serviço ou a padrão do método — e só
 * se calam quando quem chamou pede. Antes um PUT que respondia 200 com corpo
 * (a ficha do cliente) passava sem aviso nenhum.
 */

vi.mock("@heroui/react", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    danger: vi.fn(),
  }),
}));

import { toast } from "@heroui/react";
import { notificationCenter } from "@/services/notificationService";
import { feedback } from "@/services/requestFeedback";

const response = (
  method: string,
  config: Record<string, unknown> = {},
  data: unknown = { success: true, data: { id: "1" } },
  status = 200,
) =>
  ({
    status,
    data,
    config: { method, url: "/api/v1/clients/1", ...config },
  }) as unknown as AxiosResponse;

beforeEach(() => vi.clearAllMocks());

describe("notifyResponse", () => {
  it("avisa a gravação que respondeu 200 com corpo, com a mensagem do serviço", () => {
    notificationCenter.notifyResponse(response("put", feedback("Cliente atualizado.")));
    expect(toast.success).toHaveBeenCalledWith("Cliente atualizado.");
  });

  it("sem mensagem declarada, usa a padrão do método", () => {
    notificationCenter.notifyResponse(response("patch"));
    notificationCenter.notifyResponse(response("post", {}, { success: true, data: {} }, 201));
    notificationCenter.notifyResponse(response("delete", {}, "", 204));
    expect(vi.mocked(toast.success).mock.calls.map(([message]) => message)).toEqual([
      "Alterações salvas.",
      "Salvo.",
      "Excluído.",
    ]);
  });

  it("quem chama troca a mensagem do serviço", () => {
    notificationCenter.notifyResponse(
      response("patch", feedback("Cliente atualizado.", { successMessage: "Situação atualizada." })),
    );
    expect(toast.success).toHaveBeenCalledWith("Situação atualizada.");
  });

  it("cala o sucesso de quem pediu silêncio", () => {
    notificationCenter.notifyResponse(response("put", feedback("Cliente atualizado.", { silent: true })));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("leitura não avisa", () => {
    notificationCenter.notifyResponse(response("get"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("login, refresh e logout não avisam: o retorno é a navegação", () => {
    notificationCenter.notifyResponse(response("post", { url: "/api/v1/auth/login" }));
    notificationCenter.notifyResponse(response("post", { url: "/api/v1/auth/refresh" }));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("2xx com `success: false` é falha de negócio — avisa mesmo calado", () => {
    notificationCenter.notifyResponse(
      response("put", feedback("Cliente atualizado.", { silent: true }), {
        success: false,
        errors: [{ message: "CPF já cadastrado." }],
      }),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith("CPF já cadastrado.", expect.anything());
  });
});
