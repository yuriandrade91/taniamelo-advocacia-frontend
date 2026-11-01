"use client";

import { useCallback, useEffect, useState } from "react";
import { useSectionForm } from "@/hooks/useSectionForm";
import type { SectionSchema } from "@/components/ui/form/schema";
import { clientSituationHistory, updateClient } from "@/services/clientService";
import { createAddress, updateAddress } from "@/services/clientAddressService";
import { createInterview, updateInterview } from "@/services/clientInterviewService";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { messageOf } from "@/lib/errorMessage";
import { notificationCenter } from "@/services/notificationService";
import {
  toAddressValues,
  toInterviewValues,
  toPersonalValues,
  toProfessionalValues,
  toServiceValues,
} from "../form/fromResponse";
import {
  loadClient,
  loadClientFiles,
  newestFirst,
  type ClientFiles,
  type LoadedClient,
} from "../form/loadClient";
import { toAddressRequest, toInterviewRequest } from "../form/payloads";
import {
  addressInitial,
  addressSchema,
  hasAddressInput,
  hasInterviewInput,
  interviewInitial,
  interviewSchema,
  personalSchema,
  professionalEditRules,
  professionalInitial,
  professionalSchema,
  serviceSchema,
  type AddressValues,
  type InterviewValues,
} from "../form/schemas";
import { toUpdateRequest, type KeptFields, type SheetSections } from "./clientSheet";
import { optionalText } from "@/lib/formValues";
import { SituationLabelByKey, type SituationKey } from "@/enums/situation/Situation";
import { findPrimaryIndex, withPrimaryAt } from "../form/primaryAddress";

/**
 * Estado e regras da ficha do cliente: carga, edição, validação e gravação.
 *
 * As seções são as **mesmas** do cadastro (`schemas.ts`) — mesmos campos,
 * máscaras e validadores. Antes a ficha gravava sem validar nada e o PUT, que
 * é substituição total, apagava o que ela não carregava (órgão emissor e
 * emissão do RG, notas, responsável, tipo de endereço).
 *
 * Requisições:
 * - abrir: as leituras saem juntas (`loadClient`);
 * - salvar: cada recurso só é gravado se mudou, e a resposta do PUT vira o
 *   estado novo — sem reler a ficha inteira; o histórico só é relido se a
 *   situação mudou. As gravações saem caladas e o Salvar avisa uma vez:
 *   "Ficha atualizada." ou, sem mudança, "Nada foi alterado.";
 * - arquivos: lidos só quando a seção aparece (`loadFiles`); enviar ou
 *   excluir relê só as duas listas.
 */

type Snapshot = SheetSections & { addresses: AddressValues[]; interview: InterviewValues };

/** Quantos endereços a ficha mostra e edita — o mesmo limite do cadastro. */
const ADDRESS_LIMIT = 3;
const SECONDARY_ADDRESS: AddressValues = { ...addressInitial, isPrimary: false };

