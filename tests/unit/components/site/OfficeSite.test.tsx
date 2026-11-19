import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SitePage from "@/app/(site)/site/page";
import { renderApp } from "../../support/render";

const scrollTo = (y: number) => {
  Object.defineProperty(globalThis, "scrollY", { value: y, configurable: true });
  fireEvent.scroll(window);
};

describe("Site: rolagem", () => {
  it("o cabeçalho some ao descer e volta ao subir; o menu do celular abre a conversa", async () => {
    const { user } = renderApp(<SitePage />);
    await act(async () => {
      scrollTo(900);
      scrollTo(1400);
      scrollTo(1300);
      scrollTo(100);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });

    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    const contact = screen.getAllByRole("button").find((b) => b.textContent?.trim() === "Contato")!;
    await user.click(contact);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getAllByRole("button").find((b) => /Fechar/i.test(b.getAttribute("aria-label") ?? ""))!);

    await user.click(
      screen.getByRole("button", { name: /Vamos falar sobre seus direitos/ }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

describe("Site: áreas de atuação", () => {
  it("dá boas-vindas com uma mensagem humanizada e digitada", async () => {
    renderApp(<SitePage />);

    expect(
      await screen.findByRole("status", { name: "Tânia está pensando" }),
    ).toBeInTheDocument();

    const welcome = await screen.findByRole(
      "status",
      { name: "Resposta completa" },
      { timeout: 3000 },
    );
    expect(welcome).toHaveTextContent(
      /Escolha um tema para conhecer como podemos ajudar.*explorar quantas opções quiser/i,
    );
    expect(screen.getByText("Uma conversa para começar")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Conheça as dúvidas mais comuns/ }),
    ).toHaveAttribute("href", "#duvidas");
    expect(
      screen.getByRole("button", { name: "Aposentadoria por deficiência" }),
    ).toBeInTheDocument();
  });

  it("responde aos temas escolhidos e mantém as opções disponíveis", async () => {
    const { user } = renderApp(<SitePage />);
    const mei = screen.getByRole("button", { name: "MEI" });

    await screen.findByRole(
      "status",
      { name: "Resposta completa" },
      { timeout: 3000 },
    );
    await user.click(mei);
    expect(
      await screen.findByRole("status", { name: "Tânia está pensando" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Médico" }));

    const response = await screen.findByText(
      /a profissão, por si só, não garante o reconhecimento de tempo especial/i,
      {},
      { timeout: 9000 },
    );
    expect(screen.getByText("TM")).toBeInTheDocument();
    expect(response).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: /pagamentos do DAS/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "MEI" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Médico" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    for (const title of [
      "Contribuinte Individual",
      "Facultativo",
      "Dona de casa de baixa renda",
      "Médico",
      "Enfermeira",
      "Tempo Especial",
      "Reclamatória Trabalhista",
    ]) {
      expect(
        screen.getByRole("button", { name: new RegExp(title) }),
      ).toBeInTheDocument();
    }
  });
});
