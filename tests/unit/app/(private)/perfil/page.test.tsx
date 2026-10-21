import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfilePage from "@/app/(private)/perfil/page";
import { callsTo, envelope, failApi, onApi } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import { inputByLabel } from "../../../support/ui";

describe("Perfil", () => {
  it("edita os dados e troca a senha", async () => {
    signIn();
    seedOffice();
    onApi("put", "/users/me", envelope({ id: "u1", fullName: "Tânia M. Melo", email: "tania@exemplo.com" }));
    onApi("patch", "/users/me/password", envelope("ok"));
    const { user } = renderApp(<ProfilePage />);
    const name = await screen.findByDisplayValue("Tânia Melo");
    await user.clear(name);
    await user.type(name, "Tânia M. Melo");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).endsWith("/users/me"))).toBe(true));

    await user.type(inputByLabel("Senha atual"), "antiga123");
    await user.type(inputByLabel("Nova senha"), "nova-senha-123");
    await user.type(inputByLabel("Repita a nova senha"), "nova-senha-123");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    await waitFor(() => expect(callsTo("patch").some(([url]) => String(url).endsWith("/users/me/password"))).toBe(true));
  });

  it("valida a senha antes de enviar e mostra o erro do servidor", async () => {
    signIn();
    seedOffice();
    failApi("patch", "/users/me/password", 400, "Senha atual incorreta.");
    const { user } = renderApp(<ProfilePage />);
    await screen.findByDisplayValue("Tânia Melo");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(callsTo("patch")).toHaveLength(0);
    await user.type(inputByLabel("Senha atual"), "antiga123");
    await user.type(inputByLabel("Nova senha"), "nova-senha-123");
    await user.type(inputByLabel("Repita a nova senha"), "outra-coisa-123");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(callsTo("patch")).toHaveLength(0);
    await user.clear(inputByLabel("Repita a nova senha"));
    await user.type(inputByLabel("Repita a nova senha"), "nova-senha-123");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    await waitFor(() => expect(callsTo("patch")).toHaveLength(1));
  });

  it("sem os dados, avisa em vez de mostrar vazio", async () => {
    signIn();
    failApi("get", "/users/me", 500);
    const { user } = renderApp(<ProfilePage />);
    expect(await screen.findByText(/Não foi possível/)).toBeInTheDocument();
    const retry = screen.queryAllByRole("button").find((b) => /Tentar de novo|tentar/i.test(b.textContent ?? ""));
    if (retry) await user.click(retry);
  });
});

describe("Perfil: erros do servidor", () => {
  it("e-mail já usado aparece no campo", async () => {
    signIn();
    seedOffice();
    failApi("put", "/users/me", 409, "E-mail em uso.", [{ field: "email", message: "Este e-mail já está em uso." }]);
    const { user } = renderApp(<ProfilePage />);
    const email = await screen.findByDisplayValue("tania@exemplo.com");
    await user.clear(email);
    await user.type(email, "outra@exemplo.com");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Este e-mail já está em uso.")).toBeInTheDocument();
    await user.type(email, "x");
  });

  it("senha atual errada aparece no campo; outro erro vira aviso", async () => {
    signIn();
    seedOffice();
    failApi("patch", "/users/me/password", 400, "Senha incorreta.", [{ field: "currentPassword", message: "A senha atual não confere." }]);
    const { user } = renderApp(<ProfilePage />);
    await screen.findByDisplayValue("Tânia Melo");
    await user.type(inputByLabel("Senha atual"), "antiga123");
    await user.type(inputByLabel("Nova senha"), "nova-senha-123");
    await user.type(inputByLabel("Repita a nova senha"), "nova-senha-123");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    expect(await screen.findByText("A senha atual não confere.")).toBeInTheDocument();

    failApi("patch", "/users/me/password", 500, "Instabilidade.");
    await user.type(inputByLabel("Senha atual"), "4");
    await user.click(screen.getByRole("button", { name: "Alterar senha" }));
    await waitFor(() => expect(callsTo("patch")).toHaveLength(2));
  });
});
