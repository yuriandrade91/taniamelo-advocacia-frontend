import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { chooseOption, inputByLabel } from "./ui";

/**
 * Atalhos do cadastro de cliente. As abas só avançam com os obrigatórios das
 * anteriores preenchidos, então chegar a uma seção do fim passa por aqui.
 */

/** Cola o texto de exemplo e aplica o que o smartFill reconheceu. */
export async function pasteExample(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Outras formas de preencher" }));
  await user.click(await screen.findByRole("radio", { name: "Colar e preencher" }));
  await user.click(await screen.findByRole("button", { name: "Usar exemplo" }));
  await user.click(screen.getByRole("button", { name: "Aplicar ao cadastro" }));
  await user.click(screen.getByRole("radio", { name: "Abas" }));
}

/** O que o texto colado não traz: situação, gênero e a senha do INSS. */
export async function completeRequired(user: UserEvent) {
  await user.click(screen.getByRole("tab", { name: /Atendimento/ }));
  chooseOption("Situação", "ANALISE_DOCUMENTAL");
  await user.click(screen.getByRole("tab", { name: /Dados pessoais/ }));
  chooseOption("Gênero", "FEMININO");
  await user.click(screen.getByRole("tab", { name: /Dados profissionais/ }));
  await user.type(inputByLabel(/Senha do INSS/), "senha123");
}

/** Preenche o obrigatório e abre a aba pedida. */
export async function fillAndOpen(user: UserEvent, tab: RegExp) {
  await pasteExample(user);
  await completeRequired(user);
  await user.click(screen.getByRole("tab", { name: tab }));
}
