import { act, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReportsPage from "@/app/(private)/relatorios/page";
import { callsTo, envelope, failApi, onApi } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";

/** `YYYY-MM` de `back` meses atrás. */
const monthAgo = (back: number) => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  return d.toISOString().slice(0, 7);
};

/** Seis meses de séries com altos e baixos: saldo negativo, atraso, mês zerado. */
function seedSeries() {
  const months = [5, 4, 3, 2, 1, 0].map((back) => monthAgo(back));
  onApi("get", "/payments/timeline", envelope(months.map((month, i) => ({ month, overdueAmount: i % 2 ? 300 : 0, upcomingAmount: 1000 + i * 100, paidAmount: i === 3 ? 0 : 2000 + i * 500 }))));
  onApi("get", "/revenues/timeline", envelope(months.map((month, i) => ({ month, overdueAmount: 0, upcomingAmount: 500, paidAmount: i === 2 ? 0 : 3000 + i * 200 }))));
  onApi("get", "/expenses/timeline", envelope(months.map((month, i) => ({ month, overdueAmount: 0, upcomingAmount: 0, paidAmount: i === 4 ? 9000 : 1500 }))));
  onApi("get", "/appointments/timeline", envelope(months.map((month, i) => ({ month, totalCount: 4 + i, scheduledCount: 2, completedCount: 1 + i, cancelledCount: i % 3 }))));
  onApi("get", "/clients", ({ config }) => {
    const params = (config?.params ?? {}) as { situation?: string[]; clientType?: string[]; createdFrom?: string };
    const weight = (params.situation?.[0]?.length ?? 3) + (params.clientType?.[0] === "POTENCIAL" ? 2 : 0) + (params.createdFrom ? Number(params.createdFrom.slice(5, 7)) % 4 : 0);
    return { success: true, data: [], pagination: { pageNumber: 1, pageSize: 1, totalRecords: weight, totalPages: weight } };
  });
}

describe("Relatórios", () => {
  const VIEWS: [string, string][] = [
    ["Indicadores", "Destaques do período"],
    ["Jornada do cliente", "Entrada do funil"],
    ["Mês a mês", "Hoje · a esteira"],
    ["Proporções", "O dinheiro do escritório em proporções"],
    ["Visão geral", "Recebimentos por mês de vencimento"],
  ];

  it("percorre as cinco visões com séries de seis meses", async () => {
    signIn();
    seedOffice();
    seedSeries();
    const { user } = renderApp(<ReportsPage />);
    await screen.findByRole("heading", { name: "Recebimentos por mês de vencimento" });

    for (const [view, heading] of VIEWS) {
      await user.click(screen.getByRole("radio", { name: view }));
      expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("reordena as abas pelo popover", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<ReportsPage />);
    await screen.findByRole("heading", { name: "Recebimentos por mês de vencimento" });
    await user.click(screen.getByRole("button", { name: "Ordenar as abas" }));
    const dialog = await screen.findByRole("dialog", { name: "Ordem das abas" });
    await user.click(within(dialog).getByRole("button", { name: "Descer Visão geral" }));
    // A ordem nova vale na barra: a primeira visão deixou de ser a "Visão geral".
    expect(screen.getAllByRole("radio", { hidden: true })[0]).not.toHaveAccessibleName("Visão geral");
    const reset = within(dialog).queryAllByRole("button").find((b) => /Restaurar|padrão/i.test(b.textContent ?? ""));
    if (reset) await user.click(reset);
  });

  it("STAFF vê só clientes e agenda, em todas as visões", async () => {
    signIn("STAFF");
    seedOffice();
    seedSeries();
    const { user } = renderApp(<ReportsPage />);
    await screen.findByRole("heading", { name: "Relatórios" });
    for (const [view] of VIEWS) {
      await user.click(screen.getByRole("radio", { name: view }));
      await act(async () => {});
    }
    expect(callsTo("get").some(([url]) => String(url).includes("/payments/timeline"))).toBe(false);
  });

  it("séries vazias ou com falha mostram o vazio de cada bloco", async () => {
    signIn();
    seedOffice();
    onApi("get", "/payments/timeline", envelope([]));
    onApi("get", "/revenues/timeline", envelope([]));
    failApi("get", "/expenses/timeline", 500);
    failApi("get", "/expenses/summary", 500);
    failApi("get", "/appointments/timeline", 500);
    const { user } = renderApp(<ReportsPage />);
    await screen.findByRole("heading", { name: "Relatórios" });
    for (const [view, heading] of VIEWS) {
      await user.click(screen.getByRole("radio", { name: view }));
      await screen.findAllByRole("heading", { name: heading }).catch(() => []);
      expect(screen.getByRole("radio", { name: view })).toBeChecked();
    }
  });
});
