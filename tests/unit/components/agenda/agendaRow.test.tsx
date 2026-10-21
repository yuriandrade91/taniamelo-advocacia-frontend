import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AgendaPage from "@/app/(private)/agenda/page";
import { onApi, page } from "../../support/fakeApi";
import { seedOffice } from "../../support/office";
import { renderApp } from "../../support/render";
import { signIn } from "../../support/session";
import * as fx from "../../support/fixtures";

describe("Linhas da agenda", () => {
  it("compromisso em andamento, cancelado com motivo, tipo e status desconhecidos, sem cliente", async () => {
    signIn();
    seedOffice();
    const now = new Date();
    const started = new Date(now.getTime() - 15 * 60_000).toISOString();
    const ends = new Date(now.getTime() + 45 * 60_000).toISOString();
    onApi(
      "get",
      "/appointments",
      page([
        fx.appointment({ id: "x1", startAt: started, endAt: ends, title: "Acontecendo agora", meetingUrl: "https://meet.exemplo.com/a", modality: "Online" }),
        fx.appointment({ id: "x2", status: "Cancelado", cancellationReason: "Cliente desmarcou", startAt: fx.isoInstant(3, 15), endAt: fx.isoInstant(3, 16) }),
        fx.appointment({ id: "x3", type: "Visita", status: "Remarcado", clientName: null, clientId: null, modality: null, location: null, startAt: fx.isoInstant(4, 15), endAt: fx.isoInstant(4, 16) }),
      ], 3),
    );
    const { user } = renderApp(<AgendaPage />);
    await screen.findAllByRole("button", { name: "Ver detalhes" });
    for (const day of screen.getAllByRole("button").filter((b) => /compromisso ·/.test(b.textContent ?? ""))) await user.click(day);
    expect(screen.getAllByText(/Cliente desmarcou/).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: "Entrar na reunião" })[0]);
    expect(globalThis.open).toHaveBeenCalledWith("https://meet.exemplo.com/a", "_blank", expect.anything());
  });
});
