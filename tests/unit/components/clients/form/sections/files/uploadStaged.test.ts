import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O envio dos arquivos escolhidos (`uploadStagedFiles`).
 *
 * O caso que este arquivo trava: a estrela de "principal" marcada na tela não
 * chegava ao servidor. O upload não recebe a escolha, e o backend faz
 * principal a última simulação do lote — marcar a v1 e enviar v1 e v2
 * gravava a v2 como principal.
 */

vi.mock("@/services/clientFileService", () => ({
  uploadDocuments: vi.fn(),
  uploadSimulations: vi.fn(),
  markPrincipalSimulation: vi.fn(),
}));

import {
  markPrincipalSimulation,
  uploadDocuments,
  uploadSimulations,
} from "@/services/clientFileService";
import { principalIdOf, uploadStagedFiles } from "@/components/clients/form/sections/files/uploadStaged";
import {
  newStagedDocument,
  newStagedSimulation,
  type StagedSimulation,
} from "@/components/clients/form/sections/files/types";

const CLIENT = "c1";
const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });

const simulation = (name: string, isPrincipal = false): StagedSimulation => ({
  ...newStagedSimulation(pdf(name)),
  simulationDate: "2026-10-01",
  version: "1",
  vinculos: "3",
  notes: "cenário",
  isPrincipal,
});
const stagedDocument = (name: string) => ({ ...newStagedDocument(pdf(name)), documentType: "OUTROS", notes: "RG" });

/** O que o servidor devolve para o lote: um id por arquivo, na ordem do envio. */
const created = (...ids: string[]) => ({ data: ids.map((id) => ({ id, originalFilename: id })) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadDocuments).mockResolvedValue({ data: [] });
  vi.mocked(markPrincipalSimulation).mockResolvedValue({});
});

describe("principalIdOf", () => {
  it("a posição da marcada na tela dá o id gravado", () => {
    expect(principalIdOf([{ isPrincipal: false }, { isPrincipal: true }], [{ id: "a" }, { id: "b" }])).toBe("b");
  });

  it("nenhuma marcada: nada a fazer, vale a regra do backend", () => {
    expect(principalIdOf([{ isPrincipal: false }], [{ id: "a" }])).toBeNull();
  });

  it("resposta com outra contagem: não chuta qual é qual", () => {
    expect(principalIdOf([{ isPrincipal: true }, { isPrincipal: false }], [{ id: "a" }])).toBeNull();
  });
});

describe("uploadStagedFiles", () => {
  it("marca como principal a simulação escolhida, não a última do lote", async () => {
    vi.mocked(uploadSimulations).mockResolvedValue(created("v1", "v2"));

    const sent = await uploadStagedFiles(CLIENT, [], [simulation("v1.pdf", true), simulation("v2.pdf")]);

    expect(sent).toEqual({ documents: true, simulations: true });
    expect(markPrincipalSimulation).toHaveBeenCalledExactlyOnceWith(CLIENT, "v1", { silent: true });
  });

  it("sem escolha, não pede a marca", async () => {
    vi.mocked(uploadSimulations).mockResolvedValue(created("v1", "v2"));

    await uploadStagedFiles(CLIENT, [], [simulation("v1.pdf"), simulation("v2.pdf")]);

    expect(markPrincipalSimulation).not.toHaveBeenCalled();
  });

  it("documentos e simulações saem em dois envios, com o `options` de quem chama", async () => {
    vi.mocked(uploadSimulations).mockResolvedValue(created("s1"));

    await uploadStagedFiles(CLIENT, [stagedDocument("rg.pdf")], [simulation("s1.pdf")], { silent: true });

    expect(uploadDocuments).toHaveBeenCalledExactlyOnceWith(CLIENT, expect.any(FormData), { silent: true });
    expect(uploadSimulations).toHaveBeenCalledExactlyOnceWith(CLIENT, expect.any(FormData), { silent: true });
  });

  it("sem arquivo de um lado, aquele lado não vira requisição", async () => {
    await uploadStagedFiles(CLIENT, [stagedDocument("rg.pdf")], []);

    expect(uploadDocuments).toHaveBeenCalledOnce();
    expect(uploadSimulations).not.toHaveBeenCalled();
  });

  it("um lado falhar não segura o outro, e cada um volta dizendo se entrou", async () => {
    vi.mocked(uploadDocuments).mockRejectedValue(new Error("400"));
    vi.mocked(uploadSimulations).mockResolvedValue(created("s1"));

    const sent = await uploadStagedFiles(CLIENT, [stagedDocument("rg.pdf")], [simulation("s1.pdf")]);

    expect(sent).toEqual({ documents: false, simulations: true });
  });

  it("simulações recusadas: não sobe nada, e não há o que marcar", async () => {
    vi.mocked(uploadSimulations).mockRejectedValue(new Error("400"));

    const sent = await uploadStagedFiles(CLIENT, [], [simulation("s1.pdf", true)]);

    expect(sent.simulations).toBe(false);
    expect(markPrincipalSimulation).not.toHaveBeenCalled();
  });

  it("só a marca falhar não conta as simulações como não enviadas — senão o próximo Salvar as duplicaria", async () => {
    vi.mocked(uploadSimulations).mockResolvedValue(created("v1", "v2"));
    vi.mocked(markPrincipalSimulation).mockRejectedValue(new Error("500"));

    const sent = await uploadStagedFiles(CLIENT, [], [simulation("v1.pdf", true), simulation("v2.pdf")]);

    expect(sent).toEqual({ documents: true, simulations: true });
  });

  it("vínculos sai como número; vazio não vira 0", async () => {
    vi.mocked(uploadSimulations).mockResolvedValue(created("a", "b"));

    await uploadStagedFiles(CLIENT, [], [simulation("a.pdf"), { ...simulation("b.pdf"), vinculos: "" }]);

    const form = vi.mocked(uploadSimulations).mock.calls[0][1];
    const metadata = JSON.parse(await (form.get("metadata") as Blob).text());
    expect(metadata.map((item: { vinculos?: number }) => item.vinculos)).toEqual([3, undefined]);
  });
});
