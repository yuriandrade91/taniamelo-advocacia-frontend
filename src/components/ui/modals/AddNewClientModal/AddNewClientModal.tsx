"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button, Modal, Spinner } from "@heroui/react";
import { Field, SelectField } from "@/components/ui/form/Field";

import { createClient } from "@/services/clientService";
import type { ClientCreateRequest } from "@/interfaces/client/Client.interface";
import NotBillableSwitch from "@/components/ui/NotBillableSwitch/NotBillableSwitch";

import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import { IntendedBenefitOptions } from "@/enums/benefit/Benefits";
import {
  SituationOptions,
  RetirementTypeOptions,
} from "@/enums/situation/Situation";

import {
  maskCPF,
  maskEmail,
  maskCelular,
  maskTelefone,
  maskNIT,
  maskCTPS,
} from "@/lib/masks/masks";

import type { Clients } from "@/interfaces/Clients.interface";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";

// ─── Constants ───────────────────────────────────────────────

const GENDER_OPTIONS = [
  { key: "Masculino", label: "Masculino" },
  { key: "Feminino", label: "Feminino" },
] as const;

const INITIAL_FORM = {
  nome: "",
  nascimento: "",
  estadoCivil: "",
  genero: "",
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
  tempoContribuicao: "",
};

type FormState = Record<keyof typeof INITIAL_FORM, string>;

const REQUIRED_FIELDS: (keyof FormState)[] = [
  "nome",
  "nascimento",
  "genero",
  "cpf",
  "celular",
  "nomeMae",
  "beneficioPretendido",
  "situacaoBeneficio",
  "senhaInss",
];

// ─── Helpers ─────────────────────────────────────────────────

const digits = (v: string) => v.replace(/\D+/g, "");

const labelAt = <T extends { label: string }>(
  options: readonly T[],
  oneBasedIndex: number,
): string | undefined => options[oneBasedIndex - 1]?.label;

const filled = (v: string) => v.trim().length > 0;

/** Placeholder map — garante artigo correto: "Digite o CPF", "Digite a profissão" etc. */
const PLACEHOLDERS: Partial<Record<keyof typeof INITIAL_FORM, string>> = {
  nome: "Digite o nome completo",
  nascimento: "dd/mm/aaaa",
  cpf: "Digite o CPF",
  rg: "Digite o RG",
  nomeMae: "Digite o nome da mãe",
  email: "Digite o e-mail",
  celular: "Digite o celular",
  telRecado: "Digite o telefone de recado",
  responsavelRecado: "Digite o responsável",
  numBeneficiario: "Digite o número do beneficiário",
  nitPis: "Digite o NIT/PIS",
  profissao: "Digite a profissão",
  ctps: "Digite o número da CTPS",
  serie: "Digite a série da CTPS",
  senhaInss: "Digite a senha do INSS",
  tempoContribuicao: "Digite o tempo de contribuição",
};

// ─── Props ───────────────────────────────────────────────────

type AddNewClientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
};

// ─── Component ───────────────────────────────────────────────

