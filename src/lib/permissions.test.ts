import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canDestroy,
  canListUsers,
  canSeeFinance,
  canSeeInssPassword,
} from "./permissions";
import * as sessao from "./sessionUser";

function withRole(role: string | null) {
  vi.spyOn(sessao, "getSessionUser").mockReturnValue(
    role === null
      ? null
      : { fullName: "Alguém", email: "a@b.c", role, tenantSlug: "demo" },
  );
}

afterEach(() => vi.restoreAllMocks());

describe("quem pode destruir", () => {
  it("ADMIN, SUPPORT e o LAWYER legado podem", () => {
    // Os três durante a transição da V19: enquanto houver instância devolvendo
    // o nome antigo, aceitar só um dos dois tira o botão de quem tem direito.
    for (const role of ["ADMIN", "SUPPORT", "LAWYER"]) {
      withRole(role);
      expect(canDestroy(), role).toBe(true);
    }
  });

  it("STAFF não pode — mas essa é a metade visual da regra", () => {
    // Quem recusa de verdade é o backend (403). Isto só evita oferecer ao
    // atendente um botão que vai negá-lo.
    withRole("STAFF");
    expect(canDestroy()).toBe(false);
  });

  it("sessão ausente, papel vazio ou desconhecido escondem o botão", () => {
    // Na dúvida, esconder. Errar para menos custa um "não achei o botão";
    // errar para mais custa um clique que toma 403 na cara do usuário.
    for (const role of [null, "", "   ", "SUPERUSER", "admin-do-cliente"]) {
      withRole(role);
      expect(canDestroy(), String(role)).toBe(false);
    }
  });

  it("aceita o papel em caixa baixa ou com espaço", () => {
    // O papel vem do storage, que já foi gravado por versões diferentes da app.
    for (const role of ["admin", " Lawyer ", "aDmIn"]) {
      withRole(role);
      expect(canDestroy(), role).toBe(true);
    }
  });
});

describe("as outras duas regras acompanham a primeira, por enquanto", () => {
  it("senha do INSS e lista de usuários seguem o mesmo corte", () => {
    withRole("STAFF");
    expect(canSeeInssPassword()).toBe(false);
    expect(canListUsers()).toBe(false);

    withRole("LAWYER");
    expect(canSeeInssPassword()).toBe(true);
    expect(canListUsers()).toBe(true);
  });
});

describe("o financeiro tem corte próprio, mais estrito", () => {
  it("só ADMIN — advogado NÃO vê, e é aí que difere de podeDestruir", () => {
    // O backend devolve 403 para LAWYER também (@RequerAdmin na classe do
    // ClientPaymentController). Se esta regra escorregar para canDestroy, a
    // tela passa a oferecer ao advogado uma aba que só vai recusá-lo.
    withRole("ADMIN");
    expect(canSeeFinance()).toBe(true);

    withRole("LAWYER");
    expect(canSeeFinance()).toBe(false);
    expect(canDestroy()).toBe(true);

    withRole("STAFF");
    expect(canSeeFinance()).toBe(false);
  });

  it("sessão ausente ou papel desconhecido escondem o financeiro", () => {
    withRole(null);
    expect(canSeeFinance()).toBe(false);
    withRole("SUPERADMIN");
    expect(canSeeFinance()).toBe(false);
  });
});
