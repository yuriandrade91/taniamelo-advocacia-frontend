import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/services/axiosService", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axiosInstance from "@/services/axiosService";
import { downloadClientRecord } from "@/services/clientRecordService";

const CLIENT = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axiosInstance.get).mockResolvedValue({ data: new Blob(["%PDF"], { type: "application/pdf" }) });
});

it("busca a ficha do cliente pelo endpoint record como blob", async () => {
  const blob = new Blob(["%PDF"], { type: "application/pdf" });
  vi.mocked(axiosInstance.get).mockResolvedValue({ data: blob });

  await expect(downloadClientRecord(CLIENT)).resolves.toBe(blob);
  const [url, config] = vi.mocked(axiosInstance.get).mock.calls[0];
  expect(url).toMatch(new RegExp(`/api/v1/clients/${CLIENT}/record$`));
  expect(config).toEqual({ responseType: "blob" });
});
