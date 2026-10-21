import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivateLayout from "@/app/(private)/layout";
import { callsTo, envelope, failApi, onApi, httpError } from "../../support/fakeApi";
import { router, setLocation } from "../../support/next";
import { seedOffice } from "../../support/office";
import { renderApp } from "../../support/render";
import { signIn } from "../../support/session";

const loginResponse = envelope({
  token: "novo-token",
  expiresInSeconds: 3600,
  tenantId: "t1",
  tenantSlug: "tania",
  fullName: "Tânia Melo",
  email: "tania@exemplo.com",
  role: "ADMIN",
});

describe("Área privada", () => {
  it("com sessão, desenha o menu e o conteúdo", async () => {
    signIn();
    seedOffice();
    setLocation("/clientes");
    const { user } = renderApp(
      <PrivateLayout>
        <p>conteúdo protegido</p>
      </PrivateLayout>,
    );
    expect(await screen.findByText("conteúdo protegido")).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(2);

    const bell = screen.queryAllByRole("button").find((b) => /notifica/i.test(b.getAttribute("aria-label") ?? ""));
    if (bell) {
      await user.click(bell);
      await screen.findByRole("dialog", { name: "Central de notificações" });
      const markAll = screen.queryAllByRole("button").find((b) => /Marcar todas/i.test(b.textContent ?? ""));
      if (markAll) await user.click(markAll);
      await user.keyboard("{Escape}");
    }

    const userMenu = screen.queryAllByRole("button").find((b) => /Tânia|menu do usuário|perfil/i.test(`${b.getAttribute("aria-label")} ${b.textContent}`));
    if (userMenu) {
      await user.click(userMenu);
      const logout = await screen.findAllByRole("button", { name: /Sair/ }).catch(() => []);
      onApi("post", "/auth/logout", envelope("ok"));
      if (logout[0]) await user.click(logout[0]);
    }

    const search = screen.queryAllByRole("searchbox")[0] ?? screen.queryAllByRole("combobox")[0];
    if (search) {
      await user.type(search, "Maria");
      await act(async () => {});
      await user.keyboard("{Enter}");
    }
  });

  it("sem sessão e sem refresh, vai para o login guardando o destino", async () => {
    failApi("post", "/auth/refresh", 401);
    setLocation("/clientes");
    renderApp(
      <PrivateLayout>
        <p>conteúdo protegido</p>
      </PrivateLayout>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(expect.stringContaining("next=%2Fclientes")));
    expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
  });

  it("sem cookie mas com refresh válido, entra", async () => {
    onApi("post", "/auth/refresh", loginResponse);
    seedOffice();
    renderApp(
      <PrivateLayout>
        <p>conteúdo protegido</p>
      </PrivateLayout>,
    );
    expect(await screen.findByText("conteúdo protegido")).toBeInTheDocument();
  });

  it("checa a sessão ao voltar para a aba", async () => {
    signIn();
    seedOffice();
    renderApp(
      <PrivateLayout>
        <p>conteúdo protegido</p>
      </PrivateLayout>,
    );
    await screen.findByText("conteúdo protegido");
    document.cookie = "token=; path=/; max-age=0";
    onApi("post", "/auth/refresh", loginResponse);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      globalThis.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/auth/refresh"))).toBe(true));
  });

  it("erro HTTP falso tem o formato do axios", () => {
    expect(httpError(418).response.status).toBe(418);
  });
});
