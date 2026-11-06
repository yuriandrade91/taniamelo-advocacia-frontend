import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/axiosService", () => ({
  default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import axiosInstance from "@/services/axiosService";
import { FILE_TRANSFER_TIMEOUT_MS } from "@/services/clientFileService";
import { removeOfficeLogo, resolveTenant, uploadOfficeLogo } from "@/services/tenantService";

const mocked = vi.mocked(axiosInstance);

beforeEach(() => vi.clearAllMocks());

describe("tenantService", () => {
  it("resolve pergunta pelo slug e não grita se falhar: a marca segue com a padrão", async () => {
    mocked.get.mockResolvedValue({ data: { data: { tenantId: "t1", slug: "tania", razaoSocial: "X", logoUrl: null } } });

    expect(await resolveTenant("tania")).toMatchObject({ slug: "tania", logoUrl: null });
    const [url, config] = mocked.get.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/tenants\/resolve$/);
    expect(config).toMatchObject({ params: { slug: "tania" }, skipErrorToast: true });
  });

  it("a logo vai na parte 'file', com o boundary do navegador e o prazo de arquivo", async () => {
    mocked.put.mockResolvedValue({ data: { data: { logoUrl: "/api/v1/tenants/logo?slug=tania&v=1" } } });
    const file = new File([new Uint8Array([0x89, 0x50])], "logo.png", { type: "image/png" });

    await uploadOfficeLogo(file);

    const [url, body, config] = mocked.put.mock.calls[0] as [string, FormData, Record<string, unknown>];
    expect(url).toMatch(/\/api\/v1\/tenants\/current\/logo$/);
    expect(body.get("file")).toBe(file);
    expect(config).toMatchObject({
      headers: { "Content-Type": undefined },
      timeout: FILE_TRANSFER_TIMEOUT_MS,
      successMessage: "Logo do escritório atualizada.",
    });
  });

  it("voltar à marca padrão é o DELETE da mesma rota, com o retorno declarado", async () => {
    mocked.delete.mockResolvedValue({ data: null });

    await removeOfficeLogo();

    expect(mocked.delete).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/tenants\/current\/logo$/),
      expect.objectContaining({ successMessage: "Marca padrão restaurada." }),
    );
  });
});
