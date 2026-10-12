import type { RequestStageKey } from "@/enums/requestStage/RequestStage";
import { patchClient } from "@/services/clientService";
import { requestStageChangedMessage, requestStagePatch } from "./requestStages";
import { invalidateRequestStageTrail } from "./stageTrails";

/**
 * Muda a etapa no INSS de um cliente — o mesmo caminho na lista e na ficha:
 * o PATCH (com a justificativa, quando a etapa pede), o aviso da central e a
 * trilha do cliente fora do cache, para o próximo cartão reler as datas.
 *
 * Rejeita em erro (o toast já saiu do interceptor): quem chama deixa o cartão
 * aberto para tentar de novo.
 */
export async function changeRequestStage(
  clientId: string,
  clientName: string,
  stage: RequestStageKey,
  justification?: string,
): Promise<void> {
  await patchClient(clientId, requestStagePatch(stage, justification), {
    successMessage: requestStageChangedMessage(clientName, stage),
  });
  invalidateRequestStageTrail(clientId);
}
