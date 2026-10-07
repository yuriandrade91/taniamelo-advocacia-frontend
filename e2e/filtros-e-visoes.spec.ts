import { test, expect } from "@playwright/test";
import { integracaoPausada } from "./apiHelper";

/**
 * Filtros por schema, carga sob demanda e as visões de Relatórios.
 *
 * As regras puras (o que conta como filtro ativo, os chips) estão em
 * `filters.test.ts`; aqui, o que só aparece com a tela de verdade: o padrão de
 * cada tela, a consulta que sai para a API e o que NÃO sai.
 */

test.describe("Agenda", () => {
  test("nasce em Agendado, sem 'Limpar'; mexer mostra 'Limpar', que volta ao padrão", async ({ page }) => {
    await page.goto("/agenda");
    const situacao = page.getByRole("group", { name: "Situação" });
    await expect(situacao.getByRole("button", { name: "Agendado" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Limpar filtros" })).toHaveCount(0);

    const consulta = page.waitForRequest((r) => r.url().includes("/appointments") && r.url().includes("CONCLUIDO"));
    await situacao.getByRole("button", { name: "Concluído" }).click();
    await consulta;

    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(situacao.getByRole("button", { name: "Agendado" })).toHaveAttribute("aria-pressed", "true");
    await expect(situacao.getByRole("button", { name: "Concluído" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Limpar filtros" })).toHaveCount(0);
  });
});

test.describe("Pagamentos", () => {
  test.skip(integracaoPausada("payments"), "rota de Pagamentos em pausa neste ambiente");

  test("o status vira chip, a consulta leva o balde traduzido, e o chip remove o filtro", async ({ page }) => {
    await page.goto("/pagamentos");
    const consulta = page.waitForRequest(
      (r) => r.url().includes("/api/v1/payments") && r.url().includes("status=PENDENTE") && r.url().includes("dueTo="),
    );
    await page.getByLabel("Status").click();
    await page.getByRole("option", { name: "Atrasado" }).click();
    await consulta;

    const chip = page.getByRole("button", { name: "Remover filtro Atrasado" });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(chip).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Limpar filtros" })).toHaveCount(0);
  });
});

test.describe("Carteira", () => {
  test.skip(integracaoPausada("expenses", "revenues"), "rotas da Carteira em pausa neste ambiente");

  test("abre pedindo só as saídas; as entradas saem no clique da aba, e voltar não repete", async ({ page }) => {
    const listas: string[] = [];
    page.on("request", (r) => {
      const url = new URL(r.url());
      if (r.method() === "GET" && /\/api\/v1\/(revenues|expenses)$/.test(url.pathname)) listas.push(url.pathname);
    });

    await page.goto("/carteira");
    await expect(page.getByRole("tab", { name: /^Saídas/ })).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => listas.filter((p) => p.endsWith("/expenses")).length).toBe(1);
    expect(listas.filter((p) => p.endsWith("/revenues"))).toHaveLength(0);

    await page.getByRole("tab", { name: /^Entradas/ }).click();
    await expect.poll(() => listas.filter((p) => p.endsWith("/revenues")).length).toBe(1);

    // De volta às saídas: a página já vista sai do cache, sem nova requisição.
    await page.getByRole("tab", { name: /^Saídas/ }).click();
    await page.waitForTimeout(500);
    expect(listas.filter((p) => p.endsWith("/expenses"))).toHaveLength(1);
  });
});

test.describe("Relatórios", () => {
  test("as cinco visões abrem sem erro", async ({ page }) => {
    await page.goto("/relatorios");
    const visoes = page.getByRole("radiogroup", { name: "Visão do relatório" });
    for (const nome of ["Indicadores", "Jornada do cliente", "Mês a mês", "Proporções", "Visão geral"]) {
      await visoes.getByRole("radio", { name: new RegExp(nome) }).click();
      await expect(visoes.getByRole("radio", { name: new RegExp(nome) })).toHaveAttribute("aria-checked", "true");
    }
    await expect(page.getByText("Não foi possível carregar")).toHaveCount(0);
  });

  test("trocar o mês não repete a contagem de clientes por etapa", async ({ page }) => {
    const porEtapa: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/clients") && r.url().includes("situation=") && r.url().includes("pageSize=1")) {
        porEtapa.push(r.url());
      }
    });
    await page.goto("/relatorios");
    await expect.poll(() => porEtapa.length).toBeGreaterThan(0);
    const antes = porEtapa.length;

    await page.getByRole("button", { name: /mês anterior/i }).click();
    await page.waitForTimeout(800);
    expect(porEtapa).toHaveLength(antes);
  });
});
