import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { Clients } from "@/interfaces/Clients.interface";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientListRequest,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientPatchRequest,
  ClientPatchResponse,
  ClientSituationHistory,
  ClientInssPassword,
} from "@/interfaces/client/Client.interface";

/**
 * Cliente — espelha ClientController.
 *
 * Leituras devolvem `Clients` (shape de tela, legado) para compatibilidade com
 * os componentes atuais; escritas já usam os DTOs estritos do backend.
 * Paginação é 1-based.
 */

/**
 * Para ações que já avisaram o usuário na própria tela (janela de desfazer):
 * a requisição sai calada, sem o toast de sucesso do interceptor. Mesmo
 * contrato do `appointmentService`.
 */
export type SilenceableRequest = { silent?: boolean };

/** GET /api/v1/clients — listagem paginada + filtros. */
export const clients = async (
  params?: ClientListRequest,
): Promise<ApiEnvelope<Clients[]>> => {
  const response = await axiosInstance.get<ApiEnvelope<Clients[]>>(
    endpoints.CLIENTS.LIST,
    { params },
  );
  return {
    ...response.data,
    data: (response.data?.data ?? []).map(normalizarCliente),
  };
};

/**
 * Preenche `id` a partir do `clientId` que a API manda.
 *
 * O backend renomeou o id próprio do cliente de `id` para `clientId` (commit
 * `e142a83`); os sub-recursos — endereço, entrevista, pagamento, arquivo,
 * histórico — continuam com `id`. A tela inteira lê `client.id`: a listagem
 * para abrir a ficha, o kanban da home, o seletor de cliente da carteira, os
 * leads pendentes. Sem esta tradução, todos recebem `undefined` — e a ficha
 * virava `GET /clients/undefined`, com o backend reclamando de um parâmetro
 * que a tela nunca teve.
 *
 * A tradução mora aqui, e não em cada tela, porque este serviço já é o lugar
 * que converte contrato da API em shape de tela — está escrito no cabeçalho do
 * arquivo. Espalhar `client.clientId ?? client.id` por doze componentes é como
 * o próximo rename volta a doer.
 *
 * Aceita as duas grafias de propósito, enquanto durar a transição: a instância
 * local já renomeou e a da AWS pode estar num build anterior. Quando todo mundo
 * estiver no contrato novo, o `?? bruto.id` pode cair.
 */
function normalizarCliente<T extends { id?: string; clientId?: string }>(
  bruto: T,
): T {
  if (bruto == null) return bruto;
  const id = bruto.clientId ?? bruto.id;
  return { ...bruto, id, clientId: id };
}

/**
 * Recusa um id que não é id ANTES de virar requisição.
 *
 * `String(undefined)` é `"undefined"` — uma string perfeitamente verdadeira,
 * que passa por qualquer `if (!id)` e vai parar na URL. O backend devolve 400
 * dizendo "Valor inválido para o parâmetro 'clientId': undefined", e a
 * investigação começa no backend, que não tem nada a ver com o assunto: quem
 * perdeu o id foi a tela, alguns componentes antes.
 *
 * Falhar aqui aponta para o lugar certo na primeira tentativa.
 */
function exigirId(clientId: string | number, operacao: string): string {
  const id = String(clientId ?? "").trim();
  if (!id || id === "undefined" || id === "null") {
    throw new Error(
      `${operacao}: id de cliente ausente (recebido: ${JSON.stringify(clientId)}). ` +
        "Quem chamou perdeu o id — verifique a origem, não a API.",
    );
  }
  return id;
}

/** GET /api/v1/clients/{id} */
export const clientById = async (
  clientId: string | number,
): Promise<Clients> => {
  const response = await axiosInstance.get<ApiEnvelope<Clients>>(
    endpoints.CLIENTS.BY_ID(exigirId(clientId, "clientById")),
  );
  // backend às vezes retorna objeto cru para recurso único
  const cliente =
    (response.data?.data as Clients) ?? (response.data as unknown as Clients);
  return normalizarCliente(cliente);
};

/** POST /api/v1/clients */
export const createClient = async (
  body: ClientCreateRequest,
): Promise<ApiEnvelope<Clients>> => {
  const response = await axiosInstance.post<ApiEnvelope<Clients>>(
    endpoints.CLIENTS.CREATE,
    body,
  );
  // Quem cria um cliente costuma usar o id da resposta em seguida (abrir a
  // ficha, anexar arquivo). Sem normalizar aqui, o id chega `undefined` só
  // nesse caminho — o defeito mais difícil de achar, porque a listagem
  // funciona.
  return {
    ...response.data,
    data: normalizarCliente(response.data?.data ?? ({} as Clients)),
  };
};