const AddNewClientModal: React.FC<AddNewClientModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [touched, setTouched] = useState<Set<keyof FormState>>(new Set());
  const [nonBillable, setNonBillable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setForm({ ...INITIAL_FORM });
      setTouched(new Set());
      setNonBillable(false);
    }
  }, [isOpen]);

  // ── Field handlers ──

  const set = useCallback(
    (field: keyof FormState, value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const touch = useCallback(
    (field: keyof FormState) =>
      setTouched((prev) => new Set(prev).add(field)),
    [],
  );

  const onSelect = useCallback(
    (field: keyof FormState, keys: "all" | Set<React.Key>) => {
      const value = String(Array.from(keys as Iterable<React.Key>)[0] ?? "");
      set(field, value);
      touch(field);
    },
    [set, touch],
  );

  // ── Validation ──

  const isFormValid = useCallback((): boolean => {
    return (
      filled(form.nome) &&
      filled(form.nascimento) &&
      filled(form.genero) &&
      digits(form.cpf).length >= 11 &&
      digits(form.celular).length > 0 &&
      filled(form.nomeMae) &&
      Number(form.beneficioPretendido) > 0 &&
      Number(form.situacaoBeneficio) > 0 &&
      filled(form.senhaInss)
    );
  }, [form]);

  const showError = (field: keyof FormState, msg: string) =>
    touched.has(field) ? msg : "";

  // ── Submit ──

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isFormValid()) {
      setTouched(new Set(REQUIRED_FIELDS));
      return;
    }

    const bi = Number(form.beneficioPretendido);
    const si = Number(form.situacaoBeneficio);
    const mi = Number(form.estadoCivil);

    const raw: Record<string, unknown> = {
      fullName: form.nome,
      birthDate: form.nascimento,
      cpf: form.cpf,
      motherName: form.nomeMae,
      mobilePhone: form.celular,
      inssPassword: form.senhaInss,
      gender: form.genero || undefined,
      rg: form.rg || undefined,
      email: form.email || undefined,
      referencePhone: form.telRecado || undefined,
      referenceResponsible: form.responsavelRecado || undefined,
      maritalStatus: labelAt(MaritalStatusOptions, mi),
      benefit: labelAt(IntendedBenefitOptions, bi),
      situation: labelAt(SituationOptions, si),
      beneficiaryNumber: form.numBeneficiario || undefined,
      nitPis: form.nitPis || undefined,
      profession: form.profissao || undefined,
      ctps: form.ctps || undefined,
      ctpsSeries: form.serie || undefined,
      contributionTime: form.tempoContribuicao || undefined,
      // O backend espera `notBillable` (ClientCreateRequestDTO), não `nonBillable`.
      notBillable: nonBillable,
    };

    const body = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined),
    ) as unknown as ClientCreateRequest;

    setSubmitting(true);

    // POST /api/v1/clients — os enums vão como label (o backend aceita label ou nome).
    createClient(body)
      .then(() => {
        onConfirm?.();
        onClose();
      })
      .catch((err) => console.error("Erro ao adicionar cliente:", err))
      .finally(() => setSubmitting(false));
  };

  // ── Input factory ──

  const inputProps = (
    field: keyof FormState,
    label: string,
    opts?: {
      required?: boolean;
      mask?: (v: string) => string;
      maxLength?: number;
      type?: string;
      minW?: string;
      placeholder?: string;
    },
  ) => {
    const {
      required = false,
      mask,
      maxLength,
      type,
      minW = "180px",
      placeholder,
    } = opts ?? {};

    const value = form[field];
    const invalid = required && touched.has(field) && !filled(value);

    return {
      label,
      placeholder: placeholder ?? PLACEHOLDERS[field] ?? "Digite " + label.toLowerCase(),
      className: `min-w-[${minW}]`,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        set(field, mask ? mask(e.target.value) : e.target.value),
      ...(required && {
        isRequired: true,
        onBlur: () => touch(field),
        isInvalid: invalid,
        errorMessage: invalid ? `${label} é obrigatório(a)` : "",
      }),
      ...(maxLength && { maxLength }),
      ...(type && { type }),
    };
  };

  // ── JSX ──

  return (
    <Modal>
      <Modal.Backdrop
        variant="blur"
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <Modal.Container size="cover">
          <Modal.Dialog className="bg-[#F4F4F5] min-h-[80vh] max-w-[1440px]">
          <form onSubmit={handleSubmit}>
            <Modal.Header className="relative mt-6">
              <div className="flex flex-col p-8 w-full bg-primary rounded-2xl gap-4">
                <div className="flex items-center justify-between w-full">
                  <h1 className="text-4xl text-white">Cadastro de cliente</h1>
                  <p className="absolute mt-14 top-auto w-24 border-b-4 border-solid border-secondary" />
                </div>
              </div>
            </Modal.Header>

            <Modal.Body>
              {/* ── Dados pessoais ── */}
              <section className="bg-white flex flex-col rounded-2xl">
                <SectionTitle icon="../svg/icons/profile.svg" title="Dados pessoais" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full p-4">
                  <Field {...inputProps("nome", "Nome completo", { required: true, minW: "240px" })} />
                  <Field {...inputProps("nascimento", "Data de nascimento", { required: true, type: "date", placeholder: "dd/mm/aaaa" })} />

                  <SelectField
                    label="Gênero"
                    placeholder="Selecione o gênero"
                    className="min-w-[180px]"
                    options={GENDER_OPTIONS.map((g) => ({ id: g.key, label: g.label }))}
                    selectedKey={form.genero || null}
                    onSelectionChange={(key) => { set("genero", key); touch("genero"); }}
                    isRequired
                    isInvalid={!!showError("genero", "")}
                    errorMessage={showError("genero", "Gênero é obrigatório(a)")}
                  />

                  <SelectField
                    label="Estado civil"
                    placeholder="Selecione o estado civil"
                    className="min-w-[180px]"
                    options={MaritalStatusOptions.map((o, i) => ({ id: String(i + 1), label: o.label }))}
                    selectedKey={form.estadoCivil || null}
                    onSelectionChange={(key) => { set("estadoCivil", key); touch("estadoCivil"); }}
                  />

                  <Field {...inputProps("cpf", "CPF", { required: true, mask: maskCPF, maxLength: 14 })} />
                  <Field {...inputProps("rg", "RG")} />
                  <Field {...inputProps("nomeMae", "Nome da mãe", { required: true, minW: "240px" })} />
                  <Field
                    {...inputProps("email", "E-mail", { mask: maskEmail, type: "email", minW: "240px" })}
                  />
                  <Field {...inputProps("celular", "Celular", { required: true, mask: maskCelular, maxLength: 15 })} />
                  <Field {...inputProps("telRecado", "Telefone recado", { mask: maskTelefone, maxLength: 15 })} />
                  <Field {...inputProps("responsavelRecado", "Responsável pelo recado")} />

                  <SelectField
                    label="Situação do benefício"
                    placeholder="Selecione a situação"
                    className="min-w-[220px]"
                    options={SituationOptions.map((o, i) => ({ id: String(i + 1), label: o.label }))}
                    selectedKey={form.situacaoBeneficio || null}
                    onSelectionChange={(key) => { set("situacaoBeneficio", key); touch("situacaoBeneficio"); }}
                    isRequired
                    isInvalid={!!showError("situacaoBeneficio", "")}
                    errorMessage={showError("situacaoBeneficio", "Situação do benefício é obrigatório(a)")}
                  />
                </div>
              </section>

              {/* ── Dados profissionais ── */}
              <section className="bg-white flex flex-col rounded-2xl mb-4">
                <SectionTitle icon="../svg/icons/user_id.svg" title="Dados profissionais" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full p-4">
                  <SelectField
                    label="Benefício pretendido"
                    placeholder="Selecione o benefício"
                    className="min-w-[260px]"
                    options={IntendedBenefitOptions.map((o, i) => ({ id: String(i + 1), label: o.label }))}
                    selectedKey={form.beneficioPretendido || null}
                    onSelectionChange={(key) => { set("beneficioPretendido", key); touch("beneficioPretendido"); }}
                    isRequired
                    isInvalid={!!showError("beneficioPretendido", "")}
                    errorMessage={showError("beneficioPretendido", "Benefício pretendido é obrigatório(a)")}
                  />

                  <Field {...inputProps("numBeneficiario", "Nº do beneficiário")} />
                  <Field {...inputProps("nitPis", "NIT/PIS", { mask: maskNIT, maxLength: 13 })} />
                  <Field {...inputProps("profissao", "Profissão")} />
                  <Field {...inputProps("ctps", "CTPS", { mask: maskCTPS })} />
                  <Field {...inputProps("serie", "Série")} />
                  <Field {...inputProps("senhaInss", "Senha \"meu inss\"", { required: true })} />
                  <Field {...inputProps("tempoContribuicao", "Tempo de contribuição")} />
                </div>
              </section>

              {/* ── Footer ── */}
              <div className="flex justify-between items-center gap-5 pb-6 px-6">
                <NotBillableSwitch value={nonBillable} onChange={setNonBillable} />
                <div className="flex gap-3">
                  <Button className="text-primary" variant="ghost" type="button" onPress={onClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={submitting || !isFormValid()}>
                    {submitting ? (
                      <>
                        Salvando… <Spinner color="current" />
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default AddNewClientModal;

// ─── Internal sub-component ──────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 p-4">
      <Image src={icon} alt="" height={24} width={24} />
      <h3 className="text-xl font-semibold text-secondary">{title}</h3>
    </div>
  );
}
