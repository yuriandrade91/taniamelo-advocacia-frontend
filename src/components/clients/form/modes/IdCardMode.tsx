"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import svgPaths from "@/constants/svg/paths";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { GenderOptions } from "@/enums/gender/Gender";
import { SituationOptions } from "@/enums/situation/Situation";
import { maskCelular, maskCPF, maskCTPS, maskNIT } from "@/lib/masks/masks";
import {
  Caption,
  InlineDate,
  InlineInput,
  InlineSelect,
  type FillModeProps,
} from "./shared";
import { digitsOf } from "@/lib/masks/masks";

const initialsOf = (name: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 2);
  if (!words.length) return "?";
  return (
    words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")
  ).toUpperCase();
};

const onlyDigits = (value: string, max: number) => digitsOf(value).slice(0, max);

function FlipIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M3.5 10a6.5 6.5 0 0 1 11.3-4.4M16.5 10a6.5 6.5 0 0 1-11.3 4.4M15 2.5v3.5h-3.5M5 17.5V14h3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Modo "Carteirinha": o cadastro é o cartão do cliente do escritório, e se
 * edita direto sobre ele. Frente: quem é e como falar com ele. Verso: o caso
 * previdenciário. O cartão vira em 3D; no celular frente e verso empilham.
 *
 * A face escondida fica `inert` — sem isso o Tab entraria em campos que não
 * se vê.
 */
