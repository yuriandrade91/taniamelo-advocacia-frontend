import { describe, expect, it, vi } from "vitest";
import { expireSession, isSessionEnding, readToken } from "@/lib/session";
import { signIn } from "../support/session";

/**
 * A sessão no navegador (o `session.test.ts` cobre o lado sem `document`):
 * fim de sessão troca a página uma vez só.
 */
describe("sessão no navegador", () => {
  it("na tela de login, encerrar só limpa; fora dela, leva ao login uma vez", () => {
    signIn();
    history.replaceState(null, "", "/login");
    expireSession();
    expect(readToken()).toBeNull();
    expect(isSessionEnding()).toBe(false);

    signIn();
    history.replaceState(null, "", "/clientes?pagina=2");
    const replace = vi.fn();
    const original = globalThis.location;
    Object.defineProperty(globalThis, "location", { value: { ...original, pathname: "/clientes", search: "?pagina=2", replace }, configurable: true });
    expireSession();
    expireSession();
    Object.defineProperty(globalThis, "location", { value: original, configurable: true });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toContain("expired=1");
    expect(isSessionEnding()).toBe(true);
  });
});
