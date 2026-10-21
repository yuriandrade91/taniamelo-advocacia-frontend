import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivateLayout from "@/app/(private)/layout";
import { failApi } from "../../../support/fakeApi";
import { router } from "../../../support/next";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";

describe("Menu do usuário", () => {
  it("sai da sessão e vai para o login, mesmo se o servidor falhar", async () => {
    signIn();
    seedOffice();
    failApi("post", "/auth/logout", 500);
    const { user } = renderApp(
      <PrivateLayout>
        <p>conteúdo</p>
      </PrivateLayout>,
    );
    await screen.findByText("conteúdo");
    await user.click(screen.getByRole("button", { name: "Menu de Tânia Melo" }));
    await user.click(await screen.findByRole("menuitem", { name: "Sair" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
  });
});
