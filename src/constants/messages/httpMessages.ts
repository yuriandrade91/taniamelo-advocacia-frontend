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
  201: { title: "Recurso Criado", description: "Sucesso na criação." },
  204: {
    title: "Operação Concluída",
    description: "Sucesso na operação.",
  },
  400: {
    title: "Requisição Inválida",
    description: "Erro nos dados enviados.",
  },
  401: {
    title: "Não Autorizado",
    description: "Redirecionando para login.",
  },
  403: { title: "Acesso Negado", description: "Permissão insuficiente." },
  404: { title: "Não Encontrado", description: "O recurso não existe." },
  408: {
    title: "Erro ao Processar Requisição",
    description: "Favor tente novamente.",
  },
  409: {
    title: "Dados Inválidos",
    description: "Erro nos dados enviados.",
  },
  500: { title: "Erro Interno", description: "Tente novamente mais tarde." },
  502: {
    title: "Gateway Inválido",
    description: "Erro na comunicação com o servidor.",
  },
  503: {
    title: "Serviço Indisponível",
    description: "Servidor temporariamente fora do ar.",
  },
  504: {
    title: "Tempo Esgotado",
    description: "Servidor não respondeu a tempo.",
  },
};

export default httpMessages;
export type { HttpStatus };
