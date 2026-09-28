/**
 * Mensagens exibidas quando a API não manda `message` (nem `errors[].message`)
 * — o texto que aparece nos `else`/fallback de cada tratamento de erro.
 *
 * Não confundir com `httpMessages.ts` (título/descrição genéricos por status
 * HTTP, usados pelo `notificationService` como último recurso): aqui ficam os
 * fallbacks específicos de cada fluxo de negócio.
 */
const fallbackMessages = {
  GENERIC: {
    TITLE: "Erro",
    UNEXPECTED: "Erro inesperado.",
    CONNECTION_TITLE: "Erro de conexão",
    CONNECTION: "Não foi possível conectar-se ao servidor.",
    OPERATION_FAILED: "Não foi possível concluir a operação.",
  },

  AUTH: {
    LOGIN_FAILED: "Não foi possível entrar. Tente novamente.",
    INVALID_CREDENTIALS: "Usuário ou senha inválidos.",
    ACCESS_DENIED: "Acesso não permitido para este usuário.",
    TENANT_NOT_FOUND:
      "Não foi possível identificar o escritório. Verifique a configuração.",
    SERVER_ERROR: "Erro ao conectar-se ao servidor. Tente novamente.",
  },

  CLIENTS: {
    LOAD_FAILED: "Erro desconhecido",
    DELETE_FAILED: "Erro ao deletar cliente",
    UPDATE_FAILED: "Erro ao atualizar cliente",
  },
} as const;

export default fallbackMessages;
