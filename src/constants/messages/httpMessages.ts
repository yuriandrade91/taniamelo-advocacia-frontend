type HttpStatus =
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 408
  | 409
  | 429
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
  // 403 agora tem um significado só neste sistema: o papel do usuário não
  // permite a ação (excluir, restaurar, ler a senha do INSS). Dizer "peça a um
  // advogado ou admin" resolve o problema de quem leu; "você não tem permissão"
  // deixa a pessoa sem saber a quem recorrer.
  403: {
    title: "Ação restrita",
    description: "Esta ação é de advogado ou admin. Peça a quem tem esse acesso.",
  },
  404: { title: "Não encontrado!", description: "O recurso não existe." },
  408: {
    title: "Erro ao processar requisição",
    description: "Favor tente novamente.",
  },
  409: {
    title: "Dados inválidos",
    description: "Erro nos dados enviados.",
  },
  // Só o login é freado hoje. A tela de login trata o 429 por conta própria
  // (com o Retry-After); este texto é a rede de segurança para qualquer outra
  // rota que venha a ser limitada.
  429: {
    title: "Muitas tentativas",
    description: "Aguarde alguns minutos antes de tentar de novo.",
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
