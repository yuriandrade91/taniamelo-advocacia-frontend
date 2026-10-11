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
  default: { get: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import {
  changeMyPassword,
  updateMyProfile,
  indexById,
  listUsers,
  myProfile,
} from "@/services/userService";
import type { UserSummary } from "@/interfaces/user/User.interface";

const users: UserSummary[] = [
  { id: "u-1", fullName: "Ana Souza", username: "ana", role: "STAFF", active: true },
  { id: "u-2", fullName: "Dr. Almeida", username: "almeida", role: "ADMIN", active: true },
  { id: "u-3", fullName: "Quem Saiu", username: "saiu", role: "LAWYER", active: false },
];

beforeEach(() => vi.clearAllMocks());

describe("indexById", () => {
  it("vira um mapa id -> nome", () => {
    expect(indexById(users)).toEqual({
      "u-1": "Ana Souza",
      "u-2": "Dr. Almeida",
      "u-3": "Quem Saiu",
    });
  });

  it("lista ausente não explode — atendente recebe 403 e fica sem lista", () => {
    expect(indexById(undefined)).toEqual({});
  });

  it("ignora registro sem id ou sem nome em vez de indexar lixo", () => {
    const dirty = [
      { id: "", fullName: "Sem id", username: "x", role: "STAFF", active: true },
      { id: "u-9", fullName: "", username: "y", role: "STAFF", active: true },
    ] as UserSummary[];
    expect(indexById(dirty)).toEqual({});
  });
});

describe("listUsers", () => {
  it("repassa includeInactive e não mostra toast de erro", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: users },
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


/**
 * Estes testes voltaram a valer.
 *
 * A pausa é por ambiente (`NEXT_PUBLIC_PENDING_INTEGRATIONS`), e o Vitest roda
 * sem ela — então o serviço chama o axios como sempre chamou, e a asserção é
 * sobre a requisição de verdade. É o comportamento que se quer: o contrato
 * continua verificado em toda execução, mesmo com a rota pausada em algum
 * servidor.
 */
describe("/me", () => {
  const get = vi.mocked(axiosInstance.get);
  const put = vi.mocked(axiosInstance.put);
  const patch = vi.mocked(axiosInstance.patch);

  beforeEach(() => {
    get.mockResolvedValue({ data: { success: true, data: {} } });
    put.mockResolvedValue({ data: { success: true, data: {} } });
    patch.mockResolvedValue({ data: { success: true } });
  });

  it("não leva id na URL — o servidor lê a pessoa do token", async () => {
    await myProfile();
    const url = get.mock.calls[0][0];
    expect(url).toMatch(/\/users\/me$/);
  });

  it("ler o próprio cadastro NÃO silencia erro, ao contrário da lista", async () => {
    // A lista é enfeite (resolver nome de autoria); esta tela inteira depende
    // da resposta. Formulário em branco sem aviso convida a salvar por cima.
    await myProfile();
    // Sem config nenhuma também serve — o que não pode é pedir silêncio.
    const config = get.mock.calls[0][1] ?? {};
    expect(config).not.toHaveProperty("skipErrorToast", true);
  });

  it("a lista continua silenciando — atendente recebe 403 e a ficha funciona sem", async () => {
    await listUsers();
    expect(get.mock.calls[0][1]).toMatchObject({ skipErrorToast: true });
  });

  it("atualizar manda só nome e e-mail — username e papel não se editam daqui", async () => {
    await updateMyProfile({ fullName: "Ana", email: "ana@x.com" });
    expect(put.mock.calls[0][1]).toEqual({
      fullName: "Ana",
      email: "ana@x.com",
    });
  });

  it("trocar senha silencia o toast: o erro pertence a um campo", async () => {
    await changeMyPassword({ currentPassword: "a", newPassword: "b" });
    expect(patch.mock.calls[0][0]).toMatch(/\/users\/me\/password$/);
    expect(patch.mock.calls[0][2]).toMatchObject({ skipErrorToast: true });
  });

  it("a senha vai no corpo, nunca na URL", async () => {
    await changeMyPassword({
      currentPassword: "segredo",
      newPassword: "outroSegredo",
    });
    expect(patch.mock.calls[0][0]).not.toContain("segredo");
    expect(patch.mock.calls[0][2]).not.toHaveProperty("params");
  });
});
