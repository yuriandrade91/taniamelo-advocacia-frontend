import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SitePage from "@/app/(site)/site/page";
import { renderApp } from "../../../support/render";

describe("Site do escritório", () => {
  it("navega, abre as áreas, as dúvidas e o simulador", async () => {
    const { user } = renderApp(<SitePage />);
    await user.click(screen.getByRole("button", { name: "Abrir menu" }));
    await user.click(screen.getAllByRole("link", { name: "Dúvidas" })[0]);
    await user.click(screen.getByRole("button", { name: /Aposentadoria especial/ }));
    await user.click(screen.getByRole("button", { name: /O que é o CNIS/ }));
    for (const option of ["Homem", "Grave", "Moderada", "Leve", "Mulher"]) {
      await user.click(screen.getByRole("radio", { name: option }));
      expect(screen.getByRole("radio", { name: option })).toBeChecked();
    }
  });

  it("monta a mensagem do WhatsApp na janela de contato", async () => {
    const open = globalThis.open;
    globalThis.open = (() => null);
    const { user } = renderApp(<SitePage />);
    await user.click(screen.getByRole("button", { name: "Falar com a equipe pelo WhatsApp" }));
    const dialog = await screen.findByRole("dialog");
    const topics = within(dialog).getAllByRole("radio");
    for (const topic of topics) await user.click(topic);
    const text = within(dialog).getByRole("textbox");
    await user.clear(text);
    await user.type(text, "Olá, quero conversar sobre minha aposentadoria.");
    const send = [...within(dialog).getAllByRole("link"), ...within(dialog).queryAllByRole("button")].find((el) => /Enviar pelo WhatsApp/.test(el.textContent ?? ""));
    if (send) await user.click(send);
    const close = within(dialog).queryAllByRole("button").find((b) => /Fechar/i.test(b.getAttribute("aria-label") ?? ""));
    if (close) await user.click(close);
    globalThis.open = open;

    await user.click(screen.getAllByRole("button", { name: "Conversar sobre meu caso" })[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
