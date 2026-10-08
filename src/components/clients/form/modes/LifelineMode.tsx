"use client";

import type { ReactNode } from "react";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { GenderOptions } from "@/enums/gender/Gender";
import { SituationOptions } from "@/enums/situation/Situation";
import { maskMobile, maskCPF, maskNIT, maskRG } from "@/lib/masks/masks";
import { ageFromBirthDate } from "@/lib/validators";
import {
  Caption,
  InlineDate,
  InlineInput,
  InlineSelect,
  type FillModeProps,
} from "./shared";
import { onlyDigits } from "@/lib/masks/masks";


/** Anos de contribuição em fração: 33a 6m → 33,5. */
const contributionYears = (years: string, months: string, days: string) =>
  (Number(years) || 0) + (Number(months) || 0) / 12 + (Number(days) || 0) / 365;

/**
 * A régua da vida: do nascimento até hoje, com as décadas marcadas e o
 * trecho de contribuição em dourado terminando hoje. Desenha-se sozinha
 * conforme a data de nascimento e o tempo de contribuição são preenchidos.
 */
function LifeTrack({
  birthDate,
  years,
  months,
  days,
}: {
  birthDate: string;
  years: string;
  months: string;
  days: string;
}) {
  const age = ageFromBirthDate(birthDate);
  const now = new Date().getFullYear();

  if (age === null || age <= 0) {
    return (
      <div className="rounded-3xl bg-white px-8 py-10 text-center ring-1 ring-light-gray">
        <div className="mx-auto h-2 max-w-3xl rounded-full bg-[repeating-linear-gradient(90deg,var(--color-light-gray)_0_12px,transparent_12px_20px)]" />
        <p className="mt-5 text-sm text-gray-100">
          Informe a <strong className="text-primary">data de nascimento</strong>{" "}
          no primeiro marco e a linha da vida do cliente se desenha aqui.
        </p>
      </div>
    );
  }

  const birthYear = now - age;
  const contribution = Math.min(contributionYears(years, months, days), age);
  const startPct = ((age - contribution) / age) * 100;
  const decades: number[] = [];
  for (
    let year = Math.ceil((birthYear + 1) / 10) * 10;
    year < now;
    year += 10
  ) {
    decades.push(year);
  }

  return (
    <div className="rounded-3xl bg-white px-8 pt-10 pb-12 ring-1 ring-light-gray">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-secondary uppercase">
            Linha da vida
          </p>
          <p className="mt-1 text-3xl font-semibold text-primary tabular-nums">
            {age} anos
          </p>
        </div>
        <p className="text-right text-sm text-gray-100">
          {contribution > 0 ? (
            <>
              <span className="text-2xl font-semibold text-secondary tabular-nums">
                {contribution.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
              </span>{" "}
              anos de contribuição
              <span className="block text-xs text-gray-100/70">
                {Math.round((contribution / age) * 100)}% da vida
              </span>
            </>
          ) : (
            "Preencha o tempo de contribuição no marco Trabalho"
          )}
        </p>
      </div>

      <div className="relative mx-2 h-3">
        <div className="absolute inset-0 rounded-full bg-light-gray/70" />
        {contribution > 0 && (
          <div
            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-secondary/60 to-secondary transition-all duration-700"
            style={{ left: `${startPct}%`, right: 0 }}
          />
        )}
        {decades.map((year) => {
          const pct = ((year - birthYear) / age) * 100;
          return (
            <span
              key={year}
              className="absolute top-full mt-2 -translate-x-1/2 text-[11px] text-gray-100/60 tabular-nums"
              style={{ left: `${pct}%` }}
            >
              {year}
            </span>
          );
        })}
        <span className="absolute top-1/2 left-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-primary" />
        <span className="absolute top-1/2 right-0 h-6 w-6 translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-secondary" />
        <span className="absolute -top-7 left-0 text-xs font-medium whitespace-nowrap text-primary">
          Nasceu · {birthYear}
        </span>
        <span className="absolute -top-7 right-0 text-xs font-medium whitespace-nowrap text-secondary">
          Hoje · {now}
        </span>
      </div>
    </div>
  );
}

function Milestone({
  step,
  title,
  done,
  children,
}: {
  step: number;
  title: string;
  /** Os obrigatórios deste marco estão preenchidos. */
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`${step}. ${title}`}
      className="relative flex flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-light-gray"
    >
      <header className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white tabular-nums transition-colors ${
            done ? "bg-success" : "bg-primary"
          }`}
        >
          {done ? "✓" : step}
        </span>
        <h3 className="text-base font-semibold text-primary">{title}</h3>
      </header>
      {children}
    </section>
  );
}

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <Caption>{label}</Caption>
    {children}
  </div>
);

/**
 * Modo "Linha da vida": em vez de seções de formulário, a trajetória do
 * cliente — nasceu, se identificou, trabalhou, agora pede o benefício. Em
 * cima, a régua da vida se desenha com a idade e o tempo de contribuição,
 * que são exatamente o que o direito previdenciário pesa.
 */
export function LifelineMode(props: FillModeProps) {
  const { service, personal, professional, address, onBenefitChange } = props;
  const p = personal.values;
  const pro = professional.values;
  const filled = (...values: string[]) => values.every((value) => value.trim());

  return (
    <div className="flex flex-col gap-5">
      <LifeTrack
        birthDate={p.birthDate}
        years={pro.contributionYears}
        months={pro.contributionMonths}
        days={pro.contributionDays}
      />

      <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* O fio que liga os marcos, no desktop largo. */}
        <span
          aria-hidden="true"
          className="absolute top-[42px] right-10 left-10 hidden h-0.5 bg-[repeating-linear-gradient(90deg,var(--color-secondary)_0_8px,transparent_8px_14px)] opacity-40 xl:block"
        />

        <Milestone
          step={1}
          title="Nascimento"
          done={filled(p.fullName, p.birthDate, p.motherName, p.gender)}
        >
          <Row label="Nome completo">
            <InlineInput
              tone="plain"
              fluid
              label="Nome completo"
              placeholder="Nome do cliente"
              value={p.fullName}
              onChange={(v) => personal.setField("fullName", v)}
              missing
            />
          </Row>
          <Row label="Nasceu em">
            <InlineDate
              tone="plain"
              label="Data de nascimento"
              value={p.birthDate}
              onChange={(v) => personal.setField("birthDate", v)}
              missing
              className="w-full"
            />
          </Row>
          <Row label="Filho(a) de">
            <InlineInput
              tone="plain"
              fluid
              label="Nome da mãe"
              placeholder="Nome da mãe"
              value={p.motherName}
              onChange={(v) => personal.setField("motherName", v)}
              missing
            />
          </Row>
          <Row label="Sexo">
            <InlineSelect
              tone="plain"
              fluid
              label="Gênero"
              placeholder="—"
              options={GenderOptions}
              value={p.gender}
              onChange={(v) => personal.setField("gender", v)}
              missing
            />
          </Row>
        </Milestone>

        <Milestone
          step={2}
          title="Identidade"
          done={filled(p.cpf, p.mobilePhone)}
        >
          <Row label="CPF">
            <InlineInput
              tone="plain"
              fluid
              label="CPF"
              placeholder="000.000.000-00"
              maxLength={14}
              value={p.cpf}
              onChange={(v) => personal.setField("cpf", maskCPF(v))}
              missing
              className="font-mono"
            />
          </Row>
          <Row label="RG">
            <InlineInput
              tone="plain"
              fluid
              label="RG"
              placeholder="00.000.000-0"
              value={p.rg}
              onChange={(v) => personal.setField("rg", maskRG(v))}
              className="font-mono"
            />
          </Row>
          <Row label="Celular">
            <InlineInput
              tone="plain"
              fluid
              label="Celular"
              placeholder="(00) 00000-0000"
              value={p.mobilePhone}
              onChange={(v) => personal.setField("mobilePhone", maskMobile(v))}
              missing
              className="font-mono"
            />
          </Row>
          <Row label="E-mail">
            <InlineInput
              tone="plain"
              fluid
              type="email"
              label="E-mail"
              placeholder="email@exemplo.com"
              value={p.email}
              onChange={(v) => personal.setField("email", v.replace(/\s/g, ""))}
            />
          </Row>
        </Milestone>

        <Milestone step={3} title="Trabalho" done={filled(pro.inssPassword)}>
          <Row label="Profissão">
            <InlineInput
              tone="plain"
              fluid
              label="Profissão"
              placeholder="Profissão"
              value={pro.profession}
              onChange={(v) => professional.setField("profession", v)}
            />
          </Row>
          <Row label="NIT/PIS">
            <InlineInput
              tone="plain"
              fluid
              label="NIT/PIS"
              placeholder="000.00000.00-0"
              maxLength={14}
              value={pro.nitPis}
              onChange={(v) => professional.setField("nitPis", maskNIT(v))}
              className="font-mono"
            />
          </Row>
          <Row label="Tempo de contribuição">
            <span className="flex items-baseline gap-1.5 text-sm text-gray-100">
              <InlineInput
                tone="plain"
                label="Tempo de contribuição (anos)"
                placeholder="00"
                value={pro.contributionYears}
                onChange={(v) =>
                  professional.setField("contributionYears", onlyDigits(v, 3))
                }
                className="text-center font-mono"
              />
              a
              <InlineInput
                tone="plain"
                label="Meses"
                placeholder="00"
                value={pro.contributionMonths}
                onChange={(v) =>
                  professional.setField("contributionMonths", onlyDigits(v, 2))
                }
                className="text-center font-mono"
              />
              m
              <InlineInput
                tone="plain"
                label="Dias"
                placeholder="00"
                value={pro.contributionDays}
                onChange={(v) =>
                  professional.setField("contributionDays", onlyDigits(v, 2))
                }
                className="text-center font-mono"
              />
              d
            </span>
          </Row>
          <Row label="Senha do Meu INSS">
            <InlineInput
              tone="plain"
              fluid
              type="password"
              label="Senha do INSS (meu INSS)"
              placeholder="••••••"
              value={pro.inssPassword}
              onChange={(v) => professional.setField("inssPassword", v)}
              missing
            />
          </Row>
        </Milestone>

        <Milestone
          step={4}
          title="O pedido"
          done={filled(service.values.benefit, service.values.situation)}
        >
          <Row label="Benefício pretendido">
            <InlineSelect
              tone="plain"
              fluid
              label="Benefício pretendido"
              placeholder="Escolha"
              options={BenefitOptions}
              value={service.values.benefit}
              onChange={(v) => {
                const previous = service.values.benefit;
                service.setField("benefit", v);
                onBenefitChange(v, previous);
              }}
              missing
            />
          </Row>
          <Row label="Situação">
            <InlineSelect
              tone="plain"
              fluid
              label="Situação"
              placeholder="Escolha"
              options={SituationOptions}
              value={service.values.situation}
              onChange={(v) => service.setField("situation", v)}
              missing
            />
          </Row>
          <Row label="Mora em">
            <span className="flex items-baseline gap-1">
              <InlineInput
                tone="plain"
                fluid
                label="Cidade"
                placeholder="Cidade"
                value={address.values.city}
                onChange={(v) => address.setField("city", v)}
              />
              /
              <InlineInput
                tone="plain"
                label="UF"
                placeholder="UF"
                maxLength={2}
                value={address.values.state}
                onChange={(v) =>
                  address.setField("state", v.toUpperCase().slice(0, 2))
                }
              />
            </span>
          </Row>
        </Milestone>
      </div>
    </div>
  );
}
