"use client";

import { useCallback, useEffect, useState } from "react";
import { useSectionForm } from "@/hooks/useSectionForm";
import type { SectionSchema } from "@/components/ui/form/schema";
import type { Clients } from "@/interfaces/Clients.interface";
import type { ClientSituationHistory } from "@/interfaces/client/Client.interface";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { clientById, clientSituationHistory, updateClient } from "@/services/clientService";
import { createAddress, listAddresses, updateAddress } from "@/services/clientAddressService";
import { createInterview, listInterviews, updateInterview } from "@/services/clientInterviewService";
import { listDocuments, listSimulations } from "@/services/clientFileService";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import {
  toAddressValues,
  toInterviewValues,
  toPersonalValues,
  toProfessionalValues,
  toServiceValues,
} from "../form/fromResponse";
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

/**
 * Estado e regras da ficha do cliente: carga, edição, validação e gravação.
 *
 * As seções são as **mesmas** do cadastro (`schemas.ts`) — mesmos campos,
 * máscaras e validadores. Antes a ficha gravava sem validar nada e o PUT, que
 * é substituição total, apagava o que ela não carregava (órgão emissor e
 * emissão do RG, notas, responsável, tipo de endereço).
 *
 * Requisições:
 * - abrir: as seis leituras saem juntas (`allSettled`: um 404 de arquivos não
 *   esconde a ficha);
 * - salvar: cada recurso só é gravado se mudou, e a resposta do PUT vira o
 *   estado novo — sem reler a ficha inteira; o histórico só é relido se a
 *   situação mudou;
 * - arquivos: enviar ou excluir relê só as duas listas de arquivos.
 */

type Snapshot = SheetSections & { address: AddressValues; interview: InterviewValues };

type SheetRecord = {
  clientId: string;
  client: Clients | null;
  kept: KeptFields;
  addressId: string | null;
  interviewId: string | null;
  interviewCount: number;
  history: ClientSituationHistory[];
  historyFailed: boolean;
  documents: ClientFileDocumentResponse[];
  simulations: ClientFileSimulationResponse[];
  snapshot: Snapshot;
  error: string;
};

const messageOf = (reason: unknown, fallback: string) => {
  const e = reason as { message?: string; response?: { data?: { message?: string } } };
  return e?.response?.data?.message || e?.message || fallback;
};

const valueOf = <T,>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === "fulfilled" ? result.value : undefined;

/** Mais recente primeiro: é onde o cliente está hoje. */
const newestFirst = <T,>(items: T[] = [], at: (item: T) => string | undefined) =>
  [...items].sort((a, b) => (at(b) ?? "").localeCompare(at(a) ?? ""));

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function snapshotOf(client: Clients | null, address?: AddressValues, interview?: InterviewValues): Snapshot {
  const source = client ?? {};
  return {
    service: toServiceValues(source),
    personal: toPersonalValues(source),
    professional: toProfessionalValues(source),
    // A ficha edita um endereço: o principal (ou o primeiro). Salvar o mantém principal.
    address: address ?? { ...addressInitial, isPrimary: true },
    interview: interview ?? interviewInitial,
  };
}

/** Rótulos dos campos com erro — para a mensagem do Salvar. */
const invalidLabels = (forms: [{ errors: object }, SectionSchema][]) =>
  forms.flatMap(([form, schema]) => Object.keys(form.errors).map((key) => schema[key]?.label ?? key));

