type HttpStatus =
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 408
  | 409
  | 500
  | 502
  | 503
  | 504;

const httpMessages: Partial<
  Record<HttpStatus, { title: string; description: string }>
> = {
  201: { title: "Cliente cadastrado com sucesso!", description: "Verifique a lista de clientes." },
  204: {
    title: "Operação concluída",
    description: "Sucesso na operação.",
  },
  400: {
    title: "Requisição inválida",
    description: "Erro nos dados enviados.",
  },
  401: {
    title: "Não autorizado",
    description: "Redirecionando para login.",
  },
  403: { title: "Acesso negado!", description: "Você não tem permissão para acessar este recurso." },
  404: { title: "Não encontrado!", description: "O recurso não existe." },
  408: {
    title: "Erro ao processar requisição",
    description: "Favor tente novamente.",
  },
  409: {
    title: "Dados inválidos",
    description: "Erro nos dados enviados.",
  },
  500: { title: "Erro interno", description: "Tente novamente mais tarde." },
  502: {
    title: "Gateway inválido",
    description: "Erro na comunicação com o servidor.",
  },
  503: {
    title: "Serviço indisponível",
    description: "Servidor temporariamente fora do ar.",
  },
  504: {
    title: "Tempo esgotado",
    description: "Servidor não respondeu a tempo.",
  },
};

export default httpMessages;
export type { HttpStatus };
