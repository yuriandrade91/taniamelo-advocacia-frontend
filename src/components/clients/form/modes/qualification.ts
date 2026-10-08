/**
 * O parágrafo de qualificação da parte, como numa petição inicial — montado a
 * partir dos dados do cadastro, concordando com o gênero.
 *
 * Função pura: o modo "Petição viva" desenha as lacunas e usa isto para o
 * botão "Copiar qualificação".
 */
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import { formatDateBR } from "@/lib/format";

export type QualificationInput = {
  fullName: string;
  nationality: string;
  gender: string;
  maritalStatus: string;
  profession: string;
  birthDate: string;
  motherName: string;
  cpf: string;
  rg: string;
  rgIssuer: string;
  nitPis: string;
  street: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  mobilePhone: string;
  email: string;
};

export const BLANK = "________";

/** Terminação de concordância: "a", "o" ou "o(a)" quando não se sabe. */
export function genderEnding(gender: string) {
  if (gender === "FEMININO") return "a";
  if (gender === "MASCULINO") return "o";
  return "o(a)";
}

/** "Casado(a)" → "casada" / "casado" / "casado(a)". */
export function maritalWord(maritalStatus: string, gender: string) {
  const label =
    MaritalStatusOptions.find((option) => option.value === maritalStatus)
      ?.label ?? "";
  if (!label) return "";
  const word = label.toLowerCase();
  if (gender === "FEMININO") return word.replace("o(a)", "a");
  if (gender === "MASCULINO") return word.replace("(a)", "");
  return word;
}

const or = (value: string) => value.trim() || BLANK;

export function qualificationText(v: QualificationInput) {
  const g = genderEnding(v.gender);
  const bearer =
    v.gender === "FEMININO"
      ? "portadora"
      : v.gender === "MASCULINO"
        ? "portador"
        : "portador(a)";
  const rg = v.rgIssuer.trim() ? `${or(v.rg)} ${v.rgIssuer.trim()}` : or(v.rg);
  const cityUf =
    v.city.trim() || v.state.trim() ? `${or(v.city)}/${or(v.state)}` : BLANK;

  return (
    `${or(v.fullName).toUpperCase()}, ${or(v.nationality).toLowerCase()}, ` +
    `${or(maritalWord(v.maritalStatus, v.gender))}, ${or(v.profession).toLowerCase()}, ` +
    `nascid${g} em ${or(formatDateBR(v.birthDate, ""))}, filh${g} de ${or(v.motherName)}, ` +
    `inscrit${g} no CPF sob o nº ${or(v.cpf)}, ${bearer} do RG nº ${rg}, ` +
    `NIT/PIS nº ${or(v.nitPis)}, residente e domiciliad${g} na ${or(v.street)}, ` +
    `nº ${or(v.addressNumber)}, bairro ${or(v.neighborhood)}, ${cityUf}, ` +
    `CEP ${or(v.zipCode)}, telefone ${or(v.mobilePhone)}, e-mail ${or(v.email)}.`
  );
}
