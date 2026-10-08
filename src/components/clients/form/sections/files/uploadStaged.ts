import { uploadDocuments, uploadSimulations } from "@/services/clientFileService";
import { buildDocumentsFormData, buildSimulationsFormData } from "../../documentsFormData";
import type { StagedDocument, StagedSimulation } from "./types";

/**
 * Envia os arquivos escolhidos de um cliente que já existe — no "Salvar
 * cliente" e no "Enviar arquivos" da edição.
 *
 * Documentos e simulações são dois envios, e um falhar não segura o outro:
 * cada lado volta dizendo se entrou, para a tela limpar só o que subiu.
 */
export async function uploadStagedFiles(
  clientId: string,
  documents: readonly StagedDocument[],
  simulations: readonly StagedSimulation[],
): Promise<{ documents: boolean; simulations: boolean }> {
  const sent = { documents: true, simulations: true };

  if (documents.length > 0) {
    try {
      await uploadDocuments(clientId, buildDocumentsFormData(documents));
    } catch (error) {
      console.error("Erro ao enviar documentos:", error);
      sent.documents = false;
    }
  }

  if (simulations.length > 0) {
    try {
      await uploadSimulations(
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
      );
    } catch (error) {
      console.error("Erro ao enviar simulações:", error);
      sent.simulations = false;
    }
  }

  return sent;
}