export function useClientSheet(clientId: string | undefined, isOpen: boolean) {
  const service = useSectionForm({ schema: serviceSchema });
  const personal = useSectionForm({ schema: personalSchema });
  const professional = useSectionForm({ initial: professionalInitial, rules: professionalEditRules });
  const address = useSectionForm({ schema: addressSchema });
  const interview = useSectionForm({ schema: interviewSchema });

  const [record, setRecord] = useState<SheetRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const { reset: resetService } = service;
  const { reset: resetPersonal } = personal;
  const { reset: resetProfessional } = professional;
  const { reset: resetAddress } = address;
  const { reset: resetInterview } = interview;
  const apply = useCallback(
    (snapshot: Snapshot) => {
      resetService(snapshot.service);
      resetPersonal(snapshot.personal);
      resetProfessional(snapshot.professional);
      resetAddress(snapshot.address);
      resetInterview(snapshot.interview);
    },
    [resetService, resetPersonal, resetProfessional, resetAddress, resetInterview],
  );

  useEffect(() => {
    if (!isOpen || !clientId) return;
    let active = true;
    void Promise.allSettled([
      clientById(clientId),
      clientSituationHistory(clientId, { pageNumber: 1, pageSize: 50 }),
      listAddresses(clientId),
      listInterviews(clientId),
      listDocuments(clientId),
      listSimulations(clientId),
    ]).then(([client, history, addresses, interviews, documents, simulations]) => {
      if (!active) return;
      const data = valueOf(client) ?? null;
      const addressList = valueOf(addresses)?.data ?? [];
      const primary = addressList.find((item) => item.isPrimary) ?? addressList[0];
      const interviewList = newestFirst(valueOf(interviews)?.data, (item) => item.occurredAt);
      const latest = interviewList[0];
      const snapshot = snapshotOf(
        data,
        primary && { ...toAddressValues(primary), isPrimary: true },
        latest && toInterviewValues(latest),
      );
      apply(snapshot);
      setSaveError("");
      setRecord({
        clientId,
        client: data,
        kept: { notes: data?.notes, responsibleUserId: data?.responsibleUserId },
        addressId: primary?.id ?? null,
        interviewId: latest?.id ?? null,
        interviewCount: interviewList.length,
        history: newestFirst(valueOf(history)?.data, (item) => item.changedAt),
        historyFailed: history.status === "rejected",
        documents: valueOf(documents)?.data ?? [],
        simulations: valueOf(simulations)?.data ?? [],
        snapshot,
        error:
          client.status === "rejected"
            ? messageOf(client.reason, fallbackMessages.CLIENTS.LOAD_FAILED)
            : "",
      });
    });
    return () => {
      active = false;
    };
  }, [clientId, isOpen, apply]);

  /** A ficha carregada é a deste cliente — antes disso, carregando. */
  const loaded = record && record.clientId === clientId ? record : null;
  const isLoading = Boolean(isOpen && clientId && !loaded);

  const cancel = useCallback(() => {
    if (loaded) apply(loaded.snapshot);
    setSaveError("");
  }, [loaded, apply]);

  const refreshFiles = useCallback(async () => {
    if (!clientId) return;
    const [documents, simulations] = await Promise.allSettled([
      listDocuments(clientId),
      listSimulations(clientId),
    ]);
    setRecord((current) =>
      current && {
        ...current,
        documents: valueOf(documents)?.data ?? current.documents,
        simulations: valueOf(simulations)?.data ?? current.simulations,
      },
    );
  }, [clientId]);

  /**
   * Valida tudo (revela os erros de todas as seções de uma vez) e grava o que
   * mudou. `beforeSave` valida o que vive fora das seções (períodos de
   * deficiência); `afterSave` grava depois do cliente — os períodos dependem
   * do sexo que este PUT pode ter acabado de corrigir.
   */
  const save = async (hooks: { validateExtra?: () => boolean; afterSave?: () => Promise<void> } = {}) => {
    if (!clientId || !loaded) return false;
    const addressFilled = hasAddressInput(address.values);
    const checks = [
      service.revealErrors(),
      personal.revealErrors(),
      professional.revealErrors(),
      interview.revealErrors(),
      !addressFilled || address.revealErrors(),
      hooks.validateExtra?.() ?? true,
    ];
    if (!checks.every(Boolean)) {
      const labels = invalidLabels([
        [service, serviceSchema],
        [personal, personalSchema],
        [professional, professionalSchema],
        [interview, interviewSchema],
        [addressFilled ? address : { errors: {} }, addressSchema],
      ]);
      setSaveError(
        labels.length
          ? `Revise os campos destacados: ${labels.join(", ")}.`
          : "Revise os períodos de deficiência antes de salvar.",
      );
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
    try {
      if (
        !same(sections, { service: before.service, personal: before.personal, professional: before.professional })
      ) {
        const envelope = await updateClient(clientId, toUpdateRequest(sections, loaded.kept));
        next.client = envelope?.data ?? next.client;
      }
      if (addressFilled && !same(address.values, before.address)) {
        const body = toAddressRequest({ ...address.values, isPrimary: true });
        const saved = next.addressId
          ? await updateAddress(clientId, next.addressId, body)
          : await createAddress(clientId, body);
        next.addressId = saved?.data?.id ?? next.addressId;
      }
      if (hasInterviewInput(interview.values) && !same(interview.values, before.interview)) {
        const body = toInterviewRequest(interview.values);
        if (next.interviewId) {
          await updateInterview(clientId, next.interviewId, body);
        } else {
          const created = await createInterview(clientId, body);
          next.interviewId = created?.data?.id ?? null;
          next.interviewCount += 1;
        }
      }
      await hooks.afterSave?.();
      if (sections.service.situation !== before.service.situation) {
        const history = await clientSituationHistory(clientId, { pageNumber: 1, pageSize: 50 }).catch(() => null);
        next.history = newestFirst(history?.data ?? next.history, (item) => item.changedAt);
      }
      // A senha digitada já foi; o campo volta a "mantém a gravada".
      next.snapshot = {
        ...sections,
        professional: { ...sections.professional, inssPassword: "" },
        address: address.values,
        interview: interview.values,
      };
      setRecord(next);
      apply(next.snapshot);
      return true;
    } catch (reason) {
      setRecord(next);
      setSaveError(messageOf(reason, fallbackMessages.CLIENTS.UPDATE_FAILED));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    forms: { service, personal, professional, address, interview },
    record: loaded,
    isLoading,
    isSaving,
    error: loaded?.error || saveError,
    setError: setSaveError,
    save,
    cancel,
    refreshFiles,
  };
}
