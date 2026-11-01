import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatCard from "@/components/home/StatCard";
import { renderApp } from "../../support/render";

describe("StatCard", () => {
  it("carregando, desenha o skeleton e não um zero", () => {
    renderApp(<StatCard title="Formulários preenchidos" value={null} />);
    expect(screen.getByLabelText("Carregando Formulários preenchidos")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("o skeleton não fica dentro de um <p> (div em p quebra a hidratação)", () => {
    renderApp(<StatCard title="Formulários preenchidos" value={null} />);
    expect(screen.getByLabelText("Carregando Formulários preenchidos").closest("p")).toBeNull();
  });
});
