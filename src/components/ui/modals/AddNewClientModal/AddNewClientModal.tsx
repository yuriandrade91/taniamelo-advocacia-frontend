import React, { useState, useEffect } from "react";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
// import ExemptFromServiceSwitch from "@/components/exemptFromServiceSwitch/exemptFromServiceSwitch";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { Spinner } from "@heroui/spinner";
import Image from "next/image";
import {
  maskCPF,
  maskRG,
  maskEmail,
  maskCelular,
  maskTelefone,
  maskNIT,
  maskCTPS,
} from "../../../../lib/masks/masks";
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import { IntendedBenefitOptions } from "@/enums/benefit/benefits";
import { RetirementTypeOptions } from "@/enums/situation/Situation";

const initialForm = {
  nome: "",
  nascimento: "",
  estadoCivil: null,
  cpf: "",
  rg: "",
  nomeMae: "",
  email: "",
  celular: "",
  telRecado: "",
  responsavelRecado: "",
  situacaoBeneficio: null,
  beneficioPretendido: null,
  numBeneficiario: "",
  nitPis: "",
  profissao: "",
  ctps: "",
  serie: "",
  senhaInss: "",
  tempoContribuicao: "",
};

type AddNewClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  clientId?: number;
};
import axiosInstance from "@/services/axiosService";
import endpoints from "@/constants/endpoints/paths";
import { ClientRequest } from "@/interfaces/client/Request/ClientResquest.interface";

type FormFields = typeof initialForm;

