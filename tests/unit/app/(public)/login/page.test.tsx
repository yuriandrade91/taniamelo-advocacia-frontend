import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "@/app/(public)/login/page";
import { callsTo, envelope, failApi, onApi } from "../../../support/fakeApi";
import { router, setLocation } from "../../../support/next";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";

const loginResponse = envelope({
  token: "novo-token",
  expiresInSeconds: 3600,
  tenantId: "t1",
  tenantSlug: "tania",
  fullName: "Tânia Melo",
  email: "tania@exemplo.com",
  role: "ADMIN",
});

async function fillLogin(user: ReturnType<typeof renderApp>["user"], login = "tania", password = "segredo") {
  await user.type(await screen.findByPlaceholderText("Usuário"), login);
  await user.type(screen.getByPlaceholderText("Senha"), password);
  await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
}

describe("Login", () => {
  it("entra e volta para o destino pedido", async () => {
    failApi("post", "/auth/refresh", 401);
    onApi("post", "/auth/login", loginResponse);
    setLocation("/login", "next=/clientes");
    const { user } = renderApp(<LoginPage />);
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/clientes"));
    expect(callsTo("post").find(([url]) => String(url).endsWith("/auth/login"))?.[1]).toEqual({ login: "tania", password: "segredo" });
  });

  it("ignora destino externo (open redirect) e avisa sessão expirada", async () => {
    failApi("post", "/auth/refresh", 401);
    onApi("post", "/auth/login", loginResponse);
    setLocation("/login", "next=//evil.com&expired=1");
    const { user } = renderApp(<LoginPage />);
    expect(await screen.findByText(/sessão/i)).toBeInTheDocument();
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
  });

  it.each([
    [401, "Credenciais inválidas"],
    [429, "Muitas tentativas"],
    [403, "Acesso negado"],
    [404, "Escritório não encontrado"],
    [500, "Erro no servidor"],
  ])("resposta %i do login aparece para a pessoa", async (status, message) => {
    failApi("post", "/auth/refresh", 401);
    failApi("post", "/auth/login", status, message);
    const { user } = renderApp(<LoginPage />);
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/auth/login"))).toBe(true));
    await act(async () => {});
  });

  it("login sem token na resposta avisa a falha", async () => {
    failApi("post", "/auth/refresh", 401);
    onApi("post", "/auth/login", envelope(null));
    const { user } = renderApp(<LoginPage />);
    await fillLogin(user);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/auth/login"))).toBe(true));
  });

  it("restaura a sessão pelo refresh sem pedir senha", async () => {
    onApi("post", "/auth/refresh", loginResponse);
    renderApp(<LoginPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
  });

  it("quem já tem sessão sai do login", async () => {
    signIn();
    failApi("post", "/auth/refresh", 401);
    renderApp(<LoginPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/home"));
  });
});
