"use client";

import { Accordion, Button, Modal, Skeleton, Tooltip } from "@heroui/react";
import {
  DateTimePickerField,
  Field,
  TextAreaField,
} from "@/components/ui/form/Field";
import Image from "next/image";

interface DetailsClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId?: number | string;
  onConfirm?: () => void;
  editOnOpen?: boolean;
}

import React, { useState, useEffect } from "react";
import { SelectField } from "@/components/ui/form/Field";
import DeleteClientModal from "../DeleteClientModal/DeleteClientModal";
import {
  clientById,
  updateClient,
  deleteClient,
  clientSituationHistory,
} from "@/services/clientService";
import type {
  ClientUpdateRequest,
  ClientSituationHistory,
} from "@/interfaces/client/Client.interface";
import { Clients } from "@/interfaces/Clients.interface";
import {
  createAddress,
  listAddresses,
  updateAddress,
} from "@/services/clientAddressService";
import {
  createInterview,
  listInterviews,
  updateInterview,
} from "@/services/clientInterviewService";
import {
  deleteFile,
  listDocuments,
  listSimulations,
  uploadDocuments,
  uploadSimulations,
} from "@/services/clientFileService";
import { InssPasswordField } from "@/components/clients/inss/InssPasswordField";
import { usePermissoes } from "@/hooks/usePermissoes";
import { useAutoresDoEscritorio } from "@/hooks/useAutoresDoEscritorio";
import { FilesSection } from "@/components/clients/form/sections/files/FilesSection";
import FileUploadModal from "@/components/clients/form/sections/files/FileUploadModal";
import {
  isDocumentReady,
  type FileKind,
  type StagedDocument,
  type StagedSimulation,
} from "@/components/clients/form/sections/files/types";
import {
  buildDocumentsFormData,
  buildSimulationsFormData,
} from "@/components/clients/form/documentsFormData";
import { instantToLocalInput } from "@/components/clients/form/fromResponse";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import svgPaths from "@/constants/svg/paths";
import { ProgressRing } from "@/components/clients/form/ProgressRing";
import { FormSection } from "@/components/clients/form/FormSection";
import { formatDateBR } from "@/lib/format";
import { ageFromBirthDate } from "@/lib/validators/validators";
import { SituationHistorySection } from "@/components/clients/form/sections/SituationHistorySection";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import {
  MaritalStatusOptions,
  getMaritalStatusKeyByLabel,
  getMaritalStatusLabelByKey,
  type MaritalStatusKey,
} from "@/enums/maritalStatus/MaritalStatus";
import {
  SituationOptions,
  getSituationKeyByLabel,
  getSituationLabelByKey,
  type SituationKey,
} from "@/enums/situation/Situation";
import {
  IntendedBenefitOptions,
  getBenefitKeyByLabel,
  getBenefitLabelByKey,
  type BenefitKey,
} from "@/enums/benefit/Benefits";

type FormShape = {
  nome: string;
  nascimento: string;
  estadoCivil: string;
  genero: string;
  age?: number | null;
  cpf: string;
  rg: string;
  nomeMae: string;
  email: string;
  celular: string;
  telRecado: string;
  responsavelRecado: string;
  /**
   * Chaves do enum (ex.: `"ANALISE_DOCUMENTAL"`), não índices.
   * Antes eram a posição no array — reordenar as `ENTRIES` mudava o dado.
   */
  situacaoBeneficio: string;
  beneficioPretendido: string;
  numBeneficiario: string;
  nitPis: string;
  profissao: string;
  ctps: string;
  serie: string;
  senhaInss: string;
  tempoAnos: string;
  tempoMeses: string;
  tempoDias: string;
  isento: boolean;
};

/** Só dígitos - anos, meses e dias de contribuição são contagem, não texto. */
const soDigitos = (value: string) => value.replace(/\D/g, "");

/**
 * Lê um número do payload aceitando as duas grafias, como o resto desta ficha
 * faz: a API responde em camelCase, mas há respostas antigas em snake_case
 * circulando. `0` é valor e tem de sobreviver - por isso a checagem é contra
 * `null`/`undefined`, e não um teste de veracidade.
 */
const numeroDoPayload = (payload: any, camel: string): string => {
  const snake = camel.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
  const bruto = payload?.[camel] ?? payload?.[snake];
  return bruto === null || bruto === undefined ? "" : String(bruto);
};

