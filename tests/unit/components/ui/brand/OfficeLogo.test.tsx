import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfficeLogo } from "@/components/ui/brand/OfficeLogo";
import { API_BASE_URL } from "@/constants/endpoints/paths";
import type { LoginResponse } from "@/interfaces/auth/Auth.interface";
import { applySession } from "@/lib/session";
import { callsTo, envelope, failApi, onApi } from "../../../support/fakeApi";
import { renderApp } from "../../../support/render";

const LOGO = "/api/v1/tenants/logo?slug=tania&v=42";
const resolved = (logoUrl: string | null) =>
  envelope({ tenantId: "t1", slug: "tania", razaoSocial: "Tania Melo Advocacia", logoUrl });
const remembered = (value: string) => localStorage.setItem(`officeLogo@${API_BASE_URL}@tania`, value);
const never = () => new Promise(() => {});

const draw = (tone: "gold" | "blue" = "blue") =>
  renderApp(<OfficeLogo tone={tone} alt="Marca" width={96} height={96} />);
const srcOf = () => screen.getByAltText("Marca").getAttribute("src") ?? "";

describe("OfficeLogo", () => {
  it("sem logo enviada, a Tânia usa a marca dela no tom pedido", async () => {
    onApi("get", "/tenants/resolve", resolved(null));
    draw("gold");

    await waitFor(() => expect(screen.getByAltText("Marca")).not.toHaveClass("invisible"));
    expect(srcOf()).toBe("/svg/tania/gold-logo.svg");
  });

  it("sem logo enviada, os demais escritórios usam a marca do sistema", async () => {
    localStorage.setItem(`tenantSlug@${API_BASE_URL}`, "outro");
    onApi("get", "/tenants/resolve", envelope({ tenantId: "t2", slug: "outro", razaoSocial: "Outro", logoUrl: null }));
    draw("blue");

    await waitFor(() => expect(screen.getByAltText("Marca")).not.toHaveClass("invisible"));
    expect(srcOf()).toBe("/svg/blue-logo.svg");
  });

  it("com logo enviada, a imagem vem da API, sem token, e vale para qualquer tom", async () => {
    onApi("get", "/tenants/resolve", resolved(LOGO));
    draw("blue");

    await waitFor(() => expect(srcOf()).toBe(`${API_BASE_URL}${LOGO}`));
    expect(screen.getByAltText("Marca")).not.toHaveClass("invisible");
  });

  it("a logo lembrada aparece de cara, sem esperar o resolve", () => {
    remembered(LOGO);
    onApi("get", "/tenants/resolve", never);
    draw();

    expect(srcOf()).toBe(`${API_BASE_URL}${LOGO}`);
  });

  it("o lembrado é corrigido quando a logo mudou em outro computador", async () => {
    remembered(LOGO);
    onApi("get", "/tenants/resolve", resolved(null));
    draw("blue");

    await waitFor(() => expect(srcOf()).toBe("/svg/tania/blue-logo.svg"));
  });

  it("enquanto não se sabe qual marca, o espaço fica reservado e vazio", () => {
    onApi("get", "/tenants/resolve", never);
    draw();

    // Desenhar a padrão e trocar logo depois seria a marca errada piscando.
    expect(screen.getByAltText("Marca")).toHaveClass("invisible");
  });

  it("se o resolve falha e nada foi lembrado, vale a marca padrão", async () => {
    failApi("get", "/tenants/resolve", 500);
    draw("blue");

    await waitFor(() => expect(screen.getByAltText("Marca")).not.toHaveClass("invisible"));
    expect(srcOf()).toBe("/svg/tania/blue-logo.svg");
  });

  it("várias marcas na mesma tela fazem uma pergunta só", async () => {
    onApi("get", "/tenants/resolve", resolved(LOGO));
    renderApp(
      <>
        <OfficeLogo tone="blue" alt="Cabeçalho" width={96} height={96} />
        <OfficeLogo tone="gold" alt="Rodapé" width={96} height={96} />
      </>,
    );

    await waitFor(() => expect(screen.getByAltText("Rodapé").getAttribute("src")).toBe(`${API_BASE_URL}${LOGO}`));
    expect(callsTo("get").filter(([url]) => String(url).endsWith("/tenants/resolve"))).toHaveLength(1);
  });
});

describe("OfficeLogo depois do login", () => {
  const OTHER_LOGO = "/api/v1/tenants/logo?slug=outro&v=7";
  /** O que o login devolve para um escritório que não é o da Tânia; `logoUrl` só quando o backend manda. */
  const loginOf = (extra: Partial<LoginResponse>) =>
    applySession({
      token: "token-de-teste",
      tokenType: "Bearer",
      expiresInSeconds: 3600,
      fullName: "Alguém",
      email: "a@b.c",
      role: "ADMIN",
      tenantId: "t2",
      tenantSlug: "outro",
      ...extra,
    });
  const resolveCalls = () => callsTo("get").filter(([url]) => String(url).endsWith("/tenants/resolve"));

  it("o login já diz a logo: ela aparece sem perguntar ao resolve", () => {
    loginOf({ logoUrl: OTHER_LOGO });
    draw("blue");

    expect(srcOf()).toBe(`${API_BASE_URL}${OTHER_LOGO}`);
    expect(resolveCalls()).toHaveLength(0);
  });

  it("login de escritório sem logo: a marca padrão, também sem perguntar", () => {
    loginOf({ logoUrl: null });
    draw("gold");

    expect(srcOf()).toBe("/svg/gold-logo.svg");
    expect(screen.getByAltText("Marca")).not.toHaveClass("invisible");
    expect(resolveCalls()).toHaveLength(0);
  });

  it("backend que ainda não manda logoUrl no login: a tela pergunta ao resolve", async () => {
    onApi("get", "/tenants/resolve", envelope({ tenantId: "t2", slug: "outro", razaoSocial: "Outro", logoUrl: OTHER_LOGO }));
    loginOf({});
    draw("blue");

    await waitFor(() => expect(srcOf()).toBe(`${API_BASE_URL}${OTHER_LOGO}`));
    expect(resolveCalls()).toHaveLength(1);
  });
});
