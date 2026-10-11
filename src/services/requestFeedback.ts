/**
 * O retorno de uma gravação, como cada serviço o declara.
 *
 * Toda requisição que grava (POST/PUT/PATCH/DELETE) passa pela central de
 * notificações (`notificationService`), e o sucesso vira toast com a mensagem
 * do que foi feito — "Cliente atualizado.", "Endereço salvo.". É o serviço
 * quem a declara, porque é ele quem sabe o que a rota faz.
 *
 * Quem chama pode:
 * - trocar a mensagem (`successMessage`): "Situação de Maria atualizada…";
 * - calar o sucesso (`silent`): num fluxo de várias requisições, que avisa uma
 *   vez no fim, ou numa ação com janela de desfazer, que já avisou no clique.
 *
 * O erro nunca se cala por aqui: ele vai para a central de qualquer jeito.
 */
export type RequestFeedback = { silent?: boolean; successMessage?: string };

/** A config do axios para o retorno pedido: a mensagem do serviço, a de quem chama por cima, ou silêncio. */
export const feedback = (successMessage: string, options?: RequestFeedback) => ({
  successMessage: options?.successMessage ?? successMessage,
  skipSuccessToast: options?.silent === true,
});
