"use client";

import { useCallback, useEffect, useImperativeHandle, useState, type Ref } from "react";
import { DatePickerField, Field, SelectField, TextAreaField } from "@/components/ui/form/Field";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import { toSelectOptions } from "@/components/ui/form/options";
import { TrashIcon } from "@/components/ui/icons/actions";
import { RowSkeletons } from "@/components/ui/feedback/Loading";
import { Notice } from "@/components/ui/feedback/Notice";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
import { AddItemButton, FormGroup } from "@/components/clients/form/FormGroup";
import { RequestStageLabelByKey, RequestStageOptions } from "@/enums/requestStage/RequestStage";
import { formatDateBR } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { pendingIntegration } from "@/services/pendingIntegration";
import {
  INSS_STEPS_INTEGRATION,
  type InssStepResponse,
  createInssStep,
  deleteInssStep,
  listInssSteps,
  updateInssStep,
} from "@/services/clientInssStepService";
import { InssStepTrail } from "./InssStepTrail";
import {
  NOTES_MAX_LENGTH,
  PROTOCOL_MAX_LENGTH,
  type InssStepDraft,
  changedInssSteps,
  inssDraftFromResponse,
  inssStatusOf,
  latestFirst,
  newInssStep,
  toInssStepRequest,
  validateInssSteps,
} from "./inssSteps";

/** O que a ficha pede ao painel: conferir antes de salvar, e salvar. */
export type ClientInssPanelHandle = {
  /** Mostra os erros e diz se dá para salvar. Não toca a rede. */
  validate: () => boolean;
  /**
   * Grava o que mudou — `PUT` no gravado que foi mexido, `POST` no novo — sem
   * toast: o aviso é um só, o da ficha. Diz se gravou alguma coisa.
   */
  save: () => Promise<boolean>;
};

export type ClientInssPanelProps = {
  clientId: string;
  isEditing: boolean;
  /** Excluir evento gravado é de advogado/admin, como os outros sub-recursos. */
  canDeleteSaved: boolean;
  /** Índice `id do usuário -> nome`, de `useOfficeAuthors`. */
  authors?: Record<string, string>;
  /** A etapa atual ("Exigência"), para o selo da seção no painel da ficha. */
  onStatusChange?: (label: string | undefined) => void;
  ref?: Ref<ClientInssPanelHandle>;
};

type LoadState = "loading" | "ready" | "error" | "paused";

const STEP_OPTIONS = toSelectOptions(RequestStageOptions);

const draftsFrom = (list: readonly InssStepResponse[]) => list.map(inssDraftFromResponse);

/**
 * "Andamento no INSS" na ficha de um cliente **já cadastrado** — o processo
 * no INSS só existe depois do cadastro, e por isso esta seção não aparece em
 * `/clientes/novo`.
 *
 * Lendo, a esteira e a linha do tempo (`InssStepTrail`). Editando, cada evento
 * vira um grupo de campos e "Registrar andamento" acrescenta um no topo, já
 * com a etapa que costuma seguir a última; tudo grava no "Salvar" da ficha,
 * como os períodos de deficiência — o painel segue o mesmo contrato
 * (`validate`/`save` pela ref).
 */
