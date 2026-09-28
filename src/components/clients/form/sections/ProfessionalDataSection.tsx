"use client";

import { Field, PasswordField } from "@/components/ui/form/Field";
import { maskCTPS, maskNIT } from "@/lib/masks/masks";
import {
  validateCTPS,
  validateContributionPart,
  validateNIT,
  validateRequired,
} from "@/lib/validators";
import type { FieldRules, SectionForm } from "@/hooks/useSectionForm";
import { FormGrid } from "../FormSection";

/**
 * "Dados profissionais" — espelha `ClientProfessionalDataRequestDTO`.
 *
 * Duas particularidades do backend valem lembrete:
 *
 * 1. `inssPassword` é `@NotBlank` **também no `POST /clients`**. Ou seja: este
 *    campo, que mora nesta seção, é obrigatório já na primeira gravação — é a
 *    única dependência cruzada entre accordions no salvamento em duas fases.
 *    Só no CADASTRO: na edição ele é opcional, e ausente significa "mantém a
 *    que está gravada". Esta seção é a do cadastro; para consultar ou trocar a
 *    senha de um cliente já existente, `InssPasswordField` na ficha — a leitura
 *    é auditada e a senha não volta em resposta nenhuma.
 * 2. O tempo de contribuição são TRÊS campos numéricos (anos, meses, dias),
 *    não uma frase. Era texto livre, e o servidor lia os números dele com
 *    regex: "nao informado" virava 0 (igual a quem não contribuiu) e
 *    "300000000 anos" virava -694967296. Os dois eram aceitos e gravados.
 *    A frase ("33 anos, 11 meses e 5 dias") continua vindo em
 *    `contributionTime`, agora derivada na resposta, e o total em meses em
 *    `contributionInMonths` — os dois só de leitura.
 */

export type ProfessionalValues = {
  profession: string;
  nitPis: string;
  ctps: string;
  ctpsSeries: string;
  contributionYears: string;
  contributionMonths: string;
  contributionDays: string;
  beneficiaryNumber: string;
  inssPassword: string;
};

export const professionalInitial: ProfessionalValues = {
  profession: "",
  nitPis: "",
  ctps: "",
  ctpsSeries: "",
  contributionYears: "",
  contributionMonths: "",
  contributionDays: "",
  beneficiaryNumber: "",
  inssPassword: "",
};

export const professionalRules: FieldRules<ProfessionalValues> = {
  inssPassword: (value) => validateRequired(value, "Senha do INSS"),
  nitPis: (value) => validateNIT(value),
  ctps: (value) => validateCTPS(value),
  contributionYears: (value) => validateContributionPart(value, 130, "Anos"),
  contributionMonths: (value) => validateContributionPart(value, 11, "Meses"),
  contributionDays: (value) => validateContributionPart(value, 29, "Dias"),
};

/** Só dígitos: o `type="number"` do navegador ainda deixa passar "e", "+" e "-". */
const soDigitos = (value: string) => value.replace(/\D/g, "");

export function ProfessionalDataSection({
  form,
}: {
  form: SectionForm<ProfessionalValues>;
}) {
  const { values, setField, touchField, errorOf } = form;

  return (
    <FormGrid>
      <Field
        className="sm:col-span-2"
        label="Profissão"
        value={values.profession}
        onChange={(event) => setField("profession", event.target.value)}
      />
      <Field
        label="NIT/PIS"
        maxLength={14}
        value={values.nitPis}
        onChange={(event) => setField("nitPis", maskNIT(event.target.value))}
        onBlur={() => touchField("nitPis")}
        isInvalid={!!errorOf("nitPis")}
        errorMessage={errorOf("nitPis")}
      />
      <Field
        label="Nº do benefício"
        value={values.beneficiaryNumber}
        onChange={(event) => setField("beneficiaryNumber", event.target.value)}
      />

      <Field
        label="CTPS"
        value={values.ctps}
        onChange={(event) => setField("ctps", maskCTPS(event.target.value))}
        onBlur={() => touchField("ctps")}
        isInvalid={!!errorOf("ctps")}
        errorMessage={errorOf("ctps")}
      />
      <Field
        label="Série da CTPS"
        value={values.ctpsSeries}
        onChange={(event) => setField("ctpsSeries", event.target.value)}
      />
      <Field
        label="Tempo de contribuição (anos)"
        placeholder="33"
        maxLength={3}
        value={values.contributionYears}
        onChange={(event) =>
          setField("contributionYears", soDigitos(event.target.value))
        }
        onBlur={() => touchField("contributionYears")}
        isInvalid={!!errorOf("contributionYears")}
        errorMessage={errorOf("contributionYears")}
      />
      <Field
        label="Meses"
        placeholder="11"
        maxLength={2}
        value={values.contributionMonths}
        onChange={(event) =>
          setField("contributionMonths", soDigitos(event.target.value))
        }
        onBlur={() => touchField("contributionMonths")}
        isInvalid={!!errorOf("contributionMonths")}
        errorMessage={errorOf("contributionMonths")}
      />
      <Field
        label="Dias"
        placeholder="5"
        maxLength={2}
        value={values.contributionDays}
        onChange={(event) =>
          setField("contributionDays", soDigitos(event.target.value))
        }
        onBlur={() => touchField("contributionDays")}
        isInvalid={!!errorOf("contributionDays")}
        errorMessage={errorOf("contributionDays")}
      />
      <PasswordField
        label="Senha do INSS (meu INSS)"
        isRequired
        value={values.inssPassword}
        onChange={(event) => setField("inssPassword", event.target.value)}
        onBlur={() => touchField("inssPassword")}
        isInvalid={!!errorOf("inssPassword")}
        errorMessage={errorOf("inssPassword")}
      />
    </FormGrid>
  );
}