/** PUT /api/v1/clients/{id} */
export const updateClient = async (
  clientId: string,
  body: ClientUpdateRequest,
): Promise<ApiEnvelope<Clients>> => {
  const response = await axiosInstance.put<ApiEnvelope<Clients>>(
    endpoints.CLIENTS.UPDATE(exigirId(clientId, "updateClient")),
    body,
  );
  // Quem cria um cliente costuma usar o id da resposta em seguida (abrir a
  // ficha, anexar arquivo). Sem normalizar aqui, o id chega `undefined` só
  // nesse caminho — o defeito mais difícil de achar, porque a listagem
  // funciona.
  return {
    ...response.data,
    data: normalizarCliente(response.data?.data ?? ({} as Clients)),
  };
};

/** PATCH /api/v1/clients/{id} — situação, benefício, clientType, notBillable. */
export const patchClient = async (
  clientId: string,
  body: ClientPatchRequest,
): Promise<ApiEnvelope<ClientPatchResponse>> => {
  const response = await axiosInstance.patch<ApiEnvelope<ClientPatchResponse>>(
    endpoints.CLIENTS.PATCH(exigirId(clientId, "patchClient")),
    body,
  );
  return response.data;
};

/**
 * DELETE /api/v1/clients/{id} — **exclusão lógica**.
 *
 * Este comentário já disse o contrário, e a diferença é grande: era hard
 * delete, com cascade levando endereços, entrevistas, pagamentos, arquivos e
 * histórico junto. Hoje o backend marca `deleted_at`, tira o registro de toda
 * consulta e libera o CPF para novo cadastro; os sub-recursos continuam lá.
 *
 * Existe volta: `GET /clients/deleted` lista os excluídos e
 * `PATCH /clients/{id}/restore` traz o cliente de volta inteiro. **Nenhuma das
 * duas está ligada na tela ainda** — enquanto não estiver, a única forma de
 * desfazer continua sendo a janela de desfazer antes do envio, então
 * `usePendingAction` segue valendo e não é mera cerimônia.
 *
 * Nesse fluxo passe `{ silent: true }`: o toast já foi mostrado com o botão
 * "Desfazer", e um segundo toast de sucesso ao final soaria como nova ação.
 */
export const deleteClient = async (
  clientId: string,
  options?: SilenceableRequest,
): Promise<ApiEnvelope<ClientPatchResponse>> => {
  const response = await axiosInstance.delete<ApiEnvelope<ClientPatchResponse>>(
    endpoints.CLIENTS.DELETE(exigirId(clientId, "deleteClient")),
    {
      successMessage: "Cliente excluído com sucesso.",
      skipSuccessToast: options?.silent,
    },
  );
  return response.data;
};

/**
 * GET /api/v1/clients/{id}/inss-password — a senha de acesso do cliente ao INSS.
 *
 * **Chame só quando o usuário pedir.** Cada leitura grava uma linha de
 * auditoria com quem consultou e quando; buscar ao abrir a ficha encheria a
 * trilha de ruído e a faria deixar de responder "quem foi buscar a senha da
 * dona Maria em março?" — que é a pergunta pela qual a rota existe.
 *
 * Restrita a ADMIN/LAWYER: para atendente o backend devolve 403. A tela esconde
 * o botão (ver `podeVerSenhaDoInss`), mas quem chama isto direto trate o 403.
 *
 * `skipErrorToast` porque a tela mostra a falha no próprio campo — um toast
 * global aqui ficaria longe de onde o usuário está olhando.
 */
export const revealInssPassword = async (
  clientId: string,
): Promise<string> => {
  const response = await axiosInstance.get<ApiEnvelope<ClientInssPassword>>(
    endpoints.CLIENTS.INSS_PASSWORD(exigirId(clientId, "revealInssPassword")),
    { skipErrorToast: true },
  );
  return response.data?.data?.inssPassword ?? "";
};

/** GET /api/v1/clients/{id}/situation-history — paginado. */
export const clientSituationHistory = async (
  clientId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<ClientSituationHistory[]>> => {
  const response = await axiosInstance.get<
    ApiEnvelope<ClientSituationHistory[]>
  >(endpoints.CLIENTS.SITUATION_HISTORY(exigirId(clientId, "clientSituationHistory")), { params });
  return response.data;
};
