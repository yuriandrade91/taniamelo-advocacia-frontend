import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * As rotas e as opções de cada chamada de arquivos — o que só se vê na
 * requisição: o upload sem `Content-Type` fixo (o navegador põe o boundary),
 * o download como blob e com o token (pelo axios, nunca pelo `downloadUrl`),
 * e a principal pela rota própria.
 */

vi.mock("@/services/axiosService", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from "@/services/axiosService";
import {
  deleteFile,
  downloadClientFile,
  FILE_TRANSFER_TIMEOUT_MS,
  listDocuments,
  listSimulations,
  markPrincipalSimulation,
  uploadDocuments,
  uploadSimulations,
} from "@/services/clientFileService";

const CLIENT = "11111111-1111-1111-1111-111111111111";
const FILE = "22222222-2222-2222-2222-222222222222";
const base = `/clients/${CLIENT}/files`;

beforeEach(() => {
  vi.clearAllMocks();
  for (const method of ["get", "post", "patch", "delete"] as const) {
    vi.mocked(axiosInstance[method]).mockResolvedValue({ data: { data: [] } });
  }
});

describe("upload", () => {
  it("documentos: multipart sem Content-Type fixo, com o aviso da central", async () => {
    const form = new FormData();
    await uploadDocuments(CLIENT, form);
    const [url, body, config] = vi.mocked(axiosInstance.post).mock.calls[0];
    expect(url).toMatch(new RegExp(`${base}/documents$`));
    expect(body).toBe(form);
    expect(config).toMatchObject({
      headers: { "Content-Type": undefined },
      successMessage: "Documentos enviados.",
      skipSuccessToast: false,
    });
  });

  it("arquivo não fica preso aos 10 s das demais requisições: são até 60 MB por envio", async () => {
    await uploadDocuments(CLIENT, new FormData());
    await uploadSimulations(CLIENT, new FormData());
    await downloadClientFile(CLIENT, FILE);
    const configs = [...vi.mocked(axiosInstance.post).mock.calls.map((call) => call[2]), vi.mocked(axiosInstance.get).mock.calls[0][1]];
    for (const config of configs) expect(config).toMatchObject({ timeout: FILE_TRANSFER_TIMEOUT_MS });
  });

  it("simulações: a mesma forma, na rota delas; `silent` cala o sucesso", async () => {
    await uploadSimulations(CLIENT, new FormData(), { silent: true });
    const [url, , config] = vi.mocked(axiosInstance.post).mock.calls[0];
    expect(url).toMatch(new RegExp(`${base}/simulations$`));
    expect(config).toMatchObject({ headers: { "Content-Type": undefined }, skipSuccessToast: true });
  });
});

describe("listagem", () => {
  it("repassa a página pedida", async () => {
    await listDocuments(CLIENT, { pageNumber: 2, pageSize: 100 });
    await listSimulations(CLIENT, { pageNumber: 1, pageSize: 100 });
    const [documents, simulations] = vi.mocked(axiosInstance.get).mock.calls;
    expect(documents[0]).toMatch(new RegExp(`${base}/documents$`));
    expect(documents[1]).toEqual({ params: { pageNumber: 2, pageSize: 100 } });
    expect(simulations[0]).toMatch(new RegExp(`${base}/simulations$`));
  });
});

describe("principal", () => {
  it("PATCH na rota /principal da simulação, sem corpo", async () => {
    await markPrincipalSimulation(CLIENT, FILE, { silent: true });
    const [url, body, config] = vi.mocked(axiosInstance.patch).mock.calls[0];
    expect(url).toMatch(new RegExp(`${base}/simulations/${FILE}/principal$`));
    expect(body).toBeUndefined();
    expect(config).toMatchObject({ skipSuccessToast: true });
  });
});

describe("arquivo em si", () => {
  it("download pela API, como blob — a mesma rota para documento e simulação", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    vi.mocked(axiosInstance.get).mockResolvedValue({ data: blob });
    await expect(downloadClientFile(CLIENT, FILE)).resolves.toBe(blob);
    const [url, config] = vi.mocked(axiosInstance.get).mock.calls[0];
    expect(url).toMatch(new RegExp(`${base}/${FILE}/download$`));
    expect(config).toEqual({ responseType: "blob", timeout: FILE_TRANSFER_TIMEOUT_MS });
  });

  it("excluir: DELETE no arquivo, com o aviso da central", async () => {
    await deleteFile(CLIENT, FILE);
    const [url, config] = vi.mocked(axiosInstance.delete).mock.calls[0];
    expect(url).toMatch(new RegExp(`${base}/${FILE}$`));
    expect(config).toMatchObject({ successMessage: "Arquivo excluído." });
  });
});
