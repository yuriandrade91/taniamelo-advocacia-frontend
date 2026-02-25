import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { CircularProgress } from "@heroui/progress";
import { Skeleton } from "@heroui/skeleton";
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
import { Select, SelectItem } from "@heroui/select";
import DeleteClientModal from "../DeleteClientModal/DeleteClientModal";
import axiosInstance from "@/services/axiosService";
import endpoints from "@/constants/endpoints/paths";
import { Clients } from "@/interfaces/Clients.interface";
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import {
  RetirementTypeOptions,
  SituationOptions,
} from "@/enums/situation/Situation";
import { IntendedBenefitOptions } from "@/enums/benefit/Benefits";

type FormShape = {
  nome: string;
  nascimento: string;
  estadoCivil: number;
  genero: string;
  age?: number | null;
  cpf: string;
  rg: string;
  nomeMae: string;
  email: string;
  celular: string;
  telRecado: string;
  responsavelRecado: string;
  situacaoBeneficio: number;
  beneficioPretendido: number;
  numBeneficiario: string;
  nitPis: string;
  profissao: string;
  ctps: string;
  serie: string;
  senhaInss: string;
  tempoContribuicao: string;
  isento: boolean;
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
      await axiosInstance.delete(endpoints.URL_CLIENTS.BY_ID(String(clientId)));
      setShowDeleteModal(false);
      onClose();
      if (typeof onConfirm === "function") onConfirm();
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      setError(
        e?.message || (e?.response?.data?.message ?? "Erro ao deletar cliente"),
      );
    } finally {
      setLoading(false);
    }
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [situationHistory, setSituationHistory] = useState<
    Array<Record<string, any>>
  >([]);

  // Controlled state for all input fields - start empty and populate when fetching
  const defaultForm: FormShape = {
    nome: "",
    nascimento: "",
    estadoCivil: 0,
    genero: "",
    age: null,
    cpf: "",
    rg: "",
    nomeMae: "",
    email: "",
    celular: "",
    telRecado: "",
    responsavelRecado: "",
    situacaoBeneficio: 0,
    beneficioPretendido: 0,
    numBeneficiario: "",
    nitPis: "",
    profissao: "",
    ctps: "",
    serie: "",
    senhaInss: "",
    tempoContribuicao: "",
    isento: false,
  };
  const [form, setForm] = useState<FormShape>(defaultForm);

  // Calcula o progresso com base nos campos preenchidos
  const totalFields = Object.keys(form).length;
  const filledFields = Object.values(form).filter((v) =>
    typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null,
  ).length;
  const progress = Math.round((filledFields / totalFields) * 100);

  const computeAgeFromDate = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const d = new Date(String(dateStr));
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  };

  const findLabelById = (
    opts: Array<{ id?: number; value?: string; label: string }>,
    id?: number | string | null,
  ) => {
    if (id === undefined || id === null || id === "") return "";
    // numeric id: prefer explicit id, otherwise use index offset (1-based)
    if (typeof id === "number") {
      const byId = opts.find((o) => o.id === id);
      if (byId) return byId.label;
      const idx = id - 1;
      return opts[idx] ? opts[idx].label : "";
    }
    // string id: try to match value or label
    const byValue = opts.find((o) => o.value === id || o.label === id);
    return byValue ? byValue.label : "";
  };

  const displayBenefit = findLabelById(
    IntendedBenefitOptions,
    form.beneficioPretendido,
  );
  const displaySituation = findLabelById(
    RetirementTypeOptions,
    form.situacaoBeneficio,
  );

  const fetchClient = async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");

    const findOptionIdByLabel = (
      opts: Array<{ id?: number; value?: string; label: string }>,
      label?: string | number | null,
    ) => {
      if (label === undefined || label === null || label === "") return 0;
      if (typeof label === "number") return label;
      const normalize = (s: string) =>
        s
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase()
          .trim();
      const target = normalize(String(label));
      // try matching by explicit id
      const byId = opts.find(
        (o) => o.id !== undefined && String(o.id) === String(label),
      );
      if (byId) return byId.id ?? opts.indexOf(byId) + 1;
      // try matching by value (for option sets that expose a value/key)
      const byValue = opts.find(
        (o) =>
          (o as any).value !== undefined &&
          String((o as any).value) === String(label),
      );
      if (byValue) return byValue.id ?? opts.indexOf(byValue) + 1;
      // fallback to label match
      const found = opts.find((o) => normalize(o.label) === target);
      if (found) return found.id ?? opts.indexOf(found) + 1;
      return 0;
    };

    try {
      const url = endpoints.URL_CLIENTS.BY_ID(String(clientId));
      const res = await axiosInstance.get<Clients>(url);
      const payload = (res?.data as any)?.data ?? res?.data ?? null;

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

      // resolve marital status (ClientResponse.maritalStatus is a string label/key)
      const maritalId =
        findOptionIdByLabel(
          MaritalStatusOptions,
          (payload as any)?.maritalStatus ??
            (payload as any)?.marital_status_name ??
            (payload as any)?.marital_status_id,
        ) ?? defaultForm.estadoCivil;
      // resolve situation: ClientResponse.situation is a string (label or key)
      let situationId = findOptionIdByLabel(
        RetirementTypeOptions,
        (payload as any)?.situation ??
          (payload as any)?.situation_name ??
          (payload as any)?.situation_key,
      );
      if (!situationId) {
        const s =
          (payload as any)?.situation ??
          (payload as any)?.situation_name ??
          (payload as any)?.situation_key;
        if (typeof s === "string" && s.trim() !== "") {
          const foundInValues = SituationOptions.find(
            (o) =>
              String(o.value) === String(s) ||
              o.label.toLowerCase() === String(s).toLowerCase(),
          );
          if (foundInValues)
            situationId = SituationOptions.indexOf(foundInValues) + 1;
        }
      }
      situationId = situationId ?? defaultForm.situacaoBeneficio;
      // resolve benefit: ClientResponse.benefit is a label/key
      const benefitId =
        findOptionIdByLabel(
          IntendedBenefitOptions,
          (payload as any)?.benefit ??
            (payload as any)?.benefit_type ??
            (payload as any)?.benefitType ??
            (payload as any)?.benefit_id,
        ) ?? defaultForm.beneficioPretendido;

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
        estadoCivil:
          // maritalStatus in ClientResponse is a string label; try to resolve it into an id
          Number(maritalId) || defaultForm.estadoCivil,
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
        situacaoBeneficio: Number(situationId) || defaultForm.situacaoBeneficio,
        beneficioPretendido:
          // ClientResponse may expose 'benefit' (label) or benefit keys; fall back to previous logic
          Number(benefitId) || defaultForm.beneficioPretendido,
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
        senhaInss:
          (payload?.inssPassword as string) ??
          (payload as any).inss_password ??
          defaultForm.senhaInss,
        tempoContribuicao:
          typeof (payload?.contributionTime as any) !== "undefined" &&
          (payload?.contributionTime as any) !== null
            ? String(payload?.contributionTime as any)
            : typeof (payload as any).contribution_time !== "undefined" &&
                (payload as any).contribution_time !== null
              ? String((payload as any).contribution_time)
              : defaultForm.tempoContribuicao,
        isento:
          typeof (payload?.nonBillable as any) === "boolean"
            ? (payload?.nonBillable as boolean)
            : typeof (payload as any).non_billable === "boolean"
              ? (payload as any).non_billable
              : defaultForm.isento,
      };

      setForm(mapped);
      setOriginalForm(mapped);
      // fetch situation history (single request)
      try {
        const histRes = await axiosInstance.get(
          endpoints.URL_CLIENTS.SITUATION_HISTORY(String(clientId)),
        );
        const histPayload = (histRes?.data as any)?.data ?? histRes?.data ?? [];
        const items = Array.isArray(histPayload)
          ? histPayload
          : (histPayload.data ?? histPayload.items ?? []);
        setSituationHistory(items);
      } catch (errHistory) {
        console.debug("Could not load situation history:", errHistory);
      }
    } catch (err: unknown) {
      console.error("DetailsClientModal GET error:", err);
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      setError(
        e?.message || (e?.response?.data?.message ?? "Erro desconhecido"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      full_name: form.nome,
      birth_date: form.nascimento,
      gender: form.genero || undefined,
      marital_status_id: form.estadoCivil || undefined,
      cpf: form.cpf,
      rg: form.rg,
      mother_name: form.nomeMae,
      email: form.email,
      mobile_phone: form.celular,
      reference_phone: form.telRecado,
      reference_responsible: form.responsavelRecado,
      situation_id: form.situacaoBeneficio || undefined,
      benefit_id: form.beneficioPretendido || undefined,
      benefit_number: form.numBeneficiario,
      nit_pis: form.nitPis,
      profession: form.profissao,
      ctps: form.ctps,
      ctps_series: form.serie,
      inss_password: form.senhaInss,
      contribution_time:
        form.tempoContribuicao !== ""
          ? Number(form.tempoContribuicao)
          : undefined,
      non_billable: form.isento,
      created_by: 1,
    };

    try {
      await axiosInstance.put(
        endpoints.URL_CLIENTS.BY_ID(String(clientId)),
        payload,
      );
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
        e?.response?.data?.message || e?.message || "Erro ao atualizar cliente";
      setError(message);
    } finally {
      setLoading(false);
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
    <Modal
      size="5xl"
      backdrop="blur"
      isOpen={isOpen}
      onClose={handleClose}
      className="bg-[#F4F4F5] min-h-[80vh] max-w-[1440px]"
    >
      <ModalContent>
        <ModalHeader className="relative mt-6">
          <div className="flex p-4 h-auto w-full bg-primary rounded-2xl gap-24">
            <div className="flex flex-col justify-center">
              <CircularProgress
                className="text-white"
                color="success"
                showValueLabel={true}
                strokeWidth={2}
                value={progress}
                classNames={{
                  svg: "w-40 h-40 drop-shadow-md",
                  indicator: "success",
                  track: "stroke-white/30",
                  value: "text-4xl font-medium text-white",
                }}
              />
              <p className="text-sm text-white font-light">
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
                  src="../../svg/icons/confetti.svg"
                  alt="Logo"
                  height={24}
                  width={24}
                />
                <div className="flex gap-4">
                  <p className="mt-1 text-white font-light">
                    {form.nascimento
                      ? new Date(String(form.nascimento)).toLocaleDateString(
                          "pt-BR",
                        )
                      : "—"}
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
                    src="../../svg/icons/letter.svg"
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
                    src="../../svg/icons/phone.svg"
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
                    src="../../svg/icons/phone.svg"
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
            <div className="grid grid-rows-2 items-stretch gap-4 ml-auto">
              <Button
                variant="solid"
                color="danger"
                className="font-medium"
                onPress={() => setShowDeleteModal(true)}
              >
                Excluir
              </Button>

              {typeof isEditing !== "undefined" &&
              typeof setIsEditing === "function" &&
              typeof handleSave === "function" ? (
                !isEditing ? (
                  <Button
                    variant="bordered"
                    color="default"
                    className="font-medium flex place-self-end"
                    onPress={() => setIsEditing(true)}
                  >
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2 items-end">
                    <Button
                      variant="light"
                      color="default"
                      className="font-medium text-white"
                      onPress={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="solid"
                      color="success"
                      className="font-medium"
                      onPress={handleSave}
                    >
                      Salvar
                    </Button>
                  </div>
                )
              ) : null}
            </div>

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
        </ModalHeader>
        <ModalBody>
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
              <div className="grid grid-rows-2 gap-2 w-full">
                {/* Dados Pessoais */}
                <div className="bg-white flex flex-col rounded-2xl">
                  <div className="flex items-center gap-2 p-4">
                    <Image
                      src="../svg/icons/profile.svg"
                      alt="Logo"
                      height={24}
                      width={24}
                    />
                    <h3 className="text-xl font-semibold text-secondary">
                      Dados pessoais
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full p-4">
                    <Input
                      label="Nome completo"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.nome}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nome: e.target.value }))
                      }
                      className="flex-1 min-w-[280px]"
                    />
                    <Input
                      label="Data de nascimento"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
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
                      <Select
                        label="Estado civil"
                        size="lg"
                        variant="flat"
                        radius="md"
                        isDisabled={!isEditing}
                        selectedKeys={
                          form.estadoCivil ? [String(form.estadoCivil)] : []
                        }
                        onSelectionChange={(keys) => {
                          const value = String(Array.from(keys)[0] ?? "");
                          setForm((f) => ({
                            ...f,
                            estadoCivil: Number(value),
                          }));
                        }}
                        classNames={{
                          label: "!text-secondary",
                          value: isEditing
                            ? "!text-gray-100"
                            : "!text-gray-400",
                        }}
                      >
                        {MaritalStatusOptions.map((opt) => (
                          <SelectItem key={String(opt.id)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>
                      {/* <div className="flex-1 min-w-[160px]">
                            <Select
                              label="Gênero"
                              size="lg"
                              variant="flat"
                              radius="md"
                              isDisabled={!isEditing}
                              selectedKeys={
                                form.genero ? [String(form.genero)] : []
                              }
                              onSelectionChange={(keys) => {
                                const value = String(Array.from(keys)[0] ?? "");
                                setForm((f) => ({ ...f, genero: value }));
                              }}
                              classNames={{
                                label: "!text-secondary",
                                value: isEditing
                                  ? "!text-gray-100"
                                  : "!text-gray-400",
                              }}
                            >
                              <SelectItem key="Feminino">Feminino</SelectItem>
                              <SelectItem key="Masculino">Masculino</SelectItem>
                              <SelectItem key="Outro">Outro</SelectItem>
                              <SelectItem key="Prefiro não dizer">
                                Prefiro não dizer
                              </SelectItem>
                            </Select>
                          </div> */}
                    </div>
                    <Input
                      label="CPF"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.cpf}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cpf: e.target.value }))
                      }
                      className="flex-1 min-w-[140px]"
                    />
                    <Input
                      label="RG"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.rg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, rg: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label="Nome da mãe"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.nomeMae}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nomeMae: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label="E-mail"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label="Celular"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.celular}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, celular: e.target.value }))
                      }
                      className="flex-1 min-w-[140px]"
                    />
                    <Input
                      label="Telefone recado"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
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
                    <Input
                      label="Responsável"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
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
                      <Select
                        label="Situação do benefício"
                        size="lg"
                        variant="flat"
                        radius="md"
                        isDisabled={!isEditing}
                        selectedKeys={
                          form.situacaoBeneficio
                            ? [String(form.situacaoBeneficio)]
                            : []
                        }
                        onSelectionChange={(keys) => {
                          const value = String(Array.from(keys)[0] ?? "");
                          setForm((f) => ({
                            ...f,
                            situacaoBeneficio: Number(value),
                          }));
                        }}
                        classNames={{
                          label: "!text-secondary",
                          value: isEditing
                            ? "!text-gray-100"
                            : "!text-gray-400",
                        }}
                      >
                        {RetirementTypeOptions.map((opt, i) => (
                          <SelectItem key={String(i + 1)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="bg-white flex flex-col rounded-2xl">
                  <div className="flex items-center gap-2 p-4">
                    <Image
                      src="../svg/icons/user_id.svg"
                      alt="Logo"
                      height={24}
                      width={24}
                    />
                    <h3 className="text-xl font-semibold text-secondary">
                      Dados profissionais
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 p-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                      <Select
                        label="Benefício pretendido"
                        size="lg"
                        variant="flat"
                        radius="md"
                        isDisabled={!isEditing}
                        selectedKeys={
                          form.beneficioPretendido
                            ? [String(form.beneficioPretendido)]
                            : []
                        }
                        onSelectionChange={(keys) => {
                          const value = String(Array.from(keys)[0] ?? "");
                          setForm((f) => ({
                            ...f,
                            beneficioPretendido: Number(value),
                          }));
                        }}
                        classNames={{
                          label: "!text-secondary",
                          value: isEditing
                            ? "!text-gray-100"
                            : "!text-gray-400",
                        }}
                      >
                        {IntendedBenefitOptions.map((opt, i) => (
                          <SelectItem key={String(i + 1)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>
                    </div>
                    <Input
                      label="Nº do beneficiário"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
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
                    <Input
                      label="NIT/PIS"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.nitPis}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nitPis: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label="Profissão"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
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
                    <Input
                      label="CTPS"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.ctps}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ctps: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label="Série"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.serie}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, serie: e.target.value }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label='Senha "meu inss"'
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      type="text"
                      value={form.senhaInss}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          senhaInss: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                    <Input
                      label="Tempo de contribuição"
                      variant="flat"
                      size="lg"
                      classNames={{
                        label: "!text-secondary",
                        input: isEditing ? "!text-gray-100" : "!text-gray-400",
                      }}
                      radius="md"
                      isReadOnly={!isEditing}
                      value={form.tempoContribuicao}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          tempoContribuicao: e.target.value,
                        }))
                      }
                      className="flex-1 min-w-[180px]"
                    />
                  </div>
                </div>
                <div className="w-full flex flex-1 pl-6 pt-4">
                  {/* <ExemptFromServiceSwitch
                        value={!!form.isento}
                        onChange={(v) => setForm((f) => ({ ...f, isento: v }))}
                        disabled={!isEditing}
                        labelClassName={
                          !isEditing
                            ? "text-gray-400 font-medium"
                            : "text-primary font-medium"
                        }
                      /> */}
                </div>
              </div>
              <div className="py-4 px-2 h-32 w-full bg-white rounded-2xl">
                <div className="flex gap-2 justify-center">
                  <Image
                    src="../svg/icons/archive.svg"
                    alt="Logo"
                    height={24}
                    width={24}
                  />
                  <h3 className="text-xl font-semibold text-secondary">
                    Histórico
                  </h3>
                </div>
                <div className="max-h-48 overflow-auto p-4">
                  {situationHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">Sem histórico.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {situationHistory.map((h, idx) => {
                        const ts =
                          h?.createdAt ||
                          h?.created_at ||
                          h?.date ||
                          h?.timestamp;
                        const text =
                          h?.description ||
                          h?.note ||
                          h?.details ||
                          JSON.stringify(h);
                        const dateStr = ts
                          ? new Date(String(ts)).toLocaleString("pt-BR")
                          : "-";
                        return (
                          <li
                            key={String(idx)}
                            className="text-sm text-gray-700"
                          >
                            <span className="font-medium mr-2">{dateStr}</span>
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
