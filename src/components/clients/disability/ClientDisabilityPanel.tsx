"use client";

import { useCallback, useEffect, useImperativeHandle, useState } from "react";
import type { Ref } from "react";
import {
  DisabilityConversion,
  DisabilitySection,
} from "@/components/clients/form/sections/DisabilitySection";
import {
  type DisabilityPeriodDraft,
  disabilityDraftFromResponse,
  hasDisabilityInput,
  newDisabilityPeriod,
  toDisabilityPeriodRequest,
  validateDisabilityPeriods,
} from "@/components/clients/form/disabilityPeriods";
import { conversionFromServer } from "@/components/clients/form/disabilityConversion";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
import { basisFromGender } from "@/lib/disabilityTime";
import { formatDateBR } from "@/lib/format";
import type { ConversionResult } from "@/lib/disabilityTime";
import {
  type DisabilityPeriodResponse,
  createDisabilityPeriod,
  deleteDisabilityPeriod,
  getDisabilityConversion,
  listDisabilityPeriods,
  updateDisabilityPeriod,
} from "@/services/clientDisabilityPeriodService";
import { todayIso } from "@/lib/period";

/** O que a ficha pede ao painel: conferir antes de salvar, e salvar. */
export type ClientDisabilityPanelHandle = {
  /** Mostra os erros e diz se dá para salvar. Não toca a rede. */
  validate: () => boolean;
  /**
   * Grava o que mudou — `PUT` no gravado que foi mexido, `POST` no novo — sem
   * toast: o aviso é um só, o da ficha. Diz se gravou alguma coisa; lança no
   * primeiro erro, para a ficha mostrar a mensagem no lugar de sempre.
   */
  save: () => Promise<boolean>;
};

export type ClientDisabilityPanelProps = {
  clientId: string;
  /** Rótulo de sexo como a API devolve — escolhe a coluna da LC 142/2013. */
  gender?: string;
  isEditing: boolean;
  /** `@RequerAdvogado` no `DELETE`: sem o papel, intervalo gravado não sai. */
  canDeleteSaved: boolean;
  /** Quantos intervalos estão gravados — a ficha usa no selo e na visibilidade. */
  onSavedCountChange?: (count: number) => void;
  ref?: Ref<ClientDisabilityPanelHandle>;
};


/** Gravados viram rascunho editável; sem nenhum, uma linha em branco. */
const draftsFrom = (list: DisabilityPeriodResponse[]) =>
  list.length > 0
    ? list.map(disabilityDraftFromResponse)
    : [newDisabilityPeriod()];

/**
 * Períodos de deficiência na ficha de um cliente já gravado.
 *
 * Na leitura mostra a conta **do servidor** (`GET .../conversion`): é o número
 * que vai para o requerimento, e numa ficha já existe `clientId` para pedi-lo.
 * Na edição troca para a seção do cadastro, com a prévia local recalculando a
 * cada data digitada — esperar o servidor a cada tecla seria inviável.
 *
 * Smart component de propósito: a ficha já orquestra dados, endereço,
 * entrevista e arquivos; o estado dos intervalos (rascunhos, ids, erros,
 * conversão) mora aqui para não engordar o `handleSave` dela. A ficha só chama
 * `validate` e `save` pela ref, dentro do Salvar que já existe.
 */