type SheetRecord = LoadedClient & {
  clientId: string;
  kept: KeptFields;
  /** `id` do backend por aba de endereço; `null` na aba ainda sem endereço gravado. */
  addressIds: (string | null)[];
  interviewId: string | null;
  interviewCount: number;
  snapshot: Snapshot;
  /** `null` até a seção de arquivos aparecer e as listas chegarem. */
  files: ClientFiles | null;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function snapshotOf(loaded: LoadedClient): Snapshot {
  const source = loaded.client ?? {};
  const [latest] = loaded.interviews;
  const addresses = loaded.addresses.slice(0, ADDRESS_LIMIT).map(toAddressValues);
  return {
    service: toServiceValues(source),
    personal: toPersonalValues(source),
    professional: toProfessionalValues(source),
    // Uma aba por endereço, o principal primeiro (`loadClient`). Sem nenhum
    // marcado, o primeiro vira o principal — o backend não aceita cliente sem.
    addresses: addresses.length
      ? findPrimaryIndex(addresses) === -1 ? withPrimaryAt(addresses, 0) : addresses
      : [{ ...addressInitial, isPrimary: true }],
    interview: latest ? toInterviewValues(latest) : interviewInitial,
  };
}

/** Rótulos dos campos com erro — para a mensagem do Salvar. */
const invalidLabels = (forms: [{ errors: object }, SectionSchema][]) =>
  forms.flatMap(([form, schema]) => Object.keys(form.errors).map((key) => schema[key]?.label ?? key));

/**
 * Grava os endereços que mudaram; diz se gravou algum.
 *
 * O principal vai primeiro: o backend desmarca o anterior quando outro chega
 * marcado, então, trocado o principal, o antigo já está desmarcado quando a
 * vez dele chega.
 */
async function saveAddresses(
  clientId: string,
  next: SheetRecord,
  values: readonly AddressValues[],
  before: readonly AddressValues[],
): Promise<boolean> {
  const order = values.map((_, index) => index).sort((a, b) => Number(values[b].isPrimary) - Number(values[a].isPrimary));
  const ids = [...next.addressIds];
  let wrote = false;
  for (const index of order) {
    if (!hasAddressInput(values[index]) || same(values[index], before[index])) continue;
    const body = toAddressRequest(values[index]);
    const id = ids[index];
    const saved = id
      ? await updateAddress(clientId, id, body, { silent: true })
      : await createAddress(clientId, body, { silent: true });
    ids[index] = saved?.data?.id ?? id;
    next.addressIds = [...ids];
    wrote = true;
  }
  return wrote;
}

/** Grava a entrevista, se tem conteúdo e mudou; diz se gravou. */
async function saveInterview(
  clientId: string,
  next: SheetRecord,
  values: InterviewValues,
  before: InterviewValues,
): Promise<boolean> {
  if (!hasInterviewInput(values) || same(values, before)) return false;
  const body = toInterviewRequest(values);
  if (next.interviewId) {
    await updateInterview(clientId, next.interviewId, body, { silent: true });
  } else {
    const created = await createInterview(clientId, body, { silent: true });
    next.interviewId = created?.data?.id ?? null;
    next.interviewCount += 1;
  }
  return true;
}

/** O aviso de "Salvar" reprovado: as seções com erro, quando dá para nomeá-las. */
const reviseMessage = (labels: readonly string[]) =>
  labels.length
    ? `Revise os campos destacados: ${labels.join(", ")}.`
    : "Revise os campos destacados antes de salvar.";

export function useClientSheet(clientId: string | undefined, isOpen: boolean) {
  const service = useSectionForm({ schema: serviceSchema });
  const personal = useSectionForm({ schema: personalSchema });
  const professional = useSectionForm({ initial: professionalInitial, rules: professionalEditRules });
  // Três formulários fixos, como no cadastro: hook não nasce em loop.
  const address1 = useSectionForm({ schema: addressSchema });
  const address2 = useSectionForm({ schema: addressSchema, initial: SECONDARY_ADDRESS });
  const address3 = useSectionForm({ schema: addressSchema, initial: SECONDARY_ADDRESS });
  const interview = useSectionForm({ schema: interviewSchema });

  /** Abas de endereço abertas na edição, além das gravadas — somem ao cancelar e ao salvar. */
  const [addedAddresses, setAddedAddresses] = useState(0);
  const [record, setRecord] = useState<SheetRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { reset: resetService } = service;
  const { reset: resetPersonal } = personal;
  const { reset: resetProfessional } = professional;
  const { reset: resetAddress1 } = address1;
  const { reset: resetAddress2 } = address2;
  const { reset: resetAddress3 } = address3;
  const { reset: resetInterview } = interview;
  const apply = useCallback(
    (snapshot: Snapshot) => {
      resetService(snapshot.service);
      resetPersonal(snapshot.personal);
      resetProfessional(snapshot.professional);
      resetAddress1(snapshot.addresses[0]);
      resetAddress2(snapshot.addresses[1] ?? SECONDARY_ADDRESS);
      resetAddress3(snapshot.addresses[2] ?? SECONDARY_ADDRESS);
      resetInterview(snapshot.interview);
      setAddedAddresses(0);
    },
    [resetService, resetPersonal, resetProfessional, resetAddress1, resetAddress2, resetAddress3, resetInterview],
  );

  useEffect(() => {
    if (!isOpen || !clientId) return;
    let active = true;
    void loadClient(clientId).then((loaded) => {
      if (!active) return;
      const snapshot = snapshotOf(loaded);
      apply(snapshot);
      setSaveError("");
      setRecord({
        ...loaded,
        clientId,
        kept: {
          notes: loaded.client?.notes,
          responsibleUserId: loaded.client?.responsibleUserId,
          requestStage: loaded.client?.requestStage,
        },
        addressIds: loaded.addresses.slice(0, ADDRESS_LIMIT).map((item) => item.id),
        interviewId: loaded.interviews[0]?.id ?? null,
        interviewCount: loaded.interviews.length,
        snapshot,
        files: null,
      });
    });
    return () => {
      active = false;
    };
  }, [clientId, isOpen, apply]);

  /** A ficha carregada é a deste cliente — antes disso, carregando. */
  const loaded = record && record.clientId === clientId ? record : null;
  const isLoading = Boolean(isOpen && clientId && !loaded);
  /** As abas de endereço: uma por endereço gravado (ao menos uma), mais as que a edição abriu. */
  const addressTabs = Math.min(ADDRESS_LIMIT, (loaded?.snapshot.addresses.length ?? 1) + addedAddresses);
  const addresses = [address1, address2, address3].slice(0, addressTabs);
  const canAddAddress = addressTabs < ADDRESS_LIMIT;

  /** Abre uma aba em branco para outro endereço (até o limite). */
  const addAddress = () => {
    if (canAddAddress) setAddedAddresses((count) => count + 1);
  };

  /** "Tornar principal" numa aba: exatamente um principal entre elas. */
  const setPrimaryAddress = (index: number) => {
    const next = withPrimaryAt(
      addresses.map((form) => form.values),
      index,
    );
    for (const [i, form] of addresses.entries()) form.setField("isPrimary", next[i].isPrimary);
  };

  /** Desfaz o que foi digitado: volta ao que está gravado. */
  const cancel = useCallback(() => {
    if (loaded) apply(loaded.snapshot);
    setSaveError("");
  }, [loaded, apply]);

  /** Lê as listas de arquivos — ao aparecer a seção, e de novo depois de enviar ou excluir. */
  const loadFiles = useCallback(async () => {
    if (!clientId) return;
    const files = await loadClientFiles(clientId);
    setRecord((current) =>
      current && {
        ...current,
        files: {
          documents: files.documents ?? current.files?.documents ?? [],
          simulations: files.simulations ?? current.files?.simulations ?? [],
        },
      },
    );
  }, [clientId]);

  /**
   * Valida tudo (revela os erros de todas as seções de uma vez) e grava o que
   * mudou. `validateExtra` valida o que vive fora das seções (períodos de
   * deficiência, andamento no INSS); `afterSave` grava depois do cliente — os períodos dependem
   * do sexo que este PUT pode ter acabado de corrigir — calado, como o resto,
   * e diz se gravou alguma coisa.
   */
  const save = async (hooks: { validateExtra?: () => boolean; afterSave?: () => Promise<boolean> } = {}) => {
    if (!clientId || !loaded) return false;
    const filledAddresses = addresses.filter((form) => hasAddressInput(form.values));
    const checks = [
      service.revealErrors(),
      personal.revealErrors(),
      professional.revealErrors(),
      interview.revealErrors(),
      ...filledAddresses.map((form) => form.revealErrors()),
      hooks.validateExtra?.() ?? true,
    ];
    if (!checks.every(Boolean)) {
      const labels = invalidLabels([
        [service, serviceSchema],
        [personal, personalSchema],
        [professional, professionalSchema],
        [interview, interviewSchema],
        ...filledAddresses.map((form): [{ errors: object }, SectionSchema] => [form, addressSchema]),
      ]);
      setSaveError(reviseMessage(labels));
      return false;
    }

    setIsSaving(true);
    setSaveError("");
    const sections: SheetSections = {
      service: service.values,
      personal: personal.values,
      professional: professional.values,
    };
    const before = loaded.snapshot;
    const next: SheetRecord = { ...loaded };
    // Os arquivos ficam com o que está no estado, não com o retrato de antes:
    // o `afterSave` os envia e `loadFiles` os relê no meio do caminho —
    // gravar `next` inteiro desfazia essa releitura, e o que acabara de subir
    // sumia da ficha até reabri-la.
    const commit = () => setRecord((current) => ({ ...next, files: current?.files ?? next.files }));
    let wrote = false;
    try {
      if (
        !same(sections, { service: before.service, personal: before.personal, professional: before.professional })
      ) {
        const envelope = await updateClient(clientId, toUpdateRequest(sections, loaded.kept), { silent: true });
        next.client = envelope?.data ?? next.client;
        wrote = true;
      }
      const addressValues = addresses.map((form) => form.values);
      if (await saveAddresses(clientId, next, addressValues, before.addresses)) wrote = true;
      if (await saveInterview(clientId, next, interview.values, before.interview)) wrote = true;
      if (await hooks.afterSave?.()) wrote = true;
      if (sections.service.situation !== before.service.situation) {
        const history = await clientSituationHistory(clientId, { pageNumber: 1, pageSize: 50 }).catch(() => null);
        next.history = newestFirst(history?.data ?? next.history, (item) => item.changedAt);
      }
      // A senha digitada já foi; o campo volta a "mantém a gravada".
      next.snapshot = {
        ...sections,
        professional: { ...sections.professional, inssPassword: "" },
        // Uma aba aberta e deixada em branco não é endereço: não fica na ficha.
        addresses: addressValues.slice(0, Math.max(1, addressValues.findLastIndex(hasAddressInput) + 1)),
        interview: interview.values,
      };
      commit();
      apply(next.snapshot);
      if (wrote) notificationCenter.success("Ficha atualizada.");
      else notificationCenter.info("Nada foi alterado.");
      return true;
    } catch (reason) {
      commit();
      setSaveError(messageOf(reason, fallbackMessages.CLIENTS.UPDATE_FAILED));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * A etapa no INSS mudou fora do "Salvar" (o painel do INSS grava na hora).
   * A ficha guarda a nova também no que reenvia: o PUT é substituição total,
   * e com a etapa antiga ele desfaria a mudança — e gravaria uma volta no
   * histórico que ninguém fez.
   */
  const setRequestStage = useCallback((requestStage: KeptFields["requestStage"]) => {
    setRecord(
      (current) =>
        current && {
          ...current,
          kept: { ...current.kept, requestStage },
          client: current.client && { ...current.client, requestStage },
        },
    );
  }, []);

  /**
   * A situação do benefício mudou fora do "Salvar" (o cartão de etapa grava
   * na hora). Como `setRequestStage`: a ficha guarda a nova no que reenvia —
   * no retrato e no campo —, senão o próximo PUT desfaria a mudança. E relê o
   * histórico, que ganhou uma linha.
   */
  const { setField: setServiceField } = service;
  const setSituation = useCallback(
    async (situation: SituationKey) => {
      setServiceField("situation", situation);
      setRecord(
        (current) =>
          current && {
            ...current,
            client: current.client && { ...current.client, situation: SituationLabelByKey[situation] },
            snapshot: { ...current.snapshot, service: { ...current.snapshot.service, situation } },
          },
      );
      if (!clientId) return;
      const history = await clientSituationHistory(clientId, { pageNumber: 1, pageSize: 50 }).catch(() => null);
      if (!history) return;
      setRecord(
        (current) =>
          current && { ...current, history: newestFirst(history.data, (item) => item.changedAt), historyFailed: false },
      );
    },
    [clientId, setServiceField],
  );

  return {
    forms: { service, personal, professional, addresses, interview },
    record: loaded,
    isLoading,
    isSaving,
    error: optionalText(loaded?.error) ?? saveError,
    setError: setSaveError,
    save,
    cancel,
    loadFiles,
    setRequestStage,
    setSituation,
    setPrimaryAddress,
    addAddress,
    canAddAddress,
  };
}
