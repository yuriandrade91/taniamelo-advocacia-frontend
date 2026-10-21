import { describe, expect, it, vi } from "vitest";
import { getSessionUser, patchSessionUser, sessionUserSnapshot } from "@/lib/sessionUser";
import { signIn } from "../support/session";

/** O usuário guardado é dado externo: conteúdo estragado não vira usuário. */
describe("usuário da sessão", () => {
  it("usuário guardado estragado ou incompleto não é usuário", () => {
    localStorage.setItem("session_user", "{não é json");
    expect(getSessionUser()).toBeNull();
    localStorage.setItem("session_user", JSON.stringify({ email: "x" }));
    expect(getSessionUser()).toBeNull();
    localStorage.setItem("session_user", JSON.stringify({ fullName: "Ana" }));
    expect(getSessionUser()).toEqual({ fullName: "Ana", email: "", role: "", tenantSlug: "" });
    expect(sessionUserSnapshot()).toBe(sessionUserSnapshot());
  });

  it("atualizar sem usuário não cria um", () => {
    patchSessionUser({ fullName: "Ninguém" });
    expect(getSessionUser()).toBeNull();
    signIn();
    patchSessionUser({ fullName: "Tânia M." });
    expect(getSessionUser()?.fullName).toBe("Tânia M.");
  });

  it("storage indisponível não derruba a leitura", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(sessionUserSnapshot()).toBeNull();
    spy.mockRestore();
  });
});