export default function DetailsClientModal({
  isOpen,
  onClose,
  clientName,
  clientId,
  onConfirm,
  editOnOpen = false,
}: DetailsClientModalProps) {
  // render props
  // Excluir é de advogado/admin; o atendente não vê o botão (o backend recusa
  // de qualquer forma — isto é só para não oferecer o que vai ser negado).
  const { podeDestruir } = usePermissoes();
  /** Traduz o `changedByUserId` da trilha em nome. Vazio para atendente. */
  const autores = useAutoresDoEscritorio();
  // Local state for edit and delete modal logic
  const [isEditing, setIsEditing] = useState(false);
  // Keep a snapshot of the last loaded form so Cancel restores it
  const [originalForm, setOriginalForm] = useState<Partial<FormShape> | null>(
    null,
  );
  // Habilita edição automaticamente se editOnOpen for true
  useEffect(() => {
    if (isOpen && editOnOpen) {
      setIsEditing(true);
    }
  }, [isOpen, editOnOpen]);

  const handleDelete = async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    try {
      await deleteClient(String(clientId));
      setShowDeleteModal(false);
      onClose();
      if (typeof onConfirm === "function") onConfirm();
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      setError(
        e?.message ||
          (e?.response?.data?.message ?? fallbackMessages.CLIENTS.DELETE_FAILED),
      );
    } finally {
      setLoading(false);
    }
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [situationHistory, setSituationHistory] = useState<
    ClientSituationHistory[]
  >([]);
  /** Distingue "a rota falhou" de "nunca mudou de situação". */
  const [historyFailed, setHistoryFailed] = useState(false);

  /**
   * Endereço principal do cliente.
   *
   * O modal mostra **um** endereço: o principal, ou o primeiro quando nenhum
   * está marcado. O cliente pode ter até três (a tela de cadastro cria os
   * outros), e trazer as três abas para cá exigiria a mesma coordenação de
   * "quem é o principal" que vive lá. Aqui a pergunta é "para onde mando a
   * correspondência", e a resposta é uma só.
   *
   * `addressId` nulo significa cliente sem endereço: salvar cria em vez de
   * atualizar.
   */
  const [addressId, setAddressId] = useState<string | null>(null);

  /**
   * Entrevista mais recente.
   *
   * O backend guarda uma lista; a ficha mostra a última. Ver o histórico
   * completo de entrevistas é outra tela — e mostrar a mais antiga aqui seria
   * a escolha pior das duas. A contagem aparece no selo da seção para ninguém
   * achar que só existe esta.
   */
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interviewCount, setInterviewCount] = useState(0);
  const [interview, setInterview] = useState({
    occurredAt: "",
    durationMinutes: "",
    content: "",
  });

  const [documents, setDocuments] = useState<ClientFileDocumentResponse[]>([]);
  const [simulations, setSimulations] = useState<ClientFileSimulationResponse[]>(
    [],
  );
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [stagedSimulations, setStagedSimulations] = useState<StagedSimulation[]>(
    [],
  );
  const [uploadKind, setUploadKind] = useState<FileKind | null>(null);
  const [address, setAddress] = useState({
    zipCode: "",
    street: "",
    addressNumber: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  // Controlled state for all input fields - start empty and populate when fetching
  const defaultForm: FormShape = {
    nome: "",
    nascimento: "",
    estadoCivil: "",
    genero: "",
    age: null,
    cpf: "",
    rg: "",
    nomeMae: "",
    email: "",
    celular: "",
    telRecado: "",
    responsavelRecado: "",
    situacaoBeneficio: "",
    beneficioPretendido: "",
    numBeneficiario: "",
    nitPis: "",
    profissao: "",
    ctps: "",
    serie: "",
    senhaInss: "",
    tempoAnos: "",
    tempoMeses: "",
    tempoDias: "",
    isento: false,
  };
  const [form, setForm] = useState<FormShape>(defaultForm);

  // Calcula o progresso com base nos campos preenchidos
  const totalFields = Object.keys(form).length;
  const filledFields = Object.values(form).filter((v) =>
    typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null,
  ).length;
  const progress = Math.round((filledFields / totalFields) * 100);

  /**
   * Idade a partir da data de nascimento.
   *
   * Delega para `ageFromBirthDate`, que trata a data como `LocalDate` — texto,
   * sem fuso. A versão anterior fazia `new Date("1954-08-28")`, que é meia-noite
   * **UTC**: em UTC-3 vira 27/08 às 21h, e tanto a data exibida quanto a idade
   * saíam um dia atrás. Era o que o cabeçalho mostrava: 27/08 ao lado de um
   * campo com 28/08.
   */
  const computeAgeFromDate = (dateStr?: string | null): number | null =>
    dateStr ? ageFromBirthDate(String(dateStr)) : null;

  // Chave -> label PT-BR (o que a API espera receber e devolve).
  const displayBenefit = getBenefitLabelByKey(
    form.beneficioPretendido as BenefitKey,
  );
  const displaySituation = getSituationLabelByKey(
    form.situacaoBeneficio as SituationKey,
  );

  const fetchClient = async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");

    try {
      // GET /api/v1/clients/{id} — o service já desembrulha o envelope.
      const payload = (await clientById(String(clientId))) as Clients | null;

      const getNumberField = (
        obj: Partial<Clients> | null | undefined,
        key: string,
      ): number | undefined => {
        if (!obj) return undefined;
        const v = (obj as Record<string, unknown>)[key];
        if (typeof v === "number") return v;
        if (
          typeof v === "string" &&
          v.trim() !== "" &&
          !Number.isNaN(Number(v))
        )
          return Number(v);
        return undefined;
      };

      const maritalKey =
        getMaritalStatusKeyByLabel(payload?.maritalStatus) ??
        MaritalStatusOptions.find((o) => o.value === payload?.maritalStatus)
          ?.value ??
        defaultForm.estadoCivil;
      /**
       * A API devolve o **label** dos enums (`@JsonValue`). Resolvemos para a
       * chave; se já vier a chave (contrato aceita as duas formas), aceitamos
       * direto. Sem `??` em cascata por nomes alternativos: o contrato está
       * fechado em `Clients.interface.ts`.
       */
      const situationKey =
        getSituationKeyByLabel(payload?.situation) ??
        SituationOptions.find((o) => o.value === payload?.situation)?.value ??
        defaultForm.situacaoBeneficio;

      const benefitKey =
        getBenefitKeyByLabel(payload?.benefit) ??
        IntendedBenefitOptions.find((o) => o.value === payload?.benefit)
          ?.value ??
        defaultForm.beneficioPretendido;

      const mapped: FormShape = {
        nome:
          ((payload?.fullName as string) ??
            (payload as any).full_name ??
            `${(payload?.firstName as string) ?? ""} ${(payload?.lastName as string) ?? ""}`.trim()) ||
          defaultForm.nome,
        nascimento:
          (payload?.birthDate as string) ??
          (payload as any).birth_date ??
          defaultForm.nascimento,
        estadoCivil: maritalKey,
        cpf: (payload?.cpf as string) ?? defaultForm.cpf,
        rg: (payload?.rg as string) ?? defaultForm.rg,
        nomeMae:
          (payload?.motherName as string) ??
          (payload as any).mother_name ??
          defaultForm.nomeMae,
        email: (payload?.email as string) ?? defaultForm.email,
        celular:
          (payload?.mobilePhone as string) ??
          (payload as any).mobile_phone ??
          defaultForm.celular,
        telRecado:
          (payload?.referencePhone as string) ??
          (payload as any).reference_phone ??
          defaultForm.telRecado,
        responsavelRecado:
          (payload?.referenceResponsible as string) ??
          (payload as any).reference_responsible ??
          defaultForm.responsavelRecado,
        genero: (payload?.gender as string) ?? (payload as any).gender ?? "",
        age:
          typeof payload?.age === "number"
            ? (payload.age as number)
            : typeof (payload as any)?.idade === "number"
              ? (payload as any).idade
              : computeAgeFromDate(
                  (payload?.birthDate as string) ??
                    (payload as any).birth_date ??
                    null,
                ),
        situacaoBeneficio: situationKey,
        beneficioPretendido: benefitKey,
        numBeneficiario:
          (payload?.beneficiaryNumber as string) ??
          (payload as any).beneficiaryNumber ??
          (payload as any).beneficiary_number ??
          defaultForm.numBeneficiario,
        nitPis:
          (payload?.nitPis as string) ??
          (payload as any).nit_pis ??
          defaultForm.nitPis,
        profissao: (payload?.profession as string) ?? defaultForm.profissao,
        ctps:
          (payload?.ctps as string) ??
          (payload as any).ctps ??
          defaultForm.ctps,
        serie:
          (payload?.ctpsSeries as string) ??
          (payload as any).ctps_series ??
          defaultForm.serie,
        // A senha do INSS não vem mais na ficha (saiu do GET). O campo nasce
        // vazio e vazio significa "mantém a que está gravada" — ver
        // InssPasswordField. Para LER a senha existe a rota auditada.
        senhaInss: defaultForm.senhaInss,
        // Tempo de contribuição deixou de ser uma frase e virou três números.
        // `contributionTime` ainda vem na resposta, mas é só a forma de
        // exibição derivada - o que se edita e se envia são estes três.
        tempoAnos: numeroDoPayload(payload, "contributionYears"),
        tempoMeses: numeroDoPayload(payload, "contributionMonths"),
        tempoDias: numeroDoPayload(payload, "contributionDays"),
        // O backend expõe `notBillable`; os nomes antigos ficam como fallback.
        isento:
          typeof payload?.notBillable === "boolean"
            ? payload.notBillable
            : typeof (payload as any)?.nonBillable === "boolean"
              ? (payload as any).nonBillable
              : typeof (payload as any)?.non_billable === "boolean"
                ? (payload as any).non_billable
                : defaultForm.isento,
      };

      setForm(mapped);
      setOriginalForm(mapped);
      // fetch situation history (single request)
      try {
        // GET /api/v1/clients/{id}/situation-history (paginado, 1-based)
        const histEnvelope = await clientSituationHistory(String(clientId), {
          pageNumber: 1,
          pageSize: 50,
        });
        const items = Array.isArray(histEnvelope?.data) ? histEnvelope.data : [];
        /**
         * Mais recente primeiro. O backend não garante ordem, e uma linha do
         * tempo que comece pelo evento mais antigo obriga a rolar até o fim
         * para ver onde o cliente está hoje — que é o que mais se procura.
         */
        setSituationHistory(
          [...items].sort((a, b) =>
            (b.changedAt ?? "").localeCompare(a.changedAt ?? ""),
          ),
        );
        setHistoryFailed(false);
      } catch (errHistory) {
        console.debug("Could not load situation history:", errHistory);
        setSituationHistory([]);
        setHistoryFailed(true);
      }

      // Endereço em try próprio: cliente sem endereço é caso normal, e um 404
      // aqui não pode derrubar a ficha inteira.
      try {
        const envelope = await listAddresses(String(clientId));
        const list = envelope?.data ?? [];
        const primary = list.find((item) => item.isPrimary) ?? list[0];
        setAddressId(primary?.id ?? null);
        setAddress({
          zipCode: primary?.zipCode ?? "",
          street: primary?.street ?? "",
          addressNumber: primary?.addressNumber ?? "",
          complement: primary?.complement ?? "",
          neighborhood: primary?.neighborhood ?? "",
          city: primary?.city ?? "",
          state: primary?.state ?? "",
        });
      } catch (errAddress) {
        console.debug("Could not load addresses:", errAddress);
        setAddressId(null);
      }

      /**
       * Entrevistas e arquivos em `allSettled`: são recursos independentes, e
       * um 404 de arquivos não pode esconder a entrevista que existe.
       */
      const [interviewResult, documentResult, simulationResult] =
        await Promise.allSettled([
          listInterviews(String(clientId)),
          listDocuments(String(clientId)),
          listSimulations(String(clientId)),
        ]);

      const interviews =
        interviewResult.status === "fulfilled"
          ? (interviewResult.value.data ?? [])
          : [];
      setInterviewCount(interviews.length);
      const latest = [...interviews].sort((a, b) =>
        (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""),
      )[0];
      setInterviewId(latest?.id ?? null);
      setInterview({
        occurredAt: instantToLocalInput(latest?.occurredAt),
        durationMinutes:
          latest?.durationMinutes === undefined ||
          latest?.durationMinutes === null
            ? ""
            : String(latest.durationMinutes),
        content: latest?.content ?? "",
      });

      setDocuments(
        documentResult.status === "fulfilled"
          ? (documentResult.value.data ?? [])
          : [],
      );
      setSimulations(
        simulationResult.status === "fulfilled"
          ? (simulationResult.value.data ?? [])
          : [],
      );
    } catch (err: unknown) {
      console.error("DetailsClientModal GET error:", err);
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      setError(
        e?.message ||
          (e?.response?.data?.message ?? fallbackMessages.CLIENTS.LOAD_FAILED),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");

    // PUT /api/v1/clients/{id} — ClientUpdateRequestDTO.
    // O backend usa camelCase; os enums aceitam label ou nome da constante.
    const raw: Record<string, unknown> = {
      fullName: form.nome,
      birthDate: form.nascimento,
      cpf: form.cpf,
      motherName: form.nomeMae,
      mobilePhone: form.celular,
      // Só vai quando o usuário digitou uma senha nova. Mandar o campo vazio
      // funcionaria (o backend ignora em branco), mas mandar só o que mudou
      // deixa claro na requisição que ninguém pediu para trocar a senha.
      ...(form.senhaInss.trim() ? { inssPassword: form.senhaInss } : {}),
      gender: form.genero || undefined,
      benefit: displayBenefit || undefined,
      situation: displaySituation || undefined,
      maritalStatus:
        getMaritalStatusLabelByKey(form.estadoCivil as MaritalStatusKey) ||
        undefined,
      rg: form.rg || undefined,
      email: form.email || undefined,
      referencePhone: form.telRecado || undefined,
      referenceResponsible: form.responsavelRecado || undefined,
      beneficiaryNumber: form.numBeneficiario || undefined,
      nitPis: form.nitPis || undefined,
      profession: form.profissao || undefined,
      ctps: form.ctps || undefined,
      ctpsSeries: form.serie || undefined,
      // Em branco tem de sumir do JSON, e não virar 0: os três nulos
      // significam "não informado", zero significa "não contribuiu".
      contributionYears: form.tempoAnos ? Number(form.tempoAnos) : undefined,
      contributionMonths: form.tempoMeses ? Number(form.tempoMeses) : undefined,
      contributionDays: form.tempoDias ? Number(form.tempoDias) : undefined,
      notBillable: form.isento,
    };

    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined),
    );

    try {
      await updateClient(
        String(clientId),
        payload as unknown as ClientUpdateRequest,
      );

      /**
       * Endereço vai depois, e só quando há o que gravar.
       *
       * Depois porque o cliente é o registro principal: se o endereço falhar,
       * o que a pessoa editou nos dados já está salvo. Antes seria o inverso —
       * endereço gravado e nome perdido.
       *
       * `street` e `city` são `@NotBlank` no backend; mandar um endereço vazio
       * colheria um 400 em quem só quis corrigir o telefone.
       */
      const hasAddress =
        address.street.trim() !== "" && address.city.trim() !== "";
      if (hasAddress) {
        const body = {
          street: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zipCode: address.zipCode.trim() || undefined,
          addressNumber: address.addressNumber.trim() || undefined,
          complement: address.complement.trim() || undefined,
          neighborhood: address.neighborhood.trim() || undefined,
          isPrimary: true,
        };
        if (addressId) {
          await updateAddress(String(clientId), addressId, body);
        } else {
          const created = await createAddress(String(clientId), body);
          setAddressId(created?.data?.id ?? null);
        }
      }

      /**
       * Entrevista: só grava quando há conteúdo. `content` é `@NotBlank` no
       * backend, então salvar uma ficha sem entrevista preenchida colheria um
       * 400 em quem só quis corrigir o telefone — o mesmo motivo do endereço.
       */
      if (interview.content.trim() !== "") {
        const body = {
          content: interview.content.trim(),
          occurredAt: interview.occurredAt
            ? new Date(interview.occurredAt).toISOString()
            : undefined,
          durationMinutes: interview.durationMinutes
            ? Number(interview.durationMinutes)
            : undefined,
        };
        if (interviewId) {
          await updateInterview(String(clientId), interviewId, body);
        } else {
          await createInterview(String(clientId), body);
        }
      }

      // reload the client to present updated values
      await fetchClient();
      setIsEditing(false);
      if (typeof onConfirm === "function") onConfirm();
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      const message =
        e?.response?.data?.message ||
        e?.message ||
        fallbackMessages.CLIENTS.UPDATE_FAILED;
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  /**
   * Arquivos sobem na hora, sem esperar o Salvar do cabeçalho.
   *
   * No cadastro eles ficam em espera porque ainda não existe `clientId` para a
   * URL. Aqui existe — segurar o arquivo até outro botão só criaria a chance
   * de a pessoa fechar a ficha achando que já enviou.
   */
  const handleUploadStaged = async () => {
    if (!clientId) return;
    if (stagedDocuments.length > 0 && !stagedDocuments.every(isDocumentReady)) {
      setError("Escolha o tipo de cada documento antes de enviar.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (stagedDocuments.length > 0) {
        await uploadDocuments(
          String(clientId),
          buildDocumentsFormData(
            stagedDocuments.map((item) => ({
              file: item.file,
              documentType: item.documentType,
              notes: item.notes,
            })),
          ),
        );
        setStagedDocuments([]);
      }
      if (stagedSimulations.length > 0) {
        await uploadSimulations(
          String(clientId),
          buildSimulationsFormData(
            stagedSimulations.map((item) => ({
              file: item.file,
              simulationDate: item.simulationDate,
              version: item.version,
              vinculos: item.vinculos ? Number(item.vinculos) : undefined,
              notes: item.notes,
            })),
          ),
        );
        setStagedSimulations([]);
      }
      await fetchClient();
    } catch {
      setError(fallbackMessages.CLIENTS.UPDATE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (_kind: FileKind, fileId: string) => {
    if (!clientId) return;
    try {
      await deleteFile(String(clientId), fileId);
      await fetchClient();
    } catch {
      setError(fallbackMessages.CLIENTS.UPDATE_FAILED);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // restore last loaded values if available, otherwise fall back to default
    if (originalForm) {
      setForm((f) => ({ ...f, ...(originalForm as Partial<FormShape>) }));
    } else {
      setForm(defaultForm);
    }
  };

  // Ensure editing is cancelled when modal closes
  const handleClose = () => {
    setIsEditing(false);
    if (originalForm)
      setForm((f) => ({ ...f, ...(originalForm as Partial<FormShape>) }));
    onClose();
  };

  // Fetch client by id when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (!clientId) return;
    void fetchClient();
  }, [isOpen, clientId]);

  // ...existing code...
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <Modal.Backdrop
        variant="blur"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container size="cover" className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
          <Modal.Dialog className="bg-[#F4F4F5] min-h-[80vh] max-w-[1440px]">
        <Modal.Header className="relative mt-6">
          <div className="flex p-4 h-auto w-full bg-primary rounded-2xl gap-24">
            <div className="flex flex-col justify-center">
              {/*
                `ProgressRing` e não `ProgressCircle` cru: o componente de uso
                simples do HeroUI tem tamanho fechado em três variantes
                pequenas e nenhum slot para o número no centro — na prática não
                desenhava nada visível aqui. O `ProgressRing` é a composição
                `Root/Track/FillCircle` com o rótulo dentro, feita para este
                cabeçalho.
              */}
              <ProgressRing
                value={progress}
                size={88}
                label="Preenchimento do cadastro"
              />
              <p className="mt-2 max-w-[110px] text-center text-xs font-light text-white/70">
                Preenchimento do cadastro
              </p>
            </div>

            <div className="w-auto grid grid-rows-2 gap-4">
              <h3 className="max-w-[600px] text-white text-[32px] font-medium leading-10">
                {form.nome || clientName}
                <p className="absolute mt-2 top-auto w-14 border-b-2 border-solid border-secondary" />
              </h3>
              <div className="flex gap-2 items-center">
                <Image
                  src={svgPaths.ICONS.CONFETTI}
                  alt="Logo"
                  height={24}
                  width={24}
                />
                <div className="flex gap-4">
                  <p className="mt-1 font-light text-white">
                    {formatDateBR(form.nascimento)}
                  </p>
                  <p className="text-white">---</p>
                  <p className="mt-1 text-white font-light">
                    {typeof form.age === "number" && form.age !== null
                      ? `${form.age} anos`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex mt-10 items-center gap-4">
                <div className="w-auto px-3 py-1 rounded-full bg-secondary/25">
                  <p className="text-base font-normal text-secondary">
                    {displayBenefit || "—"}
                  </p>
                </div>
                <div className="w-auto px-3 py-1 rounded-full bg-success/25">
                  <p className="text-base font-normal text-success">
                    {displaySituation || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-white text-[32px] font-medium py-1 mb-4">
                Contatos
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex gap-1">
                  <Image
                    src={svgPaths.ICONS.LETTER}
                    alt="Logo"
                    height={24}
                    width={24}
                  />
                  <p className="text-base font-light text-white ml-2">
                    {form.email || "—"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Image
                    src={svgPaths.ICONS.PHONE}
                    alt="Logo"
                    height={24}
                    width={24}
                  />
                  <p className="text-base font-light text-white ml-2">
                    {form.celular || "—"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Image
                    src={svgPaths.ICONS.PHONE}
                    alt="Logo"
                    height={24}
                    width={24}
                  />
                  <p className="text-base font-light text-white ml-2">
                    {form.telRecado || "—"}
                  </p>
                </div>
              </div>
              {/* debug block removed */}
            </div>
            {/*
              Ações do cabeçalho.

              Editar e excluir viram botões de ícone no topo, como no
              protótipo — e porque `variant="primary"`/`"outline"` pintam texto
              com `text-primary`, que é exatamente o azul deste cartão: os dois
              botões estavam ilegíveis, um deles a ponto de parecer um pill
              vazio.

              Excluir é o único vermelho aqui. Pintar as duas ações de destaque
              ensina a ignorar o vermelho.
            */}
            <div className="ml-auto flex flex-col items-end justify-between">
              <div className="flex items-center gap-2">
                {/*
                  `Tooltip.Content` vem ANTES do `Button`, como irmão — é a
                  ordem que o `ActionButton` da casa usa. Colocá-lo dentro do
                  botão, que foi minha primeira tentativa, renderiza o conteúdo
                  do tooltip como filho do botão e o balão nunca abre.
                */}
                {!isEditing && (
                  <Tooltip delay={0}>
                    <Tooltip.Content showArrow placement="bottom">
                      <Tooltip.Arrow />
                      <p>Editar cadastro</p>
                    </Tooltip.Content>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Editar cadastro"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/25 p-0 hover:bg-secondary/40"
                      onPress={() => setIsEditing(true)}
                    >
                      <Image
                        src={svgPaths.ICONS.EDIT}
                        alt=""
                        height={18}
                        width={18}
                      />
                    </Button>
                  </Tooltip>
                )}

                {/*
                  Excluir é de advogado/admin. O backend recusa o atendente com
                  403 de qualquer jeito; esconder aqui é para ele não esbarrar
                  num botão que existe só para dizer não.
                */}
                {podeDestruir && (
                  <Tooltip delay={0}>
                    <Tooltip.Content showArrow placement="bottom">
                      <Tooltip.Arrow />
                      <p>Excluir cliente</p>
                    </Tooltip.Content>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label="Excluir cliente"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/25 p-0 hover:bg-danger/40"
                      onPress={() => setShowDeleteModal(true)}
                    >
                      <Image
                        src={svgPaths.ICONS.TRASH}
                        alt=""
                        height={18}
                        width={18}
                      />
                    </Button>
                  </Tooltip>
                )}
              </div>

              {/* Salvar/Cancelar no rodapé do cartão, como no protótipo. */}
              {isEditing && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="font-medium text-white/80 hover:bg-white/10 hover:text-white"
                    onPress={handleCancelEdit}
                    isDisabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    className="on-primary-button font-medium"
                    onPress={handleSave}
                    isDisabled={loading}
                  >
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </div>

            <FileUploadModal
              isOpen={uploadKind !== null}
              initialKind={uploadKind ?? "documents"}
              onClose={() => setUploadKind(null)}
              onConfirm={({ documents: docs, simulations: sims }) => {
                setStagedDocuments((current) => [...current, ...docs]);
                setStagedSimulations((current) => [...current, ...sims]);
              }}
            />

            {/* Modal de confirmação de exclusão */}
            {showDeleteModal && (
              <DeleteClientModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                clientName={clientName}
                onConfirm={() => {
                  void handleDelete();
                }}
              />
            )}
          </div>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="p-6">
              <Skeleton className="w-full h-8 mb-4" />
              <Skeleton className="w-full h-48 mb-4" />
              <Skeleton className="w-full h-32" />
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-[2fr_.8fr] gap-4 py-4">
              {/*
                Accordion no lugar dos cartões soltos: a ficha tem seis
                assuntos e nem todo atendimento precisa dos seis abertos. Mesma
                variante `surface` e mesma classe do cadastro, para as duas
                telas serem reconhecivelmente a mesma coisa.
              */}
              <Accordion
                variant="surface"
                className="client-form-accordion w-full"
                hideSeparator
                allowsMultipleExpanded
                defaultExpandedKeys={["dados-pessoais", "dados-profissionais"]}
              >
                {/* Dados Pessoais */}
                <FormSection
                  id="dados-pessoais"
                  title="Dados pessoais"
                  icon={<Image src={svgPaths.ICONS.PROFILE} alt="" height={20} width={20} />}
                  status="saved"
                  statusLabel=""
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full p-4">
                    <Field
                      label="Nome completo"
                      isReadOnly={!isEditing}
                      value={form.nome}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nome: e.target.value }))
                      }
                      className="flex-1 min-w-[280px]"
                    />
                    <Field
                      label="Data de nascimento"
                      isReadOnly={!isEditing}
                      value={form.nascimento}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({
                          ...f,
                          nascimento: v,
                          age: computeAgeFromDate(v),
                        }));
                      }}
                      className="flex-1 min-w-[125px]"
                      type="date"
                    />
                    <div className="flex-1 min-w-[220px]">
                      <SelectField
                        label="Estado civil"
                        isDisabled={!isEditing}
                        options={MaritalStatusOptions.map((o) => ({ id: o.value, label: o.label }))}
                        selectedKey={form.estadoCivil || null}
                        onSelectionChange={(key) => setForm((f) => ({ ...f, estadoCivil: key }))}
                      />
                      {/* <div className="flex-1 min-w-[160px]">
                            <SelectField
                        label="Situação do benefício"
                        isDisabled={!isEditing}
                        options={RetirementTypeOptions.map((o) => ({ id: String(o.id), label: o.label }))}
                        selectedKey={form.situacaoBeneficio ? String(form.situacaoBeneficio) : null}
                        onSelectionChange={(key) => setForm((f) => ({ ...f, situacaoBeneficio: Number(key) }))}
                      />
                          </div> */}
                    </div>
                    <Field
                      label="CPF"
                      isReadOnly={!isEditing}
                      value={form.cpf}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cpf: e.target.value }))
                      }
                      className="flex-1 min-w-[140px]"
                    />
                    <Field
                      label="RG"
                      isReadOnly={!isEditing}
                      value={form.rg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rg: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="Nome da mãe"
                      isReadOnly={!isEditing}
                      value={form.nomeMae}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nomeMae: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="E-mail"
                      isReadOnly={!isEditing}
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="Celular"
                      isReadOnly={!isEditing}
                      value={form.celular}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, celular: e.target.value }))
                      }
                      className="flex-1 min-w-[140px]"
                    />
                    <Field
                      label="Telefone recado"
                      isReadOnly={!isEditing}
                      value={form.telRecado}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          telRecado: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[140px]"
                    />
                    <Field
                      label="Responsável"
                      isReadOnly={!isEditing}
                      value={form.responsavelRecado}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          responsavelRecado: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[100px]"
                    />
                    <div className="flex-1 min-w-[180px]">
                      <SelectField
                        label="Benefício pretendido"
                        isDisabled={!isEditing}
                        options={IntendedBenefitOptions.map((o) => ({ id: o.value, label: o.label }))}
                        selectedKey={form.beneficioPretendido || null}
                        onSelectionChange={(key) => setForm((f) => ({ ...f, beneficioPretendido: key }))}
                      />
                    </div>
                  </div>
                </FormSection>
                <FormSection
                  id="dados-profissionais"
                  title="Dados profissionais"
                  icon={<Image src={svgPaths.ICONS.USER_ID} alt="" height={20} width={20} />}
                  status="saved"
                  statusLabel=""
                >
                  <div className="flex flex-wrap gap-4 p-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                      <SelectField
                        label="Benefício pretendido"
                        isDisabled={!isEditing}
                        options={IntendedBenefitOptions.map((o) => ({ id: o.value, label: o.label }))}
                        selectedKey={form.beneficioPretendido || null}
                        onSelectionChange={(key) =>
                          setForm((f) => ({ ...f, beneficioPretendido: key }))
                        }
                      />
                    </div>
                    <Field
                      label="Nº do beneficiário"
                      isReadOnly={!isEditing}
                      value={form.numBeneficiario}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          numBeneficiario: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="NIT/PIS"
                      isReadOnly={!isEditing}
                      value={form.nitPis}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nitPis: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="Profissão"
                      isReadOnly={!isEditing}
                      value={form.profissao}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          profissao: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="CTPS"
                      isReadOnly={!isEditing}
                      value={form.ctps}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ctps: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="Série"
                      isReadOnly={!isEditing}
                      value={form.serie}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, serie: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <InssPasswordField
                      clientId={String(clientId ?? "")}
                      isEditing={isEditing}
                      novaSenha={form.senhaInss}
                      onNovaSenhaChange={(valor) =>
                        setForm((f) => ({ ...f, senhaInss: valor }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="Tempo de contribuição (anos)"
                      isReadOnly={!isEditing}
                      maxLength={3}
                      value={form.tempoAnos}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          tempoAnos: soDigitos(e.target.value),
                        }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Field
                      label="Meses"
                      isReadOnly={!isEditing}
                      maxLength={2}
                      value={form.tempoMeses}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          tempoMeses: soDigitos(e.target.value),
                        }))
                      }
                      className="flex-1 min-w-[120px]"
                    />
                    <Field
                      label="Dias"
                      isReadOnly={!isEditing}
                      maxLength={2}
                      value={form.tempoDias}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          tempoDias: soDigitos(e.target.value),
                        }))
                      }
                      className="flex-1 min-w-[120px]"
                    />
                  </div>
                </FormSection>
                {/* ── Endereço ── */}
                <FormSection
                  id="endereco"
                  title="Endereço"
                  icon={<Image src={svgPaths.ICONS.PROFILE} alt="" height={20} width={20} />}
                  status="saved"
                  statusLabel=""
                >
                  <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
                    <Field
                      label="CEP"
                      isReadOnly={!isEditing}
                      value={address.zipCode}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, zipCode: e.target.value }))
                      }
                    />
                    <Field
                      label="Logradouro"
                      isReadOnly={!isEditing}
                      value={address.street}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, street: e.target.value }))
                      }
                      className="md:col-span-2"
                    />
                    <Field
                      label="Número"
                      isReadOnly={!isEditing}
                      value={address.addressNumber}
                      onChange={(e) =>
                        setAddress((a) => ({
                          ...a,
                          addressNumber: e.target.value,
                        }))
                      }
                    />
                    <Field
                      label="Complemento"
                      isReadOnly={!isEditing}
                      value={address.complement}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, complement: e.target.value }))
                      }
                    />
                    <Field
                      label="Bairro"
                      isReadOnly={!isEditing}
                      value={address.neighborhood}
                      onChange={(e) =>
                        setAddress((a) => ({
                          ...a,
                          neighborhood: e.target.value,
                        }))
                      }
                    />
                    <Field
                      label="Cidade"
                      isReadOnly={!isEditing}
                      value={address.city}
                      onChange={(e) =>
                        setAddress((a) => ({ ...a, city: e.target.value }))
                      }
                    />
                    <Field
                      label="UF"
                      isReadOnly={!isEditing}
                      maxLength={2}
                      value={address.state}
                      onChange={(e) =>
                        setAddress((a) => ({
                          ...a,
                          state: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                </FormSection>

                {/* ── Entrevista ── */}
                <FormSection
                  id="entrevista"
                  title="Entrevista"
                  icon={<Image src={svgPaths.ICONS.ARCHIVE} alt="" height={20} width={20} />}
                  status="saved"
                  statusLabel={
                    interviewCount > 1 ? `${interviewCount} registros` : ""
                  }
                >
                  <div className="flex flex-col gap-4 p-4">
                    {interviewCount > 1 && (
                      <p className="text-xs text-gray-100">
                        {interviewCount} entrevistas registradas — esta é a mais
                        recente.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <DateTimePickerField
                        label="Data e hora"
                        value={interview.occurredAt}
                        onChange={(value) =>
                          setInterview((i) => ({ ...i, occurredAt: value }))
                        }
                        isDisabled={!isEditing}
                        className="md:col-span-2"
                      />
                      <Field
                        label="Duração (minutos)"
                        isReadOnly={!isEditing}
                        value={interview.durationMinutes}
                        onChange={(e) =>
                          setInterview((i) => ({
                            ...i,
                            durationMinutes: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <TextAreaField
                      label="Anotações"
                      value={interview.content}
                      onChange={(value) =>
                        setInterview((i) => ({ ...i, content: value }))
                      }
                      rows={5}
                      isDisabled={!isEditing}
                      placeholder="Relato do atendimento, documentos combinados, próximos passos..."
                    />
                  </div>
                </FormSection>

                {/* ── Arquivos ── */}
                <FormSection
                  id="arquivos"
                  title="Arquivos"
                  icon={<Image src={svgPaths.ICONS.ARCHIVE} alt="" height={20} width={20} />}
                  status="saved"
                  statusLabel={
                    documents.length + simulations.length > 0
                      ? `${documents.length + simulations.length}`
                      : ""
                  }
                >
                  <div className="flex flex-col gap-3 p-4">
                    <FilesSection
                      documents={documents}
                      simulations={simulations}
                      stagedDocuments={stagedDocuments}
                      stagedSimulations={stagedSimulations}
                      onAddFiles={setUploadKind}
                      onRemoveStagedDocument={(index) =>
                        setStagedDocuments((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      onRemoveStagedSimulation={(index) =>
                        setStagedSimulations((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                      onDelete={isEditing ? handleDeleteFile : undefined}
                    />
                    {(stagedDocuments.length > 0 ||
                      stagedSimulations.length > 0) && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          onPress={handleUploadStaged}
                          isDisabled={loading}
                        >
                          Enviar arquivos
                        </Button>
                      </div>
                    )}
                  </div>
                </FormSection>
              </Accordion>
              {/*
                Coluna do histórico. `h-fit` e não altura fixa: a lista cresce
                com o número de mudanças, e o `h-32` anterior cortava tudo
                depois da segunda linha.
              */}
              <div className="h-fit w-full rounded-2xl bg-white px-4 py-4">
                <div className="flex justify-center gap-2">
                  <Image
                    src={svgPaths.ICONS.ARCHIVE}
                    alt=""
                    height={24}
                    width={24}
                  />
                  <h3 className="text-xl font-semibold text-secondary">
                    Histórico
                  </h3>
                </div>
                {/*
                  O teto de altura mantém a coluna do lado das duas colunas de
                  formulário mesmo num cliente com dezenas de mudanças.
                */}
                <div className="mt-4 max-h-[420px] overflow-auto pr-1">
                  <SituationHistorySection
                    items={situationHistory}
                    hasError={historyFailed}
                    autores={autores}
                  />
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
