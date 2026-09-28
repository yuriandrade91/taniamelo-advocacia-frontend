"use client";

import { getSessionUser } from "@/lib/sessionUser";

/**
 * O que o papel do usuário permite ver na tela.
 *
 * **Isto não autoriza nada.** Quem autoriza é o backend (`@RequerAdvogado` nos
 * controllers), que devolve 403 independentemente do que a tela mostre. O que
 * mora aqui é a outra metade do trabalho: não oferecer ao atendente um botão
 * que vai recusá-lo. Esconder sem o backend seria teatro; o backend sem
 * esconder seria uma tela cheia de armadilha.
 *
 * O corte principal é entre **operar e destruir**. Atendente faz o dia a dia
 * inteiro — cadastra e edita cliente, marca, cancela e conclui compromisso.
 * Excluir, restaurar e ler a senha do INSS exigem advogado ou admin.
 *
 * O financeiro tem corte próprio, mais estrito: **só ADMIN**, advogado
 * inclusive. Ali não se trata de risco de perder dado, e sim de quem tem que
 * ver honorários.
 *
 * O papel vem do `LoginResponse`, guardado na sessão local. Como todo dado de
 * storage, pode estar ausente ou adulterado: na dúvida devolvemos `false`, que
 * esconde o botão. Errar para menos aqui custa um "não achei o botão"; errar
 * para mais custa um clique que toma 403 na cara do usuário.
 */

/** Papéis do backend (enum Role). O backend devolve o nome da constante. */
export const PAPEIS_QUE_DESTROEM = ["ADMIN", "LAWYER"] as const;

function papelAtual(): string {
  return (getSessionUser()?.role ?? "").trim().toUpperCase();
}

/** ADMIN ou LAWYER: pode excluir, restaurar e ler dado sensível. */
export function podeDestruir(): boolean {
  return (PAPEIS_QUE_DESTROEM as readonly string[]).includes(papelAtual());
}

/**
 * A senha do INSS é leitura, não destruição — mas é a leitura mais sensível da
 * API, e o backend a trata com o mesmo papel. Existe com nome próprio para o
 * dia em que uma das duas regras mudar sem a outra.
 */
export function podeVerSenhaDoInss(): boolean {
  return podeDestruir();
}

/** Listar quem trabalha no escritório não é da conta de quem só opera. */
export function podeListarUsuarios(): boolean {
  return podeDestruir();
}

/**
 * Financeiro do cliente (`/clients/{id}/payments`): só ADMIN.
 *
 * Note que NÃO é `podeDestruir()`: advogado passa em excluir e restaurar, e
 * não passa aqui. Honorários são do escritório, não do caso — o backend
 * devolve 403 para LAWYER também (`@RequerAdmin` na classe do controller), e
 * esconder a aba evita oferecer uma tela que só vai recusar.
 *
 * Vale para LER também, não só para lançar: o recurso inteiro é fechado.
 */
export function podeVerFinanceiro(): boolean {
  return papelAtual() === "ADMIN";
}