export function ClientDisabilityPanel({
  clientId,
  gender,
  isEditing,
  canDeleteSaved,
  onSavedCountChange,
  ref,
}: ClientDisabilityPanelProps) {
  const [saved, setSaved] = useState<DisabilityPeriodResponse[]>([]);
  const [drafts, setDrafts] = useState<DisabilityPeriodDraft[]>([
    newDisabilityPeriod(),
  ]);
  const [revealed, setRevealed] = useState(false);
  const [conversion, setConversion] = useState<ConversionResult | null>(null);
  const [conversionFailed, setConversionFailed] = useState(false);
  const [removal, setRemoval] = useState<DisabilityPeriodDraft | null>(null);
  const [today] = useState(() => todayIso());

  const load = useCallback(async () => {
    let list: DisabilityPeriodResponse[] = [];
    try {
      const envelope = await listDisabilityPeriods(clientId);
      list = envelope?.data ?? [];
    } catch (error) {
      console.debug("Could not load disability periods:", error);
    }
    setSaved(list);
    setDrafts(draftsFrom(list));
    setRevealed(false);

    // Sem intervalo, não há conta a pedir: a rota devolveria um total zerado
    // que a tela mostraria como se fosse resultado.
    if (list.length === 0) {
      setConversion(null);
      setConversionFailed(false);
      return;
    }
    try {
      const envelope = await getDisabilityConversion(clientId, undefined, {
        silent: true,
      });
      const result = conversionFromServer(envelope?.data);
      setConversion(result);
      setConversionFailed(result === null);
    } catch (error) {
      // 400 quando o sexo não tem coluna na lei; o aviso abaixo explica.
      console.debug("Could not load disability conversion:", error);
      setConversion(null);
      setConversionFailed(true);
    }
  }, [clientId]);

  // O sexo entra na dependência: corrigido na ficha, a coluna da lei muda e a
  // conta precisa ser pedida de novo.
  useEffect(() => {
    void load();
  }, [load, gender]);

  useEffect(() => {
    onSavedCountChange?.(saved.length);
  }, [onSavedCountChange, saved.length]);

  // Cancelar a edição devolve os intervalos gravados, sem rascunho perdido na
  // tela fingindo que foi salvo.
  useEffect(() => {
    if (!isEditing) {
      setDrafts(draftsFrom(saved));
      setRevealed(false);
    }
  }, [isEditing, saved]);

  const errors = revealed ? validateDisabilityPeriods(drafts, today) : {};

  useImperativeHandle(
    ref,
    () => ({
      validate: () => {
        setRevealed(true);
        return Object.keys(validateDisabilityPeriods(drafts, today)).length === 0;
      },
      save: async () => {
        const stored = new Map(
          saved.map((period) => [period.id, toDisabilityPeriodRequest(disabilityDraftFromResponse(period))]),
        );
        const toSave = drafts.filter(
          (draft) =>
            hasDisabilityInput(draft) &&
            (!draft.id || JSON.stringify(stored.get(draft.id)) !== JSON.stringify(toDisabilityPeriodRequest(draft))),
        );
        if (toSave.length === 0) return false;
        try {
          for (const period of toSave) {
            const body = toDisabilityPeriodRequest(period);
            if (period.id) {
              await updateDisabilityPeriod(clientId, period.id, body, { silent: true });
            } else {
              await createDisabilityPeriod(clientId, body, { silent: true });
            }
          }
          return true;
        } finally {
          // Recarrega mesmo na falha: o que entrou ganha id, e um novo Salvar
          // vira PUT em vez de duplicar o intervalo.
          await load();
        }
      },
    }),
    [clientId, drafts, saved, load, today],
  );

  const updateDraft = (key: string, patch: Partial<DisabilityPeriodDraft>) =>
    setDrafts((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );

  const dropDraft = (key: string) =>
    setDrafts((current) =>
      current.length === 1
        ? [newDisabilityPeriod()]
        : current.filter((item) => item.key !== key),
    );

  const requestRemove = (key: string) => {
    const period = drafts.find((item) => item.key === key);
    if (!period) return;
    if (period.id) setRemoval(period);
    else dropDraft(key);
  };

  const confirmRemove = async () => {
    const period = removal;
    setRemoval(null);
    if (!period?.id) return;
    try {
      await deleteDisabilityPeriod(clientId, period.id);
      // Recarrega tudo, e não só tira a linha: o total muda, e é o servidor
      // que diz quanto ficou.
      await load();
    } catch (error) {
      // O toast do interceptor já diz por quê; o intervalo fica na tela.
      console.error("Erro ao excluir período de deficiência:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {isEditing ? (
        <DisabilitySection
          periods={drafts}
          errors={errors}
          gender={gender}
          today={today}
          onChange={updateDraft}
          onAdd={() => setDrafts((current) => [...current, newDisabilityPeriod()])}
          onRemove={requestRemove}
          canDeleteSaved={canDeleteSaved}
        />
      ) : saved.length === 0 ? (
        <p className="text-sm text-gray-100">
          Nenhum período de deficiência cadastrado. Use Editar para incluir.
        </p>
      ) : conversion ? (
        <DisabilityConversion
          conversion={conversion}
          gender={gender}
          hasBasis
          hasPeriods
          source="server"
        />
      ) : (
        <SavedPeriodsFallback
          periods={saved}
          gender={gender}
          explainBasis={conversionFailed}
        />
      )}

      <ConfirmDialog
        isOpen={removal !== null}
        onClose={() => setRemoval(null)}
        onConfirm={() => void confirmRemove()}
        tone="danger"
        heading="Excluir este período de deficiência?"
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description="O intervalo sai da ficha e do cálculo da LC 142/2013. Não há como desfazer."
      />
    </div>
  );
}

/**
 * Os intervalos crus, quando a conta do servidor não veio.
 *
 * Acontece com sexo fora da tabela da lei (400) ou com o servidor fora do ar.
 * Os intervalos gravados continuam sendo dado do cliente e aparecem; só o
 * total, que dependeria de uma escolha que a tela não pode fazer, fica de fora.
 */
function SavedPeriodsFallback({
  periods,
  gender,
  explainBasis,
}: {
  periods: DisabilityPeriodResponse[];
  gender?: string;
  explainBasis: boolean;
}) {
  const withoutColumn = !basisFromGender(gender);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-1 text-sm text-gray-100">
        {periods.map((period) => (
          <li key={period.id}>
            <span className="font-medium">{period.grade}</span> —{" "}
            {formatDateBR(period.startedOn)} a{" "}
            {period.ongoing || !period.endedOn
              ? "hoje"
              : formatDateBR(period.endedOn)}{" "}
            ({period.days} dias)
          </li>
        ))}
      </ul>
      {explainBasis && (
        <p className="rounded-lg bg-light-gray/50 p-3 text-sm text-gray-100">
          {withoutColumn
            ? gender
              ? `A conversão da LC 142/2013 tem tabela apenas para os sexos masculino e feminino — o deste cliente está como "${gender}".`
              : "Informe o sexo do cliente em Dados pessoais para calcular o tempo convertido."
            : "Não foi possível obter o tempo convertido agora. Os períodos acima estão gravados."}
        </p>
      )}
    </div>
  );
}
