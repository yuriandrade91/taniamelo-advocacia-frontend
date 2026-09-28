import { afterEach, describe, expect, it, vi } from "vitest";
import {
  podeDestruir,
  podeListarUsuarios,
  podeVerFinanceiro,
  podeVerSenhaDoInss,
} from "./permissions";
import * as sessao from "./sessionUser";

function comPapel(role: string | null) {
  vi.spyOn(sessao, "getSessionUser").mockReturnValue(
    role === null
      ? null
      : { fullName: "Alguém", email: "a@b.c", role, tenantSlug: "demo" },
  );
}

afterEach(() => vi.restoreAllMocks());

describe("quem pode destruir", () => {
  it("ADMIN e LAWYER podem", () => {
    for (const papel of ["ADMIN", "LAWYER"]) {
      comPapel(papel);
      expect(podeDestruir(), papel).toBe(true);
    }
  });

  it("STAFF não pode — mas essa é a metade visual da regra", () => {
    // Quem recusa de verdade é o backend (403). Isto só evita oferecer ao
    // atendente um botão que vai negá-lo.
    comPapel("STAFF");
    expect(podeDestruir()).toBe(false);
  });

  it("sessão ausente, papel vazio ou desconhecido escondem o botão", () => {
    // Na dúvida, esconder. Errar para menos custa um "não achei o botão";
    // errar para mais custa um clique que toma 403 na cara do usuário.
    for (const papel of [null, "", "   ", "SUPERUSER", "admin-do-cliente"]) {
      comPapel(papel);
      expect(podeDestruir(), String(papel)).toBe(false);
    }
  });

  it("aceita o papel em caixa baixa ou com espaço", () => {
    // O papel vem do storage, que já foi gravado por versões diferentes da app.
    for (const papel of ["admin", " Lawyer ", "aDmIn"]) {
      comPapel(papel);
      expect(podeDestruir(), papel).toBe(true);
    }
  });
});

describe("as outras duas regras acompanham a primeira, por enquanto", () => {
  it("senha do INSS e lista de usuários seguem o mesmo corte", () => {
    comPapel("STAFF");
    expect(podeVerSenhaDoInss()).toBe(false);
    expect(podeListarUsuarios()).toBe(false);

    comPapel("LAWYER");
    expect(podeVerSenhaDoInss()).toBe(true);
    expect(podeListarUsuarios()).toBe(true);
  });
});

describe("o financeiro tem corte próprio, mais estrito", () => {
  it("só ADMIN — advogado NÃO vê, e é aí que difere de podeDestruir", () => {
    // O backend devolve 403 para LAWYER também (@RequerAdmin na classe do
    // ClientPaymentController). Se esta regra escorregar para podeDestruir, a
    // tela passa a oferecer ao advogado uma aba que só vai recusá-lo.
    comPapel("ADMIN");
    expect(podeVerFinanceiro()).toBe(true);

    comPapel("LAWYER");
    expect(podeVerFinanceiro()).toBe(false);
    expect(podeDestruir()).toBe(true);

    comPapel("STAFF");
    expect(podeVerFinanceiro()).toBe(false);
  });

  it("sessão ausente ou papel desconhecido escondem o financeiro", () => {
    comPapel(null);
    expect(podeVerFinanceiro()).toBe(false);
    comPapel("SUPERADMIN");
    expect(podeVerFinanceiro()).toBe(false);
  });
});
