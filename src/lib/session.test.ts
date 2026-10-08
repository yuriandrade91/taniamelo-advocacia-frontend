import { describe, expect, it } from "vitest";
import { expiredLoginUrl } from "./session";

describe("expiredLoginUrl", () => {
  it("leva o motivo e o destino, para voltar ao mesmo lugar depois do login", () => {
    const url = new URL(expiredLoginUrl("/clientes", "?page=2"), "http://x");
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("expired")).toBe("1");
    expect(url.searchParams.get("next")).toBe("/clientes?page=2");
  });

  it("da raiz, sem destino: o login já leva à home", () => {
    const url = new URL(expiredLoginUrl("/", ""), "http://x");
    expect(url.searchParams.get("expired")).toBe("1");
    expect(url.searchParams.has("next")).toBe(false);
  });

  it("nunca manda de volta para o próprio login", () => {
    const url = new URL(expiredLoginUrl("/login", "?next=/home"), "http://x");
    expect(url.searchParams.has("next")).toBe(false);
  });
});
