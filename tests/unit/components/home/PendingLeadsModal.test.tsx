import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PendingLeadsModal } from "@/components/home/PendingLeadsModal";
import { failApi, onApi, page } from "../../support/fakeApi";
import { renderApp } from "../../support/render";
import { signIn } from "../../support/session";
import * as fx from "../../support/fixtures";

describe("Formulários pendentes", () => {
  /** Doze pessoas na fila: as mais antigas há mais de um mês, algumas sem data. */
  const queue = Array.from({ length: 12 }, (_, i) =>
    fx.clientRow({
      id: `l${i}`,
      fullName: `Pessoa ${i}`,
      situation: "Formulário preenchido",
      createdAt: i < 3 ? undefined : `${fx.isoDay(-(i * 5))}T10:00:00Z`,
      benefit: i % 2 ? undefined : "Aposentadoria por idade",
      mobilePhone: i % 3 ? "31988887777" : undefined,
    }),
  );

  it("resume a fila, filtra por espera, busca e abre a ficha", async () => {
    signIn();
    onApi("get", "/clients", page(queue, queue.length));
    const onViewClient = vi.fn();
    const { user } = renderApp(<PendingLeadsModal isOpen onClose={vi.fn()} onViewClient={onViewClient} />);
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText(/esperam? há mais de um mês/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /\+1 mês/ }));
    await user.click(within(dialog).getByRole("button", { name: /Recentes/ }));
    await user.click(within(dialog).getByRole("button", { name: /Todos/ }));

    const search = within(dialog).getByPlaceholderText("Nome, telefone ou benefício");
    await user.type(search, "Pessoa 1");
    await user.clear(search);
    await user.type(search, "ninguém com esse nome");
    expect(within(dialog).getByText(/Nenhum resultado para/)).toBeInTheDocument();
    await user.clear(search);

    await user.click(within(dialog).getAllByRole("button", { name: /Ver a ficha de/ })[0]);
    expect(onViewClient).toHaveBeenCalled();
  });

  it("fila sem ninguém atrasado diz quem espera há mais tempo", async () => {
    signIn();
    onApi("get", "/clients", page([fx.clientRow({ createdAt: `${fx.isoDay(-3)}T10:00:00Z` })], 1));
    renderApp(<PendingLeadsModal isOpen onClose={vi.fn()} onViewClient={vi.fn()} />);
    expect(await screen.findByText(/Ninguém esperando há mais de um mês/)).toBeInTheDocument();
  });

  it("falha da fila avisa", async () => {
    signIn();
    failApi("get", "/clients", 500);
    renderApp(<PendingLeadsModal isOpen onClose={vi.fn()} />);
    expect(await screen.findByText(/Não foi possível carregar a lista/)).toBeInTheDocument();
  });
});
