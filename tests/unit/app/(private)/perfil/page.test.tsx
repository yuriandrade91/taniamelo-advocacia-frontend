import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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

describe("Perfil: o escritório e a logo", () => {
  const LOGO = "/api/v1/tenants/logo?slug=tania&v=42";
  const office = {
    id: "t1",
    slug: "tania",
    razaoSocial: "Tania Melo Advocacia",
    cnpj: "12.345.678/0001-90",
    responsavel: "Tania Melo",
    email: "contato@taniamelo.adv.br",
    telefone: "+551133334444",
    plano: "pro",
    status: "ativo",
    logoUrl: null as string | null,
  };
  const withOffice = (logoUrl: string | null) => {
    seedOffice();
    onApi("get", "/tenants/current", envelope({ ...office, logoUrl }));
    onApi("get", "/tenants/resolve", envelope({ tenantId: "t1", slug: "tania", razaoSocial: office.razaoSocial, logoUrl }));
  };
  const srcOf = (alt: string) => screen.getByAltText(alt).getAttribute("src") ?? "";
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", { type: "image/png" });

  it("ADMIN envia a logo e ela aparece na hora, nos dois fundos", async () => {
    signIn("ADMIN");
    withOffice(null);
    onApi("put", "/tenants/current/logo", envelope({ ...office, logoUrl: LOGO }));
    const { user } = renderApp(<ProfilePage />);

    expect(await screen.findByText("Tania Melo Advocacia")).toBeInTheDocument();
    expect(screen.getByText("(11) 3333-4444")).toBeInTheDocument();
    await waitFor(() => expect(srcOf("Logo sobre fundo claro")).toBe("/svg/tania/blue-logo.svg"));
    expect(srcOf("Logo sobre fundo escuro")).toBe("/svg/tania/gold-logo.svg");

    await user.upload(screen.getByLabelText("Escolher a logo"), png());

    await waitFor(() => expect(srcOf("Logo sobre fundo claro")).toContain(LOGO));
    expect(srcOf("Logo sobre fundo escuro")).toContain(LOGO);
    const [, body] = callsTo("put").find(([url]) => String(url).endsWith("/tenants/current/logo")) ?? [];
    expect((body as FormData).get("file")).toBeInstanceOf(File);
    expect(screen.getByRole("button", { name: "Trocar logo" })).toBeInTheDocument();
  });

  it("SVG nem chega a ir: o motivo aparece junto dos botões", async () => {
    signIn("ADMIN");
    withOffice(null);
    renderApp(<ProfilePage />);
    await screen.findByRole("button", { name: "Enviar logo" });

    // Sem a user-event: ela respeitaria o `accept` e nem entregaria o arquivo.
    fireEvent.change(screen.getByLabelText("Escolher a logo"), {
      target: { files: [new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("PNG, JPEG ou WebP");
    expect(callsTo("put")).toHaveLength(0);
  });

  it("ADMIN volta à marca padrão depois de confirmar", async () => {
    signIn("ADMIN");
    withOffice(LOGO);
    onApi("delete", "/tenants/current/logo", envelope(null));
    const { user } = renderApp(<ProfilePage />);
    await waitFor(() => expect(srcOf("Logo sobre fundo claro")).toContain(LOGO));

    await user.click(screen.getByRole("button", { name: "Voltar à marca padrão" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Voltar à marca padrão" }));

    await waitFor(() => expect(srcOf("Logo sobre fundo claro")).toBe("/svg/tania/blue-logo.svg"));
    expect(callsTo("delete").some(([url]) => String(url).endsWith("/tenants/current/logo"))).toBe(true);
    expect(screen.getByRole("button", { name: "Enviar logo" })).toBeInTheDocument();
  });

  it("atendente vê o escritório e a logo, sem como trocá-la", async () => {
    signIn("STAFF");
    withOffice(LOGO);
    renderApp(<ProfilePage />);

    expect(await screen.findByText("Só a administração do escritório troca a logo.")).toBeInTheDocument();
    await waitFor(() => expect(srcOf("Logo sobre fundo claro")).toContain(LOGO));
    expect(screen.queryByRole("button", { name: /logo|marca padrão/i })).not.toBeInTheDocument();
  });

  it("sem os dados do escritório, avisa no lugar deles", async () => {
    signIn("ADMIN");
    seedOffice();
    failApi("get", "/tenants/current", 500);
    renderApp(<ProfilePage />);

    expect(await screen.findByText("Não foi possível carregar os dados do escritório.")).toBeInTheDocument();
  });
});
