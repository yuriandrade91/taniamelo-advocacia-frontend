import { markPrincipalSimulation, uploadDocuments, uploadSimulations } from "@/services/clientFileService";
import type { RequestFeedback } from "@/services/requestFeedback";
import { buildDocumentsFormData, buildSimulationsFormData } from "../../documentsFormData";
import type { StagedDocument, StagedSimulation } from "./types";

/**
 * Envia os arquivos escolhidos de um cliente que já existe — no "Salvar
 * cliente" do cadastro e no "Salvar" da ficha.
 *
 * Documentos e simulações são dois envios, e um falhar não segura o outro:
 * cada lado volta dizendo se entrou, para a tela limpar só o que subiu.
 * `options` vale para os dois (`silent` no fluxo que avisa uma vez no fim).
 *
 * A principal escolhida na tela vai depois, por rota própria: o upload não a
 * recebe, e o backend faz principal a última simulação do lote — sem este
 * passo, a estrela marcada na v1 virava a v2 gravada.
 */
export async function uploadStagedFiles(
  clientId: string,
  documents: readonly StagedDocument[],
  simulations: readonly StagedSimulation[],
  options?: RequestFeedback,
): Promise<{ documents: boolean; simulations: boolean }> {
  const sent = { documents: true, simulations: true };

  if (documents.length > 0) {
    try {
      await uploadDocuments(clientId, buildDocumentsFormData(documents), options);
    } catch {
      sent.documents = false;
    }
  }

  if (simulations.length > 0) {
    let created: readonly { id: string }[] = [];
    try {
      const envelope = await uploadSimulations(
        clientId,
        buildSimulationsFormData(
          simulations.map((item) => ({
            file: item.file,
            simulationDate: item.simulationDate,
            version: item.version,
            vinculos: item.vinculos ? Number(item.vinculos) : undefined,
            notes: item.notes,
          })),
        ),
        options,
      );
      created = envelope?.data ?? [];
    } catch {
      sent.simulations = false;
    }

    // Os arquivos já subiram: se só a marca falhar, eles não contam como não
    // enviados — senão o próximo "Salvar" os mandaria de novo, em dobro. O
    // erro aparece pela central, como qualquer erro de requisição.
    const principal = principalIdOf(simulations, created);
    if (principal) {
      try {
        await markPrincipalSimulation(clientId, principal, { silent: true });
      } catch {
        // O interceptor do axiosService já mostrou o erro.
      }
    }
  }

  return sent;
}

/**
 * O id gravado da simulação marcada como principal na tela. A resposta do
 * upload vem na ordem do envio, então a posição da escolhida dá o id. `null` se
 * nenhuma foi marcada (vale a regra do backend) ou se a resposta não tem a
 * mesma contagem do envio (sem como casar posição com arquivo).
 */
export function principalIdOf(
  staged: readonly Pick<StagedSimulation, "isPrincipal">[],
  created: readonly { id: string }[],
): string | null {
  if (created.length !== staged.length) return null;
  const index = staged.findIndex((item) => item.isPrincipal);
  return index === -1 ? null : created[index].id;
}
