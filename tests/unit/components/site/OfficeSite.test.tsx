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

    await user.click(screen.getByRole("button", { name: "Vamos falar sobre seus direitos" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
