import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * O guarda de id do `clientService`.
 *
 * Existe por causa de um defeito real: a ficha de um cliente sem id na
 * listagem virava `GET /api/v1/clients/undefined`, e o backend respondia
 * "Valor inválido para o parâmetro 'clientId': undefined" — mandando
 * investigar a API, que não tinha nada a ver com o problema.
 *
 * A causa é uma armadilha da linguagem: `String(undefined)` é `"undefined"`,
 * uma string verdadeira que passa por qualquer `if (!id)`.
 */

vi.mock("@/services/axiosService", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from "@/services/axiosService";
import {
  clientById,
  clients,
  clientSituationHistory,
  createClient,
  deleteClient,
  revealInssPassword,
  updateClient,
} from "./clientService";

const chamadas = [
  ["clientById", (id: string) => clientById(id)],
  ["deleteClient", (id: string) => deleteClient(id)],
  ["revealInssPassword", (id: string) => revealInssPassword(id)],
  ["clientSituationHistory", (id: string) => clientSituationHistory(id)],
  ["updateClient", (id: string) => updateClient(id, {} as never)],
] as const;

const idsInvalidos = ["undefined", "null", "", "   "];

beforeEach(() => vi.clearAllMocks());

describe("id ausente não vira requisição", () => {
  for (const [nome, chamar] of chamadas) {
    for (const id of idsInvalidos) {
      it(`${nome} recusa ${JSON.stringify(id)} sem chamar a API`, async () => {
        await expect(chamar(id)).rejects.toThrow(/id de cliente ausente/i);

        // A parte que importa: NADA foi enviado. Um guarda que recusa mas deixa
        // a requisição sair não conserta nada.
        expect(axiosInstance.get).not.toHaveBeenCalled();
        expect(axiosInstance.delete).not.toHaveBeenCalled();
        expect(axiosInstance.put).not.toHaveBeenCalled();
      });
    }
  }

  it("a mensagem diz onde procurar: no chamador, não na API", async () => {
    await expect(clientById("undefined")).rejects.toThrow(/clientById/);
    await expect(clientById("undefined")).rejects.toThrow(/quem chamou/i);
  });
});

describe("id válido passa", () => {
  it("um UUID chega à API normalmente", async () => {
    const id = "938d937e-9916-41a0-ba1b-766e40b6c9a1";
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: { data: { id } } });

    await clientById(id);

    expect(axiosInstance.get).toHaveBeenCalledOnce();
    expect(vi.mocked(axiosInstance.get).mock.calls[0][0]).toContain(id);
  });

  it("o guarda não é um validador de UUID", async () => {
    // Recusar qualquer coisa que não pareça UUID seria tentador e errado: o id
    // é contrato do backend, e a tela não é o lugar para decidir o formato dele.
    // O que se recusa aqui é a AUSÊNCIA de id, que é um defeito da tela.
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: { data: {} } });
    await expect(clientById("123")).resolves.toBeDefined();
  });
});

/**
 * O rename do id do cliente.
 *
 * O backend passou a mandar `clientId` no lugar de `id` para o recurso cliente
 * (commit `e142a83`), e a tela inteira lê `client.id`: a listagem para abrir a
 * ficha, o kanban da home, o seletor da carteira, os leads pendentes. Sem a
 * tradução, todos recebem `undefined` — e a ficha vira
 * `GET /clients/undefined`, com o backend reclamando de um parâmetro que a
 * tela nunca teve.
 */
describe("clientId da API vira id da tela", () => {
  const UUID = "938d937e-9916-41a0-ba1b-766e40b6c9a1";

  it("a listagem traz id preenchido a partir de clientId", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        success: true,
        data: [{ clientId: UUID, fullName: "Maria" }],
        pagination: { pageNumber: 1 },
        errors: null,
      },
    });

    const envelope = await clients();

    expect(envelope.data?.[0]?.id).toBe(UUID);
    // E o nome do contrato continua disponível para quem preferir usá-lo.
    expect(envelope.data?.[0]?.clientId).toBe(UUID);
    // A paginação não pode se perder no caminho: a listagem depende dela.
    expect(envelope.pagination).toEqual({ pageNumber: 1 });
  });

  it("a ficha também", async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: { clientId: UUID, fullName: "Maria" } },
    });

    expect((await clientById(UUID)).id).toBe(UUID);
  });

  it("o cliente recém-criado também — é o caminho que mais esconde o defeito", async () => {
    // Quem cria usa o id da resposta em seguida (abrir a ficha, anexar
    // arquivo). Se só a listagem fosse traduzida, este caminho quebraria
    // sozinho e pareceria outro problema.
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: { success: true, data: { clientId: UUID, fullName: "Maria" } },
    });

    expect((await createClient({} as never)).data?.id).toBe(UUID);
  });

  it("se a API voltar a mandar `id`, continua funcionando", async () => {
    // Enquanto durar a transição, uma instância pode estar num build anterior.
    // Recusar `id` aqui trocaria um defeito por outro.
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: [{ id: UUID, fullName: "Maria" }] },
    });

    expect((await clients()).data?.[0]?.id).toBe(UUID);
  });

  it("sem nenhum dos dois, o id fica indefinido — e o guarda cuida do resto", async () => {
    // Não inventamos id. A listagem renderiza, e a tentativa de abrir a ficha
    // falha com mensagem clara em vez de virar `/clients/undefined`.
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: { success: true, data: [{ fullName: "Maria" }] },
    });

    const item = (await clients()).data?.[0];
    expect(item?.id).toBeUndefined();
    await expect(clientById(String(item?.id))).rejects.toThrow(
      /id de cliente ausente/i,
    );
  });
});
