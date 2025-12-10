import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Modal, ModalBody, ModalContent, ModalHeader } from "@heroui/modal";
import { CircularProgress } from "@heroui/progress";
import { Skeleton } from "@heroui/skeleton";
import Image from "next/image";

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId?: number | string;
  onConfirm?: () => void;
  editOnOpen?: boolean;
}

import React, { useState, useEffect } from "react";
import { Select, SelectItem } from "@heroui/select";
// import ExemptFromServiceSwitch from "@/components/exemptFromServiceSwitch/exemptFromServiceSwitch";
import DeleteClientModal from "../DeleteClientModal/DeleteClientModal";
import axiosInstance from "@/services/axiosService";
import endpoints from "@/constants/endpoints/paths";
import { ClientResponse } from "@/interfaces/client/Response/ClientResponse.interface";
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import { RetirementTypeOptions } from "@/enums/situation/Situation";
import { IntendedBenefitOptions } from "@/enums/benefit/benefits";

export default function DetailsClientModal({
  isOpen,
  onClose,
  clientName,
  clientId,
  onConfirm,
  editOnOpen = false,
}: DeleteClientModalProps) {
  console.debug("DetailsClientModal render props:", {
    isOpen,
    clientId,
    clientName,
    editOnOpen,
  });
  // Local state for edit and delete modal logic
  const [isEditing, setIsEditing] = useState(false);
  // Keep a snapshot of the last loaded form so Cancel restores it
  const [originalForm, setOriginalForm] = useState<Partial<typeof form> | null>(
    null
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
      await axiosInstance.delete(endpoints.CLIENTS.CLIENT_BY_ID(clientId));
      setShowDeleteModal(false);
      onClose();
      if (typeof onConfirm === "function") onConfirm();
    } catch (err: unknown) {
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      setError(
        e?.message || (e?.response?.data?.message ?? "Erro ao deletar cliente")
      );
    } finally {
      setLoading(false);
    }
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Controlled state for all input fields - start empty and populate when fetching
  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    estadoCivil: 0,
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
  });

  // Calcula o progresso com base nos campos preenchidos
  const totalFields = Object.keys(form).length;
  const filledFields = Object.values(form).filter((v) =>
    typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null
  ).length;
  const progress = Math.round((filledFields / totalFields) * 100);

  const findLabelById = (
    opts: { id: number; label: string }[],
    id?: number | string | null
  ) => {
    if (!id) return "";
    const found = opts.find((o) => String(o.id) === String(id));
    return found ? found.label : "";
  };

  const displayBenefit = findLabelById(
    IntendedBenefitOptions,
    form.beneficioPretendido
  );
  const displaySituation = findLabelById(
    RetirementTypeOptions,
    form.situacaoBeneficio
  );

  const fetchClient = async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    // reset to empty while loading
    setForm(defaultForm);

    const findOptionIdByLabel = (
      opts: { id: number; label: string }[],
      label?: string | number | null
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
      const found = opts.find((o) => normalize(o.label) === target);
      return found ? Number(found.id) : 0;
    };

    try {
      const url = endpoints.CLIENTS.CLIENT_BY_ID(clientId);
      console.debug("DetailsClientModal GET ->", url);
      const res = await axiosInstance.get(url);
      console.debug("DetailsClientModal GET response:", res?.data);
      const data: Partial<ClientResponse> = res.data;

      const getNumberField = (
        obj: Partial<ClientResponse> | null | undefined,
        key: string
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

      const maritalId =
        getNumberField(data, "marital_status_id") ??
        findOptionIdByLabel(MaritalStatusOptions, data?.marital_status_name) ??
        defaultForm.estadoCivil;
      const situationId =
        getNumberField(data, "situation_id") ??
        findOptionIdByLabel(RetirementTypeOptions, data?.situation_status) ??
        defaultForm.situacaoBeneficio;
      const benefitId =
        getNumberField(data, "benefit_id") ??
        findOptionIdByLabel(IntendedBenefitOptions, data?.benefit_type) ??
        defaultForm.beneficioPretendido;

      const mapped = {
        nome: (data.full_name as string) ?? defaultForm.nome,
        nascimento: (data.birth_date as string) ?? defaultForm.nascimento,
        estadoCivil: Number(maritalId) || defaultForm.estadoCivil,
        cpf: (data.cpf as string) ?? defaultForm.cpf,
        rg: (data.rg as string) ?? defaultForm.rg,
        nomeMae: (data.mother_name as string) ?? defaultForm.nomeMae,
        email: (data.email as string) ?? defaultForm.email,
        celular: (data.mobile_phone as string) ?? defaultForm.celular,
        telRecado: (data.reference_phone as string) ?? defaultForm.telRecado,
        responsavelRecado:
          (data.reference_responsible as string) ??
          defaultForm.responsavelRecado,
        situacaoBeneficio: Number(situationId) || defaultForm.situacaoBeneficio,
        beneficioPretendido:
          Number(benefitId) || defaultForm.beneficioPretendido,
        numBeneficiario:
          (data.benefit_number as string) ?? defaultForm.numBeneficiario,
        nitPis: (data.nit_pis as string) ?? defaultForm.nitPis,
        profissao: (data.profession as string) ?? defaultForm.profissao,
        ctps: (data.ctps as string) ?? defaultForm.ctps,
        serie: (data.ctps_series as string) ?? defaultForm.serie,
        senhaInss: (data.inss_password as string) ?? defaultForm.senhaInss,
        tempoContribuicao:
          typeof data.contribution_time !== "undefined" &&
          data.contribution_time !== null
            ? String(data.contribution_time)
            : defaultForm.tempoContribuicao,
        isento:
          typeof data.non_billable === "boolean"
            ? data.non_billable
            : defaultForm.isento,
      } as typeof form;

      setForm(mapped);
      setOriginalForm(mapped);
    } catch (err: unknown) {
      console.error("DetailsClientModal GET error:", err);
      const e = err as {
        message?: string;
        response?: { data?: { message?: string } };
      };
      setError(
        e?.message || (e?.response?.data?.message ?? "Erro desconhecido")
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
        endpoints.CLIENTS.CLIENT_BY_ID(clientId),
        payload
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
  const defaultForm = React.useMemo(
    () => ({
      nome: "",
      nascimento: "",
      estadoCivil: 0,
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
    }),
    []
  );

  const handleCancelEdit = () => {
    setIsEditing(false);
    setForm(defaultForm);
  };

  // Ensure editing is cancelled when modal closes
  const handleClose = () => {
    setIsEditing(false);
    if (originalForm)
      setForm(
        (f) =>
          ({ ...f, ...(originalForm as Partial<typeof form>) } as typeof form)
      );
    onClose();
  };

  // Fetch client by id when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (!clientId) return;
    console.debug("DetailsClientModal open - clientId:", clientId);
    setLoading(true);
    setError("");
    // reset to empty while loading
    setForm(defaultForm);

    const findOptionIdByLabel = (
      opts: { id: number; label: string }[],
      label?: string | number | null
    ) => {
      if (label === undefined || label === null || label === "") return 0;
      if (typeof label === "number") return label;
      const found = opts.find(
        (o) => o.label.toLowerCase() === String(label).toLowerCase()
      );
      return found ? Number(found.id) : 0;
    };

    const url = endpoints.CLIENTS.CLIENT_BY_ID(clientId);
    console.debug("DetailsClientModal GET ->", url);

    axiosInstance
      .get(url)
      .then((res) => {
        console.debug("DetailsClientModal GET response:", res?.data);
        const data: Partial<ClientResponse> = res.data;

        const getNumberField = (
          obj: Partial<ClientResponse> | null | undefined,
          key: string
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

        const maritalId =
          getNumberField(data, "marital_status_id") ??
          findOptionIdByLabel(
            MaritalStatusOptions,
            data?.marital_status_name
          ) ??
          defaultForm.estadoCivil;
        const situationId =
          getNumberField(data, "situation_id") ??
          findOptionIdByLabel(RetirementTypeOptions, data?.situation_status) ??
          defaultForm.situacaoBeneficio;
        const benefitId =
          getNumberField(data, "benefit_id") ??
          findOptionIdByLabel(IntendedBenefitOptions, data?.benefit_type) ??
          defaultForm.beneficioPretendido;

        const mapped = {
          nome: (data.full_name as string) ?? defaultForm.nome,
          nascimento: (data.birth_date as string) ?? defaultForm.nascimento,
          estadoCivil: Number(maritalId) || defaultForm.estadoCivil,
          cpf: (data.cpf as string) ?? defaultForm.cpf,
          rg: (data.rg as string) ?? defaultForm.rg,
          nomeMae: (data.mother_name as string) ?? defaultForm.nomeMae,
          email: (data.email as string) ?? defaultForm.email,
          celular: (data.mobile_phone as string) ?? defaultForm.celular,
          telRecado: (data.reference_phone as string) ?? defaultForm.telRecado,
          responsavelRecado:
            (data.reference_responsible as string) ??
            defaultForm.responsavelRecado,
          situacaoBeneficio:
            Number(situationId) || defaultForm.situacaoBeneficio,
          beneficioPretendido:
            Number(benefitId) || defaultForm.beneficioPretendido,
          numBeneficiario:
            (data.benefit_number as string) ?? defaultForm.numBeneficiario,
          nitPis: (data.nit_pis as string) ?? defaultForm.nitPis,
          profissao: (data.profession as string) ?? defaultForm.profissao,
          ctps: (data.ctps as string) ?? defaultForm.ctps,
          serie: (data.ctps_series as string) ?? defaultForm.serie,
          senhaInss: (data.inss_password as string) ?? defaultForm.senhaInss,
          tempoContribuicao:
            typeof data.contribution_time !== "undefined" &&
            data.contribution_time !== null
              ? String(data.contribution_time)
              : defaultForm.tempoContribuicao,
          isento:
            typeof data.non_billable === "boolean"
              ? data.non_billable
              : defaultForm.isento,
        } as typeof form;

        setForm(mapped);
        setOriginalForm(mapped as Record<string, unknown>);
      })
      .catch((err: unknown) => {
        console.error("DetailsClientModal GET error:", err);
        const e = err as {
          message?: string;
          response?: { data?: { message?: string } };
        };
        setError(
          e?.message || (e?.response?.data?.message ?? "Erro desconhecido")
        );
      })
      .finally(() => setLoading(false));
  }, [isOpen, clientId, defaultForm]);

  // ...existing code...
  return (
    <Modal
      size="5xl"
      backdrop="blur"
      isOpen={isOpen}
      onClose={handleClose}
      hideCloseButton={false}
      className="bg-[#F4F4F5] min-h-[80vh] max-w-[1600px]"
    >
      <ModalContent>
        {() => (
          <>
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
                    <p className="mt-1 text-white font-light">35 anos</p>
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
                          }}
                          radius="md"
                          isReadOnly={!isEditing}
                          value={form.nascimento}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              nascimento: e.target.value,
                            }))
                          }
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
                        </div>
                        <Input
                          label="CPF"
                          variant="flat"
                          size="lg"
                          classNames={{
                            label: "!text-secondary",
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            {RetirementTypeOptions.map((opt) => (
                              <SelectItem key={String(opt.id)}>
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
                            {IntendedBenefitOptions.map((opt) => (
                              <SelectItem key={String(opt.id)}>
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                            input: isEditing
                              ? "!text-gray-100"
                              : "!text-gray-400",
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
                  </div>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
