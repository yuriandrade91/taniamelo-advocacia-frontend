import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O serviço que traduz id de usuário em nome.
 *
 * O que se testa aqui não é "chamou a rota" — é o contrato que as telas
 * dependem: id desconhecido não vira UUID na tela, e a busca leva
 * `includeInactive`, sem o qual justamente os registros antigos (assinados por
 * quem já saiu) voltariam sem nome.
 */

vi.mock("@/services/axiosService", () => ({
  default: { get: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import { indexarPorId, listUsers, nomeDoAutor } from "./userService";
import type { UserSummary } from "@/interfaces/user/User.interface";

const usuarios: UserSummary[] = [
  { id: "u-1", fullName: "Ana Souza", username: "ana", role: "STAFF", active: true },
  { id: "u-2", fullName: "Dr. Almeida", username: "almeida", role: "ADMIN", active: true },
  { id: "u-3", fullName: "Quem Saiu", username: "saiu", role: "LAWYER", active: false },
];

beforeEach(() => vi.clearAllMocks());

describe("indexarPorId", () => {
  it("vira um mapa id -> nome", () => {
    expect(indexarPorId(usuarios)).toEqual({
      "u-1": "Ana Souza",
      "u-2": "Dr. Almeida",
      "u-3": "Quem Saiu",
    });
  });

  it("lista ausente não explode — atendente recebe 403 e fica sem lista", () => {
    expect(indexarPorId(undefined)).toEqual({});
  });

  it("ignora registro sem id ou sem nome em vez de indexar lixo", () => {
    const sujo = [
      { id: "", fullName: "Sem id", username: "x", role: "STAFF", active: true },
      { id: "u-9", fullName: "", username: "y", role: "STAFF", active: true },
    ] as UserSummary[];
    expect(indexarPorId(sujo)).toEqual({});
  });
});

describe("nomeDoAutor", () => {
  const indice = indexarPorId(usuarios);

  it("resolve quem está na lista", () => {
    expect(nomeDoAutor(indice, "u-2")).toBe("Dr. Almeida");
  });

  it("resolve também quem foi desativado — é quem assina registro antigo", () => {
    expect(nomeDoAutor(indice, "u-3")).toBe("Quem Saiu");
  });

  /**
   * O ponto do teste: o retorno é `undefined`, nunca o próprio id. Devolver o
   * UUID "para mostrar alguma coisa" enche a tela de identificador interno e
   * não responde a pergunta que a linha faz — quem mudou isto.
   */
  it("id desconhecido devolve undefined, e não o UUID", () => {
    expect(nomeDoAutor(indice, "u-desconhecido")).toBeUndefined();
  });

  it("sem id não há o que resolver", () => {
    expect(nomeDoAutor(indice, null)).toBeUndefined();
    expect(nomeDoAutor(indice, undefined)).toBeUndefined();
  });
});

describe("listUsers", () => {
  it("repassa includeInactive e não mostra toast de erro", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: usuarios },
    } as never);

    await listUsers({ includeInactive: true });

    const [url, config] = vi.mocked(axiosInstance.get).mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/users$/);
    expect(config).toMatchObject({
      params: { includeInactive: true },
      // 403 de atendente é esperado: a autoria é enfeite de uma tela que
      // funciona sem ela, e o toast faria parecer que a ficha falhou.
      skipErrorToast: true,
    });
  });
});
