import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/notificationService", () => ({
  notificationCenter: { success: vi.fn(), danger: vi.fn() },
}));

import { notificationCenter } from "@/services/notificationService";
import { copyToClipboard } from "@/components/ui/table/CopyableValue";

/**
 * A confirmação de "copiado" saiu do popover para o toast. O que se garante:
 * copiou → toast de sucesso com o nome do dado; o navegador recusou → aviso
 * de erro (antes o botão simplesmente não fazia nada).
 */

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("navigator", { clipboard: { writeText } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copyToClipboard", () => {
  it("copia o valor e confirma em toast", async () => {
    writeText.mockResolvedValue(undefined);

    await copyToClipboard("CPF", "123.456.789-01");

    expect(writeText).toHaveBeenCalledWith("123.456.789-01");
    expect(notificationCenter.success).toHaveBeenCalledWith("CPF copiado", {
      description: "123.456.789-01",
    });
    expect(notificationCenter.danger).not.toHaveBeenCalled();
  });

  it("sem permissão da área de transferência, avisa em vez de calar", async () => {
    writeText.mockRejectedValue(new Error("NotAllowedError"));

    await copyToClipboard("CPF", "123.456.789-01");

    expect(notificationCenter.success).not.toHaveBeenCalled();
    expect(notificationCenter.danger).toHaveBeenCalledWith(
      "Não foi possível copiar o CPF",
      expect.objectContaining({ description: expect.any(String) }),
    );
  });

  it("navegador sem clipboard (HTTP na rede local) também cai no aviso", async () => {
    vi.stubGlobal("navigator", {});

    await copyToClipboard("CPF", "123.456.789-01");

    expect(notificationCenter.danger).toHaveBeenCalled();
  });
});
