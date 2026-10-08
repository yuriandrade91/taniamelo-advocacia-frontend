import { notificationCenter } from "@/services/notificationService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";

/**
 * O atalho que mantém o front inteiro no ar enquanto uma rota não sobe.
 *
 * ## Por que a costura fica AQUI, e não nas telas
 *
 * As rotas `/users/me`, `/payments`, `/expenses` e `/revenues` existem no
 * repositório do backend e ainda não estão na instância de desenvolvimento. Dá
 * para lidar com isso em dois lugares, e a diferença é grande:
 *
 * - **Nas telas** — apagar componente, tabela, gráfico e modal. Foi o primeiro
 *   caminho que eu tomei, e estava errado: religar depois é reescrever tela, e
 *   no meio do caminho ninguém consegue nem *ver* o que já está construído.
 * - **Aqui** — cada função do serviço devolve vazio ou recusa, sem tocar a
 *   rede. Nenhuma tela muda de forma: tabela renderiza vazia, resumo renderiza
 *   zerado, modal abre. E religar é apagar uma linha por função.
 *
 * ## Zero não mente aqui, e por quê
 *
 * "Número errado em tela financeira é pior que tela vazia" continua verdade —
 * mas o que torna um zero perigoso é ele ser *indistinguível* de um saldo real.
 * As telas já dizem qual metade não respondeu (a Carteira tem o estado
 * `partial`/`error`, Pagamentos tem o aviso de consolidação). A recusa abaixo
 * cai exatamente nesses caminhos, então o zero aparece **com o aviso ao lado**.
 *
 * Por isso os resumos **recusam** em vez de devolver um resumo zerado: é o que
 * faz a tela entrar no estado de erro que ela já sabe mostrar. Listas e séries
 * devolvem vazio, porque lista vazia é um estado normal que a tela desenha bem.
 *
 * ## Escrita nunca é silenciosa
 *
 * Um POST que "desse certo" sem gravar seria o pior defeito possível: toast
 * verde, formulário fechando, nada no banco. Então escrita avisa e estoura.
 */

const REASON = "ainda não está no ar neste ambiente";

/**
 * Quais integrações estão em pausa — **por ambiente**, não no código.
 *
 * A primeira versão disto era um `return` incondicional no topo de cada função,
 * e estava errado do jeito mais caro: o `pnpm dev` aponta para o backend
 * LOCAL, que tem as rotas, e o atalho desligava integração que funcionava ali.
 * Quem desenvolve perdia telas por causa do estado de um servidor remoto.
 *
 * Agora quem decide é `NEXT_PUBLIC_INTEGRACOES_PENDENTES`, lista separada por
 * vírgula em `env/*.env`. Vazia — que é o padrão — significa tudo ligado: um
 * ambiente novo nasce com o front inteiro, e só desliga o que ele comprovadamente
 * não serve. O contrário (nascer desligado) faria uma integração ficar pausada
 * em produção porque alguém esqueceu de listar.
 */
const PAUSED: ReadonlySet<string> = new Set(
  (process.env.NEXT_PUBLIC_INTEGRACOES_PENDENTES ?? "")
    .split(",")
    .map((nome) => nome.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Este grupo de rotas está pausado neste ambiente?
 *
 * Grupos, e não rotas uma a uma: `/revenues`, `/revenues/summary` e
 * `/revenues/timeline` sobem juntas — vêm do mesmo controller. Listar as três
 * separadamente só criaria a chance de pausar duas e esquecer a terceira.
 */
export const pendingIntegration = (grupo: string): boolean =>
  PAUSED.has(grupo.toLowerCase());

/**
 * Erro com o formato de envelope da API.
 *
 * Não é capricho: as telas leem `response.data.errors[].message` para achar a
 * mensagem (ver `fieldError`/`firstMessage`). Um `Error` cru cairia no
 * texto genérico de cada `catch` e a pessoa não saberia por quê.
 */
function integrationError(route: string) {
  return {
    isPendingIntegration: true,
    message: `Integração pendente: ${route}`,
    response: {
      status: 501,
      data: {
        success: false,
        data: null,
        pagination: null,
        errors: [
          {
            field: null,
            code: "INTEGRACAO_PENDENTE",
            message: `${route} ${REASON}.`,
          },
        ],
      },
    },
  };
}

/** Leitura que a tela precisa ver falhar para mostrar o aviso que ela já tem. */
export function pendingRead(route: string): Promise<never> {
  return Promise.reject(integrationError(route));
}

/**
 * Escrita: avisa e estoura.
 *
 * `silent` para quem já mostra a mensagem no próprio campo — a troca de senha
 * faz isso, e dois toasts para o mesmo erro é ruído.
 */
export function pendingWrite(
  route: string,
  options?: { silent?: boolean },
): Promise<never> {
  if (!options?.silent) {
    notificationCenter.danger(`Não foi possível salvar: ${route} ${REASON}.`);
  }
  return Promise.reject(integrationError(route));
}

/** Lista vazia é estado normal: a tabela desenha o "nenhum resultado" dela. */
export function pendingEmptyList<T>(): Promise<ApiEnvelope<T[]>> {
  return Promise.resolve({
    success: true,
    data: [],
    pagination: {
      pageNumber: 1,
      pageSize: 0,
      totalRecords: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
}

/**
 * Série mensal vazia.
 *
 * Vazia, e não zerada mês a mês: mês zerado é afirmação ("não houve
 * movimento"), e não é isso que se sabe. As telas tratam série vazia como
 * ausência de dado e não desenham o gráfico.
 */
export function pendingEmptySeries<T>(): Promise<ApiEnvelope<T[]>> {
  return Promise.resolve({ success: true, data: [] });
}