export function ClientInssPanel({
  clientId,
  isEditing,
  canDeleteSaved,
  authors,
  onStatusChange,
  ref,
}: ClientInssPanelProps) {
  const [saved, setSaved] = useState<InssStepResponse[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [drafts, setDrafts] = useState<InssStepDraft[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [removal, setRemoval] = useState<InssStepDraft | null>(null);
  const [today] = useState(() => todayIso());

  const load = useCallback(async () => {
    if (pendingIntegration(INSS_STEPS_INTEGRATION)) {
      setState("paused");
      return;
    }
    try {
      const envelope = await listInssSteps(clientId);
      const list = latestFirst(envelope?.data ?? []);
      setSaved(list);
      setDrafts(draftsFrom(list));
      setState("ready");
    } catch (error) {
      // O toast do interceptor já disse por quê; a seção mostra a falha no lugar.
      console.debug("Could not load INSS steps:", error);
      setState("error");
    }
    setRevealed(false);
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = inssStatusOf(saved, today)?.label;
  useEffect(() => {
    onStatusChange?.(statusLabel);
  }, [onStatusChange, statusLabel]);

  // Cancelar a edição devolve os eventos gravados, sem rascunho fingindo que foi salvo.
  useEffect(() => {
    if (!isEditing) {
      setDrafts(draftsFrom(saved));
      setRevealed(false);
    }
  }, [isEditing, saved]);

  const errors = revealed ? validateInssSteps(drafts, today) : {};

  useImperativeHandle(
    ref,
    () => ({
      validate: () => {
        setRevealed(true);
        return Object.keys(validateInssSteps(drafts, today)).length === 0;
      },
      save: async () => {
        const toSave = changedInssSteps(drafts, saved);
        if (toSave.length === 0) return false;
        try {
          // Do mais antigo para o mais novo: no mesmo dia, a ordem de
          // registro é o desempate da linha do tempo.
          for (const draft of [...toSave].reverse()) {
            const body = toInssStepRequest(draft);
            if (draft.id) await updateInssStep(clientId, draft.id, body, { silent: true });
            else await createInssStep(clientId, body, { silent: true });
          }
          return true;
        } finally {
          // Recarrega mesmo na falha: o que entrou ganha id, e um novo Salvar
          // vira PUT em vez de duplicar o evento.
          await load();
        }
      },
    }),
    [clientId, drafts, saved, load, today],
  );

  const updateDraft = (key: string, patch: Partial<InssStepDraft>) =>
    setDrafts((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const addDraft = () => setDrafts((current) => [newInssStep(current[0]?.step || null), ...current]);

  const requestRemove = (draft: InssStepDraft) => {
    if (draft.id) setRemoval(draft);
    else setDrafts((current) => current.filter((item) => item.key !== draft.key));
  };

  const confirmRemove = async () => {
    const target = removal;
    setRemoval(null);
    if (!target?.id) return;
    try {
      await deleteInssStep(clientId, target.id);
      await load();
    } catch (error) {
      // O toast do interceptor já diz por quê; o evento fica na tela.
      console.error("Erro ao excluir andamento no INSS:", error);
    }
  };

  if (state === "loading") return <RowSkeletons count={3} />;
  if (state === "paused") {
    return <Notice>O andamento no INSS ainda não está no ar neste ambiente.</Notice>;
  }
  if (state === "error") {
    return (
      <Notice tone="danger">
        Não foi possível carregar o andamento no INSS. As demais informações da ficha continuam válidas.
      </Notice>
    );
  }

  if (!isEditing) {
    return saved.length === 0 ? (
      <Notice>Nenhum andamento no INSS registrado. Use Editar cadastro para registrar o requerimento.</Notice>
    ) : (
      <InssStepTrail items={saved} today={today} authors={authors} />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <AddItemButton onClick={addDraft}>Registrar andamento</AddItemButton>
      </div>

      {drafts.length === 0 && (
        <Notice>Nenhum andamento no INSS registrado. Comece pelo requerimento.</Notice>
      )}

      {drafts.map((draft) => {
        const fieldErrors = errors[draft.key] ?? {};
        const removable = draft.id ? canDeleteSaved : true;
        const stored = draft.id ? saved.find((item) => item.id === draft.id) : undefined;
        return (
          <FormGroup
            key={draft.key}
            title={
              stored
                ? `${stored.step} · ${formatDateBR(stored.occurredOn)}`
                : draft.step
                  ? `Novo: ${RequestStageLabelByKey[draft.step]}`
                  : "Novo andamento"
            }
            action={
              removable && (
                <ChipButton
                  tone="danger"
                  icon={<TrashIcon className="h-3.5 w-3.5" />}
                  onClick={() => requestRemove(draft)}
                >
                  Remover
                </ChipButton>
              )
            }
          >
            <SelectField
              label="Etapa"
              isRequired
              placeholder="Selecione a etapa"
              options={STEP_OPTIONS}
              selectedKey={draft.step || null}
              onSelectionChange={(key) => updateDraft(draft.key, { step: (key ?? "") as InssStepDraft["step"] })}
              isInvalid={!!fieldErrors.step}
              errorMessage={fieldErrors.step}
            />
            <DatePickerField
              label="Data no INSS"
              isRequired
              value={draft.occurredOn}
              onChange={(value) => updateDraft(draft.key, { occurredOn: value })}
              isInvalid={!!fieldErrors.occurredOn}
              errorMessage={fieldErrors.occurredOn}
            />
            <Field
              label="Protocolo"
              placeholder="Nº do requerimento no INSS"
              value={draft.protocol}
              maxLength={PROTOCOL_MAX_LENGTH}
              onChange={(event) => updateDraft(draft.key, { protocol: event.target.value })}
              isInvalid={!!fieldErrors.protocol}
              errorMessage={fieldErrors.protocol}
            />
            <TextAreaField
              className="col-span-full"
              label="Observação"
              rows={3}
              placeholder="Ex.: o INSS pediu a CTPS original e o PPP da última empresa."
              value={draft.notes}
              maxLength={NOTES_MAX_LENGTH}
              onChange={(value) => updateDraft(draft.key, { notes: value })}
              isInvalid={!!fieldErrors.notes}
              errorMessage={fieldErrors.notes}
            />
          </FormGroup>
        );
      })}

      <ConfirmDialog
        isOpen={removal !== null}
        onClose={() => setRemoval(null)}
        onConfirm={() => void confirmRemove()}
        tone="danger"
        heading="Excluir este andamento no INSS?"
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description="O evento sai da esteira do INSS do cliente, e não há como desfazer."
      />
    </div>
  );
}
