import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Consulta de CEP pelo backend (`GET /cep/{cep}`).
 *
 * O que se garante: a rota certa, só com dígitos; nenhum toast global (o
 * campo mostra o resultado); e cada resposta do servidor virando um estado que
 * a tela sabe desenhar, sem exceção — CEP é atalho, não pode travar cadastro.
 */

vi.mock("@/services/axiosService", () => ({
  default: { get: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import { isCompleteCep, lookupCep } from "./cepService";

const found = {
  zipCode: "30240-000",
  street: "Rua dos Timbiras",
  complement: "lado ímpar",
  neighborhood: "Funcionários",
  city: "Belo Horizonte",
  state: "MG",
};

const httpFailure = (status: number, headers: Record<string, string> = {}) => ({
  response: { status, headers },
});

beforeEach(() => vi.clearAllMocks());

describe("lookupCep", () => {
  it("consulta /cep/{digitos}, sem pontuação e sem toast de erro", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: found },
    } as never);

    const result = await lookupCep("30.240-000");

    expect(result).toEqual({ status: "found", address: found });
    const [url, config] = vi.mocked(axiosInstance.get).mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/cep\/30240000$/);
    expect(config).toMatchObject({ skipErrorToast: true });
  });

  it("menos de 8 dígitos nem sai para a rede", async () => {
    expect(await lookupCep("3024-00")).toEqual({ status: "invalid" });
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it("404 é CEP inexistente", async () => {
    vi.mocked(axiosInstance.get).mockRejectedValue(httpFailure(404));
    expect(await lookupCep("99999-999")).toEqual({ status: "not-found" });
  });

  it("429 diz quando tentar de novo, a partir do Retry-After", async () => {
    vi.mocked(axiosInstance.get).mockRejectedValue(
      httpFailure(429, { "retry-after": "60" }),
    );
    expect(await lookupCep("30240-000")).toEqual({
      status: "rate-limited",
      message: "Muitas consultas de CEP. Tente novamente em 1 minuto.",
    });
  });

  it("429 sem Retry-After não inventa prazo", async () => {
    vi.mocked(axiosInstance.get).mockRejectedValue(httpFailure(429));
    const result = await lookupCep("30240-000");
    expect(result).toMatchObject({ status: "rate-limited" });
    expect(result.status === "rate-limited" && result.message).toMatch(
      /em instantes/,
    );
  });

  it("provedor fora do ar (500) e falha de rede viram indisponível", async () => {
    vi.mocked(axiosInstance.get).mockRejectedValueOnce(httpFailure(500));
    expect(await lookupCep("30240-000")).toEqual({ status: "unavailable" });

    vi.mocked(axiosInstance.get).mockRejectedValueOnce(new Error("Network"));
    expect(await lookupCep("30240-000")).toEqual({ status: "unavailable" });
  });
});

describe("isCompleteCep", () => {
  it("conta só os dígitos", () => {
    expect(isCompleteCep("30240-000")).toBe(true);
    expect(isCompleteCep("30.240-000")).toBe(true);
    expect(isCompleteCep("30240-00")).toBe(false);
  });
});
