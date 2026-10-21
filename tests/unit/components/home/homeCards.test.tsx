import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContributorPipeline from "@/components/home/ContributorPipeline";
import MonthlyBalance from "@/components/home/MonthlyBalance";
import UpcomingRevenues from "@/components/home/UpcomingRevenues";
import { renderApp } from "../../support/render";

/** Falha vence vazio: um cartão que não leu não diz "nada aqui". */
describe("Cartões da Home", () => {
  it("receitas: a falha não vira 'nenhuma receita'", () => {
    renderApp(<UpcomingRevenues items={[]} failed />);
    expect(screen.getByText("Não foi possível carregar as próximas receitas.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma receita prevista.")).not.toBeInTheDocument();
  });

  it("receitas: sem falha, o vazio é vazio", () => {
    renderApp(<UpcomingRevenues items={[]} />);
    expect(screen.getByText("Nenhuma receita prevista.")).toBeInTheDocument();
  });

  it("balanço: a falha não vira 'sem despesas'", () => {
    renderApp(<MonthlyBalance total={0} slices={[]} failed />);
    expect(screen.getByText("Não foi possível carregar o balanço.")).toBeInTheDocument();
    expect(screen.queryByText(/Sem despesas pagas/)).not.toBeInTheDocument();
  });

  it("esteira: a falha não vira 'nenhum cliente'", () => {
    renderApp(<ContributorPipeline cards={[]} failed />);
    expect(screen.getByText("Não foi possível carregar a esteira.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum cliente na esteira.")).not.toBeInTheDocument();
  });
});
