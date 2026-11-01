import { describe, expect, it } from "vitest";
import { messageOf } from "@/lib/errorMessage";

describe("messageOf", () => {
  const axiosFailure = (message: string, response?: unknown) =>
    Object.assign(new Error(message), { isAxiosError: true, response });

  it("a mensagem do backend vem primeiro", () => {
    const reason = axiosFailure("Request failed with status code 422", { data: { message: "CPF já cadastrado." } });
    expect(messageOf(reason, "Falhou.")).toBe("CPF já cadastrado.");
  });

  it("o texto técnico do axios não chega à tela: quem fala é o fallback", () => {
    expect(messageOf(axiosFailure("timeout of 10000ms exceeded"), "Falhou.")).toBe("Falhou.");
    expect(messageOf(axiosFailure("Network Error"), "Falhou.")).toBe("Falhou.");
    expect(messageOf(axiosFailure("Request failed with status code 500", { data: {} }), "Falhou.")).toBe("Falhou.");
  });

  it("o erro lançado pelo próprio app é escrito para a tela", () => {
    expect(messageOf(new Error("Nem todos os arquivos foram enviados."), "Falhou.")).toBe(
      "Nem todos os arquivos foram enviados.",
    );
  });

  it("sem mensagem nenhuma, o fallback", () => {
    expect(messageOf(undefined, "Falhou.")).toBe("Falhou.");
    expect(messageOf(new Error("  "), "Falhou.")).toBe("Falhou.");
  });
});
