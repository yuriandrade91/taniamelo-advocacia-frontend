"use client";

import { useState } from "react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { GenderOptions } from "@/enums/gender/Gender";
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import { SituationOptions } from "@/enums/situation/Situation";
import {
  maskCelular,
  maskCEP,
  maskCPF,
  maskNIT,
  maskRG,
} from "@/lib/masks/masks";
import { genderEnding, qualificationText } from "./qualification";
import {
  InlineDate,
  InlineInput,
  InlineSelect,
  type FillModeProps,
} from "./shared";

/**
 * Modo "Petição viva": o cadastro é o parágrafo de qualificação da parte,
 * como numa petição inicial. Cada dado é uma lacuna no texto; o texto
 * concorda com o gênero enquanto se preenche ("nascida", "portadora") e sai
 * pronto para copiar para a peça.
 *
 * Edita os mesmos formulários das abas — trocar de modo não perde nada.
 */
export function PetitionMode(props: FillModeProps) {
  const { service, personal, professional, address, onBenefitChange } = props;
  const p = personal.values;
  const a = address.values;
  const g = genderEnding(p.gender);
  const [copied, setCopied] = useState(false);

  // Gênero e estado civil escritos como na frase ("do sexo feminino").
  const genderWords = GenderOptions.map((option) => ({
    value: option.value,
    label: option.label.toLowerCase(),
  }));
  const maritalWords = MaritalStatusOptions.map((option) => ({
    value: option.value,
    label: option.label
      .toLowerCase()
      .replace(
        "o(a)",
        p.gender === "FEMININO" ? "a" : p.gender === "MASCULINO" ? "o" : "o(a)",
      ),
  }));

  const text = qualificationText({
    ...p,
    profession: professional.values.profession,
    nitPis: professional.values.nitPis,
    street: a.street,
    addressNumber: a.addressNumber,
    neighborhood: a.neighborhood,
    city: a.city,
    state: a.state,
    zipCode: a.zipCode,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sem permissão de área de transferência: o botão só não confirma.
    }
  };

  const setP = personal.setField;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <article className="relative overflow-hidden rounded-3xl bg-white px-7 py-10 ring-1 ring-light-gray sm:px-16 sm:py-14">
        {/* Margem de folha de petição: filete dourado à esquerda. */}
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-6 w-px bg-secondary/30 sm:left-10"
        />

        <header className="mb-8 text-center">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-secondary uppercase">
            Tânia Melo · Advocacia Previdenciária
          </p>
          <h2 className="mt-3 font-serif text-2xl text-primary sm:text-3xl">
            Qualificação da parte
          </h2>
          <p className="mt-2 text-sm text-gray-100">
            Preencha as lacunas. O texto concorda com o gênero sozinho e sai
            pronto para a petição.
          </p>
        </header>

        <p className="font-serif text-[17px] leading-[2.6] text-gray-100 sm:text-lg sm:leading-[2.7]">
          <InlineInput
            label="Nome completo"
            placeholder="nome completo"
            value={p.fullName}
            onChange={(value) => setP("fullName", value)}
            missing
            className="uppercase"
          />
          ,{" "}
          <InlineInput
            label="Nacionalidade"
            placeholder="brasileira"
            value={p.nationality}
            onChange={(value) => setP("nationality", value)}
          />
          , do sexo{" "}
          <InlineSelect
            label="Gênero"
            placeholder="sexo"
            options={genderWords}
            value={p.gender}
            onChange={(value) => setP("gender", value)}
            missing
          />
          ,{" "}
          <InlineSelect
            label="Estado civil"
            placeholder="estado civil"
            options={maritalWords}
            value={p.maritalStatus}
            onChange={(value) => setP("maritalStatus", value)}
          />
          ,{" "}
          <InlineInput
            label="Profissão"
            placeholder="profissão"
            value={professional.values.profession}
            onChange={(value) => professional.setField("profession", value)}
          />
          , nascid{g} em{" "}
          <InlineDate
            label="Data de nascimento"
            value={p.birthDate}
            onChange={(value) => setP("birthDate", value)}
            missing
          />
          , filh{g} de{" "}
          <InlineInput
            label="Nome da mãe"
            placeholder="nome da mãe"
            value={p.motherName}
            onChange={(value) => setP("motherName", value)}
            missing
          />
          , inscrit{g} no CPF sob o nº{" "}
          <InlineInput
            label="CPF"
            placeholder="000.000.000-00"
            value={p.cpf}
            maxLength={14}
            onChange={(value) => setP("cpf", maskCPF(value))}
            missing
          />
          ,{" "}
          {p.gender === "FEMININO"
            ? "portadora"
            : p.gender === "MASCULINO"
              ? "portador"
              : "portador(a)"}{" "}
          do RG nº{" "}
          <InlineInput
            label="RG"
            placeholder="RG"
            value={p.rg}
            onChange={(value) => setP("rg", maskRG(value))}
          />{" "}
          <InlineInput
            label="Órgão emissor"
            placeholder="SSP/MG"
            value={p.rgIssuer}
            onChange={(value) => setP("rgIssuer", value)}
          />
          , NIT/PIS nº{" "}
          <InlineInput
            label="NIT/PIS"
            placeholder="000.00000.00-0"
            value={professional.values.nitPis}
            maxLength={14}
            onChange={(value) =>
              professional.setField("nitPis", maskNIT(value))
            }
          />
          , residente e domiciliad{g} na{" "}
          <InlineInput
            label="Logradouro"
            placeholder="rua"
            value={a.street}
            onChange={(value) => address.setField("street", value)}
          />
          , nº{" "}
          <InlineInput
            label="Número"
            placeholder="nº"
            value={a.addressNumber}
            onChange={(value) => address.setField("addressNumber", value)}
          />
          , bairro{" "}
          <InlineInput
            label="Bairro"
            placeholder="bairro"
            value={a.neighborhood}
            onChange={(value) => address.setField("neighborhood", value)}
          />
          ,{" "}
          <InlineInput
            label="Cidade"
            placeholder="cidade"
            value={a.city}
            onChange={(value) => address.setField("city", value)}
          />
          /
          <InlineInput
            label="UF"
            placeholder="UF"
            value={a.state}
            maxLength={2}
            onChange={(value) =>
              address.setField("state", value.toUpperCase().slice(0, 2))
            }
          />
          , CEP{" "}
          <InlineInput
            label="CEP"
            placeholder="00000-000"
            value={a.zipCode}
            onChange={(value) => address.setField("zipCode", maskCEP(value))}
          />
          , telefone{" "}
          <InlineInput
            label="Celular"
            placeholder="(00) 00000-0000"
            value={p.mobilePhone}
            onChange={(value) => setP("mobilePhone", maskCelular(value))}
            missing
          />
          , e-mail{" "}
          <InlineInput
            label="E-mail"
            placeholder="e-mail"
            type="email"
            value={p.email}
            onChange={(value) => setP("email", value.replace(/\s/g, ""))}
          />
          .
        </p>

        <p className="mt-6 font-serif text-[17px] leading-[2.6] text-gray-100 sm:text-lg">
          Pretende o benefício de{" "}
          <InlineSelect
            label="Benefício pretendido"
            placeholder="benefício"
            options={BenefitOptions}
            value={service.values.benefit}
            onChange={(value) => {
              const previous = service.values.benefit;
              service.setField("benefit", value);
              onBenefitChange(value, previous);
            }}
            missing
          />
          , estando o caso em{" "}
          <InlineSelect
            label="Situação"
            placeholder="situação"
            options={SituationOptions}
            value={service.values.situation}
            onChange={(value) => service.setField("situation", value)}
            missing
          />
          .
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-light-gray pt-6">
          <label className="flex flex-wrap items-center gap-2 text-sm text-gray-100">
            Senha do Meu INSS{" "}
            <span className="text-xs text-gray-100/60">
              (não entra no texto)
            </span>
            <InlineInput
              label="Senha do INSS (meu INSS)"
              placeholder="senha"
              type="password"
              tone="plain"
              value={professional.values.inssPassword}
              onChange={(value) => professional.setField("inssPassword", value)}
              missing
            />
          </label>
          <ActionGroup>
            <ActionButton tone="primary" onClick={() => void copy()}>
              {copied ? "Copiado ✓" : "Copiar qualificação"}
            </ActionButton>
          </ActionGroup>
        </div>
      </article>
    </div>
  );
}
