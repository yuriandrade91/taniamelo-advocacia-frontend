import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import NotFound from "@/app/not-found";

describe("Telas de erro", () => {
  it("o erro de renderização explica e deixa tentar de novo", async () => {
    const reset = vi.fn();
    render(<ErrorPage reset={reset} />);
    expect(screen.getByRole("heading", { name: "Algo deu errado nesta tela" })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("a página inexistente leva de volta ao início", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "/");
  });
});