export function IdCardMode(props: FillModeProps) {
  const { service, personal, professional, onBenefitChange } = props;
  const p = personal.values;
  const pro = professional.values;
  const [flipped, setFlipped] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const hideFront = isWide && flipped;
  const hideBack = isWide && !flipped;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5">
      <div className="w-full md:[perspective:1800px]">
        <div
          className={`relative flex flex-col gap-4 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none md:block md:h-[470px] md:[transform-style:preserve-3d] ${
            flipped ? "md:[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* ── frente ── */}
          <section
            aria-label="Frente do cartão — identificação"
            inert={hideFront}
            className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,var(--color-primary)_0%,#1a2070_60%,#2a2f8a_100%)] p-7 text-white md:absolute md:inset-0 md:[backface-visibility:hidden]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-secondary/25 blur-3xl"
            />
            <header className="relative flex items-start justify-between gap-4">
              <Image
                src={svgPaths.LOGOS.WHITE}
                alt="Tânia Melo"
                width={120}
                height={64}
                className="h-12 w-auto opacity-90"
              />
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.3em] text-secondary uppercase">
                  Ficha do cliente
                </p>
                <p className="mt-1 text-[11px] text-white/50">
                  Advocacia Previdenciária
                </p>
              </div>
            </header>

            <div className="relative mt-6 grid gap-6 sm:grid-cols-[110px_minmax(0,1fr)]">
              <div className="flex flex-col items-center gap-3">
                <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-secondary text-3xl font-semibold tracking-wide text-white">
                  {initialsOf(p.fullName)}
                </span>
                <div className="w-full text-center">
                  <Caption tone="card">Sexo</Caption>
                  <InlineSelect
                    tone="card"
                    fluid
                    label="Gênero"
                    placeholder="—"
                    options={GenderOptions}
                    value={p.gender}
                    onChange={(value) => personal.setField("gender", value)}
                    missing
                    className="text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2">
                  <Caption tone="card">Nome</Caption>
                  <InlineInput
                    tone="card"
                    fluid
                    label="Nome completo"
                    placeholder="Nome completo do cliente"
                    value={p.fullName}
                    onChange={(value) => personal.setField("fullName", value)}
                    missing
                    className="text-2xl font-semibold tracking-wide uppercase"
                  />
                </div>
                <div>
                  <Caption tone="card">CPF</Caption>
                  <InlineInput
                    tone="card"
                    fluid
                    label="CPF"
                    placeholder="000.000.000-00"
                    value={p.cpf}
                    maxLength={14}
                    onChange={(value) =>
                      personal.setField("cpf", maskCPF(value))
                    }
                    missing
                    className="font-mono tracking-wider"
                  />
                </div>
                <div>
                  <Caption tone="card">Nascimento</Caption>
                  <InlineDate
                    tone="card"
                    label="Data de nascimento"
                    value={p.birthDate}
                    onChange={(value) => personal.setField("birthDate", value)}
                    missing
                    className="w-full font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Caption tone="card">Filiação</Caption>
                  <InlineInput
                    tone="card"
                    fluid
                    label="Nome da mãe"
                    placeholder="Nome da mãe"
                    value={p.motherName}
                    onChange={(value) => personal.setField("motherName", value)}
                    missing
                  />
                </div>
                <div>
                  <Caption tone="card">Celular</Caption>
                  <InlineInput
                    tone="card"
                    fluid
                    label="Celular"
                    placeholder="(00) 00000-0000"
                    value={p.mobilePhone}
                    onChange={(value) =>
                      personal.setField("mobilePhone", maskCelular(value))
                    }
                    missing
                    className="font-mono"
                  />
                </div>
                <div>
                  <Caption tone="card">E-mail</Caption>
                  <InlineInput
                    tone="card"
                    fluid
                    type="email"
                    label="E-mail"
                    placeholder="email@exemplo.com"
                    value={p.email}
                    onChange={(value) =>
                      personal.setField("email", value.replace(/\s/g, ""))
                    }
                  />
                </div>
              </div>
            </div>

            <span
              aria-hidden="true"
              className="absolute right-7 bottom-6 left-7 h-px bg-gradient-to-r from-secondary via-secondary/40 to-transparent"
            />
          </section>

          {/* ── verso ── */}
          <section
            aria-label="Verso do cartão — previdência"
            inert={hideBack}
            className="relative overflow-hidden rounded-[28px] bg-floral text-primary ring-1 ring-secondary/25 md:absolute md:inset-0 md:[backface-visibility:hidden] md:[transform:rotateY(180deg)]"
          >
            {/* Tarja, como a magnética de um cartão. */}
            <span aria-hidden="true" className="block h-12 w-full bg-primary" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-7 sm:grid-cols-3">
              <div className="col-span-2">
                <Caption tone="back">Benefício pretendido</Caption>
                <InlineSelect
                  tone="plain"
                  fluid
                  label="Benefício pretendido"
                  placeholder="Escolha o benefício"
                  options={BenefitOptions}
                  value={service.values.benefit}
                  onChange={(value) => {
                    const previous = service.values.benefit;
                    service.setField("benefit", value);
                    onBenefitChange(value, previous);
                  }}
                  missing
                  className="text-lg font-semibold"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <Caption tone="back">Situação</Caption>
                <InlineSelect
                  tone="plain"
                  fluid
                  label="Situação"
                  placeholder="Situação"
                  options={SituationOptions}
                  value={service.values.situation}
                  onChange={(value) => service.setField("situation", value)}
                  missing
                />
              </div>
              <div>
                <Caption tone="back">Profissão</Caption>
                <InlineInput
                  tone="plain"
                  fluid
                  label="Profissão"
                  placeholder="Profissão"
                  value={pro.profession}
                  onChange={(value) =>
                    professional.setField("profession", value)
                  }
                />
              </div>
              <div>
                <Caption tone="back">NIT/PIS</Caption>
                <InlineInput
                  tone="plain"
                  fluid
                  label="NIT/PIS"
                  placeholder="000.00000.00-0"
                  value={pro.nitPis}
                  maxLength={14}
                  onChange={(value) =>
                    professional.setField("nitPis", maskNIT(value))
                  }
                  className="font-mono"
                />
              </div>
              <div>
                <Caption tone="back">CTPS</Caption>
                <InlineInput
                  tone="plain"
                  fluid
                  label="CTPS"
                  placeholder="0000000"
                  value={pro.ctps}
                  onChange={(value) =>
                    professional.setField("ctps", maskCTPS(value))
                  }
                  className="font-mono"
                />
              </div>
              <div className="col-span-2">
                <Caption tone="back">Tempo de contribuição</Caption>
                <span className="flex items-baseline gap-2 text-sm">
                  <InlineInput
                    tone="plain"
                    label="Tempo de contribuição (anos)"
                    placeholder="00"
                    value={pro.contributionYears}
                    onChange={(value) =>
                      professional.setField(
                        "contributionYears",
                        onlyDigits(value, 3),
                      )
                    }
                    className="text-center font-mono"
                  />
                  anos
                  <InlineInput
                    tone="plain"
                    label="Meses"
                    placeholder="00"
                    value={pro.contributionMonths}
                    onChange={(value) =>
                      professional.setField(
                        "contributionMonths",
                        onlyDigits(value, 2),
                      )
                    }
                    className="text-center font-mono"
                  />
                  meses
                  <InlineInput
                    tone="plain"
                    label="Dias"
                    placeholder="00"
                    value={pro.contributionDays}
                    onChange={(value) =>
                      professional.setField(
                        "contributionDays",
                        onlyDigits(value, 2),
                      )
                    }
                    className="text-center font-mono"
                  />
                  dias
                </span>
              </div>
              <div>
                <Caption tone="back">Senha do Meu INSS</Caption>
                <InlineInput
                  tone="plain"
                  fluid
                  type="password"
                  label="Senha do INSS (meu INSS)"
                  placeholder="••••••"
                  value={pro.inssPassword}
                  onChange={(value) =>
                    professional.setField("inssPassword", value)
                  }
                  missing
                />
              </div>
            </div>

            {/* Assinatura: o nome do cliente, como escrito à mão. */}
            <div className="mx-7 mb-6 border-t border-primary/20 pt-2">
              <p className="min-h-8 font-serif text-2xl text-primary/80 italic">
                {p.fullName || " "}
              </p>
              <Caption tone="back">Assinatura do cliente</Caption>
            </div>
          </section>
        </div>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <ActionGroup>
          <ActionButton
            tone="secondary"
            icon={<FlipIcon />}
            onClick={() => setFlipped((value) => !value)}
          >
            {flipped ? "Ver a frente" : "Virar para o verso"}
          </ActionButton>
        </ActionGroup>
        <span className="text-xs text-gray-100">
          Frente: identificação · Verso: previdência
        </span>
      </div>
    </div>
  );
}
