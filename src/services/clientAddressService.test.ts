import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O lote de endereços.
 *
 * O cadastro grava até três endereços ao criar o cliente. Com um POST por
 * endereço, cada um tinha transação própria — o segundo falhando deixava o
 * primeiro no banco e a ficha pela metade. O que se garante aqui é o formato
 * que o backend espera (`{ addresses: [...] }`) e a rota certa; a atomicidade
 * é do outro lado.
 */

vi.mock("@/services/axiosService", () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import { createAddresses } from "./clientAddressService";
import type { ClientAddressRequest } from "@/interfaces/client/ClientSubResources.interface";

const endereco = (street: string, isPrimary = false): ClientAddressRequest => ({
  street,
  city: "Belo Horizonte",
  state: "MG",
  isPrimary,
});

beforeEach(() => vi.clearAllMocks());

describe("createAddresses", () => {
  it("envia uma requisição só, para /addresses/batch, com a lista embrulhada", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: { success: true, data: [] },
    } as never);

    await createAddresses("cli-1", [endereco("Rua A", true), endereco("Rua B")]);

    expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    const [url, body] = vi.mocked(axiosInstance.post).mock.calls[0];
    expect(url).toMatch(/\/clients\/cli-1\/addresses\/batch$/);
    // O backend recebe `ClientAddressBatchRequestDTO`, não um array cru: uma
    // lista solta volta 400 com "Informe ao menos um endereço".
    expect(body).toEqual({
      addresses: [endereco("Rua A", true), endereco("Rua B")],
    });
  });

  it("não compartilha o array de quem chamou", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: { success: true, data: [] },
    } as never);

    const enviados = [endereco("Rua A", true)];
    await createAddresses("cli-1", enviados);

    const [, body] = vi.mocked(axiosInstance.post).mock.calls[0];
    expect((body as { addresses: unknown[] }).addresses).not.toBe(enviados);
  });

  it("devolve os criados na ordem enviada", async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        success: true,
        data: [{ id: "end-1" }, { id: "end-2" }],
      },
    } as never);

    const envelope = await createAddresses("cli-1", [
      endereco("Rua A", true),
      endereco("Rua B"),
    ]);

    expect(envelope.data?.map((item) => item.id)).toEqual(["end-1", "end-2"]);
  });
});
