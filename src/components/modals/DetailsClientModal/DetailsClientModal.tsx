import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader
} from "@heroui/modal";
import { CircularProgress } from "@heroui/progress";
import Image from "next/image";

interface DeleteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  onConfirm?: () => void;
  editOnOpen?: boolean;
}

import React, { useState, useEffect } from "react";
import { Select, SelectItem } from "@heroui/select";
import DeleteClientModal from "../DeleteClientModal/DeleteClientModal";

export default function DetailsClientModal({
  isOpen,
  onClose,
  clientName,
  onConfirm,
  editOnOpen = false,
}: DeleteClientModalProps) {
  // Local state for edit and delete modal logic
  const [isEditing, setIsEditing] = useState(false);
  // Habilita edição automaticamente se editOnOpen for true
  useEffect(() => {
    if (isOpen && editOnOpen) {
      setIsEditing(true);
    }
  }, [isOpen, editOnOpen]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Controlled state for all input fields
  const [form, setForm] = useState({
    // Dados pessoais
    nome: "Ana Paula Silva",
    nascimento: "1990-01-01",
    estadoCivil: "Solteira",
    cpf: "123.456.789-00",
    rg: "12.345.678-9",
    nomeMae: "Maria Silva",
    email: "trmello@gmail.com",
    celular: "(11) 91234-5678",
    telRecado: "(11) 3344-5566",
    responsavelRecado: "João Silva",
    situacaoBeneficio: "Benefício concluído",
    // Dados profissionais
    beneficioPretendido: "Aposentadoria por tempo de contribuição do professor",
    numBeneficiario: "1234567890",
    nitPis: "123.45678.90-1",
    profissao: "Auxiliar Administrativo",
    ctps: "1234567",
    serie: "001",
    senhaInss: "senha123",
    tempoContribuicao: "15 anos, 3 meses",
  });

  // Calcula o progresso com base nos campos preenchidos
  const totalFields = Object.keys(form).length;
  const filledFields = Object.values(form).filter(
    v => typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null
  ).length;
  const progress = Math.round((filledFields / totalFields) * 100);

  const handleSave = () => {
    setIsEditing(false);
    // Add save logic here if needed
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setForm({
      // Dados pessoais
      nome: "Ana Paula Silva",
      nascimento: "1990-01-01",
      estadoCivil: "Solteira",
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
      nomeMae: "Maria Silva",
      email: "trmello@gmail.com",
      celular: "(11) 91234-5678",
      telRecado: "(11) 3344-5566",
      responsavelRecado: "João Silva",
      situacaoBeneficio: "Benefício concluído",
      // Dados profissionais
      beneficioPretendido: "Aposentadoria por tempo de contribuição do professor",
      numBeneficiario: "1234567890",
      nitPis: "123.45678.90-1",
      profissao: "Auxiliar Administrativo",
      ctps: "1234567",
      serie: "001",
      senhaInss: "senha123",
      tempoContribuicao: "15 anos, 3 meses",
    });
  };

  // Ensure editing is cancelled when modal closes
  const handleClose = () => {
    setIsEditing(false);
    setForm({
      // Dados pessoais
      nome: "Ana Paula Silva",
      nascimento: "1990-01-01",
      estadoCivil: "Solteira",
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
      nomeMae: "Maria Silva",
      email: "trmello@gmail.com",
      celular: "(11) 91234-5678",
      telRecado: "(11) 3344-5566",
      responsavelRecado: "João Silva",
      situacaoBeneficio: "Benefício concluído",
      // Dados profissionais
      beneficioPretendido: "Aposentadoria por tempo de contribuição do professor",
      numBeneficiario: "1234567890",
      nitPis: "123.45678.90-1",
      profissao: "Auxiliar Administrativo",
      ctps: "1234567",
      serie: "001",
      senhaInss: "senha123",
      tempoContribuicao: "15 anos, 3 meses",
    });
    onClose();
  };

  // ...existing code...
  return (
    <Modal size="5xl" backdrop="blur" isOpen={isOpen} onClose={handleClose} hideCloseButton={false} className="bg-[#F4F4F5] min-h-[80vh] max-w-[1600px]">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="relative mt-6">
              <div className="flex p-4 h-auto w-full bg-primary rounded-2xl gap-24" >
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
                  <p className="text-sm text-white font-light">Preenchimento do cadastro</p>
                </div>

                <div className="w-auto grid grid-rows-2 gap-4">
                  <h3 className="max-w-[600px] text-white text-[32px] font-medium leading-10">
                    {clientName}
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
                      <p className="text-base font-normal text-secondary">Aposentadoria por tempo de contribuição do professor</p>
                    </div>
                    <div className="w-auto px-3 py-1 rounded-full bg-success/25">
                      <p className="text-base font-normal text-success">Benefício concluído</p>
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
                        trmello@gmail.com
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
                        (11) 91234-5678
                      </p>
                    </div><div className="flex gap-1">
                      <Image
                        src="../../svg/icons/phone.svg"
                        alt="Logo"
                        height={24}
                        width={24}
                      />
                      <p className="text-base font-light text-white ml-2">
                        (11) 91234-5678
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

                  {typeof isEditing !== 'undefined' && typeof setIsEditing === 'function' && typeof handleSave === 'function' ? (
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
                    onConfirm={onConfirm}
                  />
                )}
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-[2fr_.8fr] gap-4 py-4">
                <div className="grid grid-rows-2 gap-2 w-full">
                  <div className="bg-white flex flex-col rounded-2xl">
                    <div className="flex items-center gap-2 p-4">
                      <Image
                        src="../svg/icons/profile.svg"
                        alt="Logo"
                        height={24}
                        width={24}
                      />
                      <h3 className="text-xl font-semibold text-secondary">Dados pessoais</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 p-4 w-full">
                      <Input
                        label="Nome completo"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.nome}
                        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                        className="flex-1 min-w-[280px]"
                      />
                      <Input
                        label="Data de nascimento"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.nascimento}
                        onChange={e => setForm(f => ({ ...f, nascimento: e.target.value }))}
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
                          selectedKeys={[form.estadoCivil]}
                          onSelectionChange={(keys) => setForm(f => ({ ...f, estadoCivil: String(Array.isArray(keys) ? keys[6] : Array.from(keys)[0] ?? "") }))}
                          classNames={{ label: "!text-secondary", value: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        >
                          <SelectItem key="Solteira">Solteira</SelectItem>
                          <SelectItem key="Casada">Casada</SelectItem>
                          <SelectItem key="Divorciada">Divorciada</SelectItem>
                          <SelectItem key="Viúva">Viúva</SelectItem>
                          <SelectItem key="Separada">Separada</SelectItem>
                          <SelectItem key="União estável">União estável</SelectItem>
                        </Select>
                      </div>
                      <Input
                        label="CPF"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.cpf}
                        onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                        className="flex-1 min-w-[140px]"
                      />
                      <Input
                        label="RG"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.rg}
                        onChange={e => setForm(f => ({ ...f, rg: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="Nome da mãe"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.nomeMae}
                        onChange={e => setForm(f => ({ ...f, nomeMae: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="E-mail"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="Celular"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.celular}
                        onChange={e => setForm(f => ({ ...f, celular: e.target.value }))}
                        className="flex-1 min-w-[140px]"
                      />
                      <Input
                        label="Telefone recado"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.telRecado}
                        onChange={e => setForm(f => ({ ...f, telRecado: e.target.value }))}
                        className="flex-1 min-w-[140px]"
                      />
                      <Input
                        label="Responsável"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.responsavelRecado}
                        onChange={e => setForm(f => ({ ...f, responsavelRecado: e.target.value }))}
                        className="flex-1 min-w-[100px]"
                      />
                      <div className="flex-1 min-w-[180px]">
                        <Select
                          label="Situação do benefício"
                          size="lg"
                          variant="flat"
                          radius="md"
                          isDisabled={!isEditing}
                          selectedKeys={[form.situacaoBeneficio]}
                          onSelectionChange={(keys) => setForm(f => ({ ...f, situacaoBeneficio: String(Array.isArray(keys) ? keys[0] : Array.from(keys)[0] ?? "") }))}
                          classNames={{ label: "!text-secondary", value: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        >
                          <SelectItem key="Benefício concluído">Benefício concluído</SelectItem>
                          <SelectItem key="Em andamento">Em andamento</SelectItem>
                          <SelectItem key="Aguardando documentação">Aguardando documentação</SelectItem>
                          <SelectItem key="Aguardando INSS">Aguardando INSS</SelectItem>
                          <SelectItem key="Negado">Negado</SelectItem>
                          <SelectItem key="Cancelado">Cancelado</SelectItem>
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
                      <h3 className="text-xl font-semibold text-secondary">Dados profissionais</h3>
                    </div>

                    <div className="flex flex-wrap gap-4 p-4 w-full">
                      <div className="flex-1 min-w-auto">
                        <Select
                          label="Benefício pretendido"
                          size="lg"
                          variant="flat"
                          radius="md"
                          isDisabled={!isEditing}
                          selectedKeys={[form.beneficioPretendido]}
                          onSelectionChange={(keys) => setForm(f => ({ ...f, beneficioPretendido: String(Array.isArray(keys) ? keys[0] : Array.from(keys)[0] ?? "") }))}
                          classNames={{ label: "!text-secondary", value: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        >
                          <SelectItem key="Aposentadoria por tempo de contribuição do professor">Aposentadoria por tempo de contribuição do professor</SelectItem>
                          <SelectItem key="Aposentadoria por idade">Aposentadoria por idade</SelectItem>
                          <SelectItem key="Aposentadoria por invalidez">Aposentadoria por invalidez</SelectItem>
                          <SelectItem key="Aposentadoria especial">Aposentadoria especial</SelectItem>
                          <SelectItem key="Pensão por morte">Pensão por morte</SelectItem>
                          <SelectItem key="Auxílio-doença">Auxílio-doença</SelectItem>
                          <SelectItem key="Auxílio-acidente">Auxílio-acidente</SelectItem>
                          <SelectItem key="Salário-maternidade">Salário-maternidade</SelectItem>
                        </Select>
                      </div>
                      <Input
                        label="Nº do beneficiário"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.numBeneficiario}
                        onChange={e => setForm(f => ({ ...f, numBeneficiario: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="NIT/PIS"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.nitPis}
                        onChange={e => setForm(f => ({ ...f, nitPis: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="Profissão"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.profissao}
                        onChange={e => setForm(f => ({ ...f, profissao: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="CTPS"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.ctps}
                        onChange={e => setForm(f => ({ ...f, ctps: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="Série"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.serie}
                        onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label='Senha "meu inss"'
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        type="text"
                        value={form.senhaInss}
                        onChange={e => setForm(f => ({ ...f, senhaInss: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                      <Input
                        label="Tempo de contribuição"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary", input: isEditing ? "!text-gray-100" : "!text-gray-400" }}
                        radius="md"
                        isReadOnly={!isEditing}
                        value={form.tempoContribuicao}
                        onChange={e => setForm(f => ({ ...f, tempoContribuicao: e.target.value }))}
                        className="flex-1 min-w-[180px]"
                      />
                    </div>
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
                    <h3 className="text-xl font-semibold text-secondary">Histórico</h3>
                  </div>

                </div>

              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