const AddNewClientModal: React.FC<AddNewClientModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [form, setForm] = useState<FormFields>({ ...initialForm });
  const [isento, setIsento] = useState<boolean>(false);
  const onlyDigits = (v?: string | number) => {
    if (v === undefined || v === null) return "";
    return String(v).replace(/\D+/g, "");
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({ ...initialForm });
      setIsento(false);
    }
  }, [isOpen]);

  const handleFieldChange = (
    field: keyof FormFields,
    value: string | number
  ) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSwitchChange = (value: boolean) => {
    setIsento(value);
  };

  // const payload = {
  //   ...form,
  //   isento,
  // };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: Partial<ClientRequest> = {
      full_name: form.nome,
      birth_date: form.nascimento,
      marital_status_id: form.estadoCivil
        ? Number(form.estadoCivil)
        : undefined,
      cpf: onlyDigits(form.cpf),
      rg: onlyDigits(form.rg),
      mother_name: form.nomeMae,
      email: form.email,
      mobile_phone: onlyDigits(form.celular),
      reference_phone: onlyDigits(form.telRecado),
      reference_responsible: form.responsavelRecado,
      benefit_id: form.situacaoBeneficio
        ? Number(form.situacaoBeneficio)
        : undefined,
      situation_id: form.beneficioPretendido
        ? Number(form.beneficioPretendido)
        : undefined,
      benefit_number: onlyDigits(form.numBeneficiario),
      nit_pis: onlyDigits(form.nitPis),
      profession: form.profissao,
      ctps: onlyDigits(form.ctps),
      ctps_series: onlyDigits(form.serie),
      inss_password: form.senhaInss,
      contribution_time: form.tempoContribuicao
        ? Number(form.tempoContribuicao)
        : undefined,
      non_billable: isento,
      created_by: undefined,
    };

    setIsSubmitting(true);
    axiosInstance
      .post(endpoints.CLIENTS.URL_CLIENTS, payload)
      .then(() => {
        onConfirm?.();
        onClose();
      })
      .catch((err) => {
        console.error("Erro ao adicionar cliente:", err);
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <Modal
      size="5xl"
      backdrop="blur"
      isOpen={isOpen}
      onClose={onClose}
      hideCloseButton={false}
      className="bg-[#F4F4F5] min-h-[80vh] max-w-[1440px]"
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="relative">
            <div className="flex flex-col p-8 w-full bg-primary rounded-2xl gap-4">
              <div className="flex items-center justify-between w-full">
                <h1 className="text-4xl text-white">Cadastro de cliente</h1>
                <p className="absolute mt-14 top-auto w-24 border-b-4 border-solid border-secondary" />
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            {/* Dados pessoais */}
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
                  placeholder="Digite o nome completo"
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  isInvalid={!form.nome}
                  errorMessage={!form.nome ? "Nome é obrigatório" : ""}
                  className="min-w-[240px]"
                />
                <Input
                  label="Data de nascimento"
                  placeholder="dd/mm/aaaa"
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.nascimento}
                  onChange={(e) =>
                    handleFieldChange("nascimento", e.target.value)
                  }
                  isInvalid={!form.nascimento}
                  errorMessage={
                    !form.nascimento ? "Data de nascimento é obrigatória" : ""
                  }
                  className="min-w-[180px]"
                />
                <Select
                  label="Estado civil"
                  size="lg"
                  variant="flat"
                  placeholder="Selecione o estado civil"
                  radius="md"
                  selectedKeys={
                    form.estadoCivil ? [String(form.estadoCivil)] : []
                  }
                  onSelectionChange={(keys) => {
                    const value = String(Array.from(keys)[0] ?? "");
                    handleFieldChange("estadoCivil", Number(value));
                  }}
                  classNames={{
                    label: "!text-secondary",
                    value: "!text-gray-100",
                  }}
                  className="min-w-[180px]"
                >
                  {MaritalStatusOptions.map((opt) => (
                    <SelectItem key={String(opt.id)}>{opt.label}</SelectItem>
                  ))}
                </Select>
                <Input
                  label="CPF"
                  placeholder="Digite o CPF"
                  maxLength={14}
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.cpf}
                  onChange={(e) =>
                    setForm({ ...form, cpf: maskCPF(e.target.value) })
                  }
                  isInvalid={!form.cpf}
                  errorMessage={!form.cpf ? "CPF é obrigatório" : ""}
                  className="min-w-[180px]"
                />
                <Input
                  label="RG"
                  placeholder="Digite o RG"
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.rg}
                  onChange={(e) =>
                    handleFieldChange("rg", maskRG(e.target.value))
                  }
                  className="min-w-[180px]"
                />
                <Input
                  label="Nome da mãe"
                  placeholder="Digite o nome da mãe"
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.nomeMae}
                  onChange={(e) => handleFieldChange("nomeMae", e.target.value)}
                  className="min-w-[240px]"
                />
                <Input
                  label="E-mail"
                  placeholder="Digite o e-mail"
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.email}
                  onChange={(e) =>
                    handleFieldChange("email", maskEmail(e.target.value))
                  }
                  className="min-w-[240px]"
                />
                <Input
                  label="Celular"
                  placeholder="Digite o celular"
                  maxLength={15}
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.celular}
                  onChange={(e) =>
                    setForm({ ...form, celular: maskCelular(e.target.value) })
                  }
                  isInvalid={!form.celular}
                  errorMessage={!form.celular ? "Celular é obrigatório" : ""}
                  className="min-w-[180px]"
                />
                <Input
                  label="Telefone recado"
                  placeholder="Digite o telefone de recado"
                  maxLength={15}
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.telRecado}
                  onChange={(e) =>
                    handleFieldChange("telRecado", maskTelefone(e.target.value))
                  }
                  className="min-w-[180px]"
                />
                <Input
                  label="Responsável pelo recado"
                  placeholder="Digite o responsável"
                  variant="flat"
                  size="lg"
                  classNames={{
                    label: "!text-secondary",
                    input: "!text-gray-100",
                  }}
                  radius="md"
                  value={form.responsavelRecado}
                  onChange={(e) =>
                    handleFieldChange("responsavelRecado", e.target.value)
                  }
                  className="min-w-[180px]"
                />
                <Select
                  label="Situação do benefício"
                  size="lg"
                  variant="flat"
                  radius="md"
                  placeholder="Selecione a situação"
                  selectedKeys={
                    form.situacaoBeneficio
                      ? [String(form.situacaoBeneficio)]
                      : []
                  }
                  onSelectionChange={(keys) => {
                    const value = String(Array.from(keys)[0] ?? "");
                    handleFieldChange("situacaoBeneficio", Number(value));
                  }}
                  classNames={{
                    label: "!text-secondary",
                    value: "!text-gray-100",
                  }}
                  className="min-w-[240px]"
                >
                  {RetirementTypeOptions.map((opt) => (
                    <SelectItem key={String(opt.id)}>{opt.label}</SelectItem>
                  ))}
                </Select>
              </div>
            </div>
            {/* Dados profissionais */}
            <div className="bg-white flex flex-col rounded-2xl mb-4">
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
                    className="min-w-80"
                    label="Benefício pretendido"
                    size="lg"
                    variant="flat"
                    radius="md"
                    placeholder="Selecione o benefício"
                    selectedKeys={
                      form.beneficioPretendido
                        ? [String(form.beneficioPretendido)]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const value = String(Array.from(keys)[0] ?? "");
                      handleFieldChange("beneficioPretendido", Number(value));
                    }}
                    classNames={{
                      label: "!text-secondary",
                      value: "!text-gray-100",
                    }}
                  >
                    {IntendedBenefitOptions.map((opt) => (
                      <SelectItem key={String(opt.id)}>{opt.label}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Nº do beneficiário"
                    placeholder="Digite o número do beneficiário"
                    variant="flat"
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    value={form.numBeneficiario}
                    onChange={(e) =>
                      handleFieldChange("numBeneficiario", e.target.value)
                    }
                    className="min-w-[180px]"
                  />
                  <Input
                    label="NIT/PIS"
                    placeholder="Digite o NIT/PIS"
                    variant="flat"
                    maxLength={13}
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    value={form.nitPis}
                    onChange={(e) =>
                      handleFieldChange("nitPis", maskNIT(e.target.value))
                    }
                    className="min-w-[180px]"
                  />
                  <Input
                    label="Profissão"
                    placeholder="Digite a profissão"
                    variant="flat"
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    value={form.profissao}
                    onChange={(e) =>
                      handleFieldChange("profissao", e.target.value)
                    }
                    className="min-w-[180px]"
                  />
                  <Input
                    label="CTPS"
                    placeholder="Digite o número da CTPS"
                    variant="flat"
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    value={form.ctps}
                    onChange={(e) =>
                      handleFieldChange("ctps", maskCTPS(e.target.value))
                    }
                    className="min-w-[180px]"
                  />
                  <Input
                    label="Série"
                    placeholder="Digite a série da CTPS"
                    variant="flat"
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    value={form.serie}
                    onChange={(e) => handleFieldChange("serie", e.target.value)}
                    className="min-w-[180px]"
                  />
                  <Input
                    label='Senha "meu inss"'
                    placeholder="Digite a senha do INSS"
                    variant="flat"
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    type="text"
                    value={form.senhaInss}
                    onChange={(e) =>
                      handleFieldChange("senhaInss", e.target.value)
                    }
                    className="min-w-[180px]"
                  />
                  <Input
                    label="Tempo de contribuição"
                    placeholder="Digite o tempo de contribuição"
                    variant="flat"
                    size="lg"
                    classNames={{
                      label: "!text-secondary",
                      input: "!text-gray-100",
                    }}
                    radius="md"
                    value={form.tempoContribuicao}
                    onChange={(e) =>
                      handleFieldChange("tempoContribuicao", e.target.value)
                    }
                    className="min-w-[180px]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-5 pb-6 px-6">
              {/* <ExemptFromServiceSwitch
                value={isento}
                onChange={handleSwitchChange}
              /> */}

              <div className="flex gap-3 justify-end self-end">
                <Button
                  className="text-primary"
                  variant="light"
                  size="md"
                  onPress={onClose}
                  type="button"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="solid"
                  color="primary"
                  isDisabled={
                    isSubmitting ||
                    !form.nome ||
                    !form.nascimento ||
                    !form.cpf ||
                    !form.celular
                  }
                >
                  {isSubmitting ? (
                    <>
                      Salvando...{" "}
                      <Spinner variant="gradient" color="default" size="sm" />
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </ModalBody>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AddNewClientModal;
