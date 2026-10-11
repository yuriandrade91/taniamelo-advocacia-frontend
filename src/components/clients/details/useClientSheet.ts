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
 * - arquivos: enviar ou excluir relê só as duas listas de arquivos.
 */

type Snapshot = SheetSections & { address: AddressValues; interview: InterviewValues };

type SheetRecord = LoadedClient & {
  clientId: string;
  kept: KeptFields;
  addressId: string | null;
  interviewId: string | null;
  interviewCount: number;
  snapshot: Snapshot;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function snapshotOf(loaded: LoadedClient): Snapshot {
  const source = loaded.client ?? {};
  const [primary] = loaded.addresses;
  const [latest] = loaded.interviews;
  return {
    service: toServiceValues(source),
    personal: toPersonalValues(source),
    professional: toProfessionalValues(source),
    // A ficha edita um endereço: o principal (ou o primeiro). Salvar o mantém principal.
    address: primary ? { ...toAddressValues(primary), isPrimary: true } : { ...addressInitial, isPrimary: true },
    interview: latest ? toInterviewValues(latest) : interviewInitial,
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
        addressId: loaded.addresses[0]?.id ?? null,
        interviewId: loaded.interviews[0]?.id ?? null,
        interviewCount: loaded.interviews.length,
        snapshot,
      });
    });
    return () => {
      active = false;
    };
  }, [clientId, isOpen, apply]);

  /** A ficha carregada é a deste cliente — antes disso, carregando. */
  const loaded = record && record.clientId === clientId ? record : null;
  const isLoading = Boolean(isOpen && clientId && !loaded);

  /** Desfaz o que foi digitado: volta ao que está gravado. */
  const cancel = useCallback(() => {
    if (loaded) apply(loaded.snapshot);
    setSaveError("");
  }, [loaded, apply]);

  const refreshFiles = useCallback(async () => {
    if (!clientId) return;
    const files = await loadClientFiles(clientId);
    setRecord((current) =>
      current && {
        ...current,
        documents: files.documents ?? current.documents,
        simulations: files.simulations ?? current.simulations,
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
          : "Revise os campos destacados antes de salvar.",
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
    let wrote = false;
    try {
      if (
        !same(sections, { service: before.service, personal: before.personal, professional: before.professional })
      ) {
        const envelope = await updateClient(clientId, toUpdateRequest(sections, loaded.kept), { silent: true });
        next.client = envelope?.data ?? next.client;
        wrote = true;
      }
      if (addressFilled && !same(address.values, before.address)) {
        const body = toAddressRequest({ ...address.values, isPrimary: true });
        const saved = next.addressId
          ? await updateAddress(clientId, next.addressId, body, { silent: true })
          : await createAddress(clientId, body, { silent: true });
        next.addressId = saved?.data?.id ?? next.addressId;
        wrote = true;
      }
      if (hasInterviewInput(interview.values) && !same(interview.values, before.interview)) {
        const body = toInterviewRequest(interview.values);
        if (next.interviewId) {
          await updateInterview(clientId, next.interviewId, body, { silent: true });
        } else {
          const created = await createInterview(clientId, body, { silent: true });
          next.interviewId = created?.data?.id ?? null;
          next.interviewCount += 1;
        }
        wrote = true;
      }
      if (await hooks.afterSave?.()) wrote = true;
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
      if (wrote) notificationCenter.success("Ficha atualizada.");
      else notificationCenter.info("Nada foi alterado.");
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
