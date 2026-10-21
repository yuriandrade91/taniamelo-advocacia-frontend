/**
 * Extrai dados de cliente de um texto livre — a mensagem colada do WhatsApp,
 * um e-mail, o que foi ditado em voz alta.
 *
 * Função pura: recebe texto, devolve o que reconheceu, com o trecho de onde
 * tirou cada valor (para a pessoa conferir antes de aplicar). Nada é gravado
 * aqui; quem aplica é a tela, e só o que a pessoa confirmar.
 *
 * Rótulo só lê valor na **mesma linha** ("minha mãe:\nNome: …" não pode
 * tomar o nome da cliente pelo da mãe).
 *
 * As regras preferem **rótulo** ("CPF:", "mãe:", "nasc.") a padrão solto:
 * um celular de 11 dígitos e um CPF sem pontos são o mesmo formato, e só o
 * rótulo desempata. Sem rótulo, só se aceita o que não tem ambiguidade (CPF
 * com pontuação, data perto de "nasc", e-mail, CEP com hífen).
 */
import { BenefitOptions } from "@/enums/benefit/Benefits";
import {
  maskMobile,
  maskCEP,
  maskCPF,
  maskNIT,
  maskRG,
} from "@/lib/masks/masks";

export type SmartFieldKey =
  | "benefit"
  | "fullName"
  | "birthDate"
  | "cpf"
  | "rg"
  | "motherName"
  | "gender"
  | "maritalStatus"
  | "mobilePhone"
  | "email"
  | "profession"
  | "nitPis"
  | "zipCode"
  | "street"
  | "addressNumber"
  | "neighborhood"
  | "city"
  | "state";

/** Em qual formulário da página cada campo mora. */
type SmartTarget = "service" | "personal" | "professional" | "address";

export type ExtractedField = {
  key: SmartFieldKey;
  target: SmartTarget;
  /** Rótulo da tela, para a pessoa reconhecer. */
  label: string;
  /** O valor no formato que o formulário guarda (chave de enum, ISO…). */
  value: string;
  /** Como mostrar o valor (rótulo do enum, data brasileira…). */
  display: string;
  /** O trecho do texto de onde ele saiu. */
  source: string;
};

const FIELDS: Record<SmartFieldKey, { label: string; target: SmartTarget }> = {
  benefit: { label: "Benefício pretendido", target: "service" },
  fullName: { label: "Nome completo", target: "personal" },
  birthDate: { label: "Data de nascimento", target: "personal" },
  cpf: { label: "CPF", target: "personal" },
  rg: { label: "RG", target: "personal" },
  motherName: { label: "Nome da mãe", target: "personal" },
  gender: { label: "Gênero", target: "personal" },
  maritalStatus: { label: "Estado civil", target: "personal" },
  mobilePhone: { label: "Celular", target: "personal" },
  email: { label: "E-mail", target: "personal" },
  profession: { label: "Profissão", target: "professional" },
  nitPis: { label: "NIT/PIS", target: "professional" },
  zipCode: { label: "CEP", target: "address" },
  street: { label: "Logradouro", target: "address" },
  addressNumber: { label: "Número", target: "address" },
  neighborhood: { label: "Bairro", target: "address" },
  city: { label: "Cidade", target: "address" },
  state: { label: "UF", target: "address" },
};

const UFS = new Set(
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  ),
);

const digits = (text: string) => text.replaceAll(/\D/g, "");

/** Corta o valor de texto no primeiro separador e tira pontuação das pontas. */
const clean = (text: string) =>
  text
    .split(/[\n;|]/)[0]
    .replaceAll(/\s+/g, " ")
    .replace(/^[\s:\-–,.]+/, "")
    .replace(/(?<![\s,.;:\-–])[\s,.;:\-–]+$/, "")
    .trim();

/** "maria aparecida DA SILVA" → "Maria Aparecida da Silva". */
export const titleCase = (name: string) =>
  name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      /^(d[aeo]s?|e)$/.test(word)
        ? word
        : word[0].toUpperCase() + word.slice(1),
    )
    .join(" ");

const isoDate = (day: string, month: string, year: string) => {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCDate() !== d) return null; // 31/02 e afins
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const brDate = (iso: string) => iso.split("-").reverse().join("/");

/** Rótulos de telefone que alguém escreve antes do número. */
const PHONE_LABELS = ["cel(?:ular)?", "telefone", "tel", "fone", "whats(?:app)?", "contato", "zap"];
/** Celular ou fixo, com DDD: "(31) 9 8888-7777", "31988887777". */
const PHONE_NUMBER = String.raw`\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}`;
const PHONE_LABELED = new RegExp(String.raw`(?:${PHONE_LABELS.join("|")})\D{0,8}(${PHONE_NUMBER})`, "i");

/** O começo de um logradouro: "rua", "av.", "praça"… */
const STREET_KINDS = ["rua", String.raw`r\.`, "avenida", String.raw`av\.?`, "travessa", "alameda", "rodovia", "estrada", "pra[çc]a"];
/** O número logo depois da vírgula ("rua X, nº 12"), quando há. */
const STREET_NUMBER = String.raw`,\s*(?:n[ºo°.]*\s*)?(\d+[a-z]?)\b`;
const STREET = new RegExp(
  String.raw`\b((?:${STREET_KINDS.join("|")})\s+[^,\n;]+?)\s*(?:${STREET_NUMBER}|$|[,\n;])`,
  "i",
);

/** Uma palavra de nome próprio: maiúscula e o resto em letras. */
const PROPER_WORD = "[A-ZÀ-Ú][A-Za-zÀ-ú]+";
/** "Belo Horizonte/MG", "São João del Rei - MG": cidade (com "da/de/do") e UF. */
const CITY_UF = new RegExp(
  String.raw`(${PROPER_WORD}(?:\s+(?:d[aeo]s?\s+)?${PROPER_WORD})*)\s*[/\-–]\s*([A-Z]{2})\b`,
  "g",
);

const BENEFIT_RULES: [RegExp, string][] = [
  [/defici[êe]ncia|\bpcd\b/i, "APOSENTADORIA_POR_DEFICIENCIA"],
  [/professor/i, "APOSENTADORIA_POR_TEMPO_PROFESSOR"],
  [/tempo de contribui/i, "APOSENTADORIA_POR_TEMPO_CONTRIBUICAO"],
  [/aposentadoria especial|\bespecial\b/i, "APOSENTADORIA_ESPECIAL"],
  [/rural/i, "APOSENTADORIA_RURAL"],
  [/incapacidade|invalidez/i, "APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE"],
  [/por idade|aposentadoria (?:por )?idade/i, "APOSENTADORIA_POR_IDADE"],
];

const MARITAL_RULES: [RegExp, string, string][] = [
  [/\bsolteir[oa]\b/i, "SOLTEIRO", "Solteiro(a)"],
  [/\bcasad[oa]\b/i, "CASADO", "Casado(a)"],
  [/\bseparad[oa]\b/i, "SEPARADO", "Separado(a)"],
  [/\bdivorciad[oa]\b/i, "DIVORCIADO", "Divorciado(a)"],
  [/\bvi[úu]v[oa]\b/i, "VIUVO", "Viúvo(a)"],
];

/** Guarda o primeiro valor achado para cada campo; os seguintes não sobrescrevem. */
type Put = (key: SmartFieldKey, value: string, source: string, display?: string) => void;

/** E-mail, CPF e celular — o celular não pode ser o próprio CPF. */
function extractContact(text: string, put: Put): void {
  // E-mail: formato inconfundível.
  const email = /(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text);
  if (email) put("email", email[0].toLowerCase(), email[0]);

  // CPF: com rótulo, aceita só dígitos; sem rótulo, só com pontuação.
  const cpfLabeled = /cpf\D{0,12}(\d{3}\.?\d{3}\.?\d{3}-?\d{2})(?!\d)/i.exec(text);
  const cpfLoose = /(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/.exec(text);
  const cpf = cpfLabeled?.[1] ?? cpfLoose?.[0];
  if (cpf) put("cpf", maskCPF(cpf), (cpfLabeled ?? cpfLoose)![0]);
  const cpfDigits = cpf ? digits(cpf) : "";

  // Celular: com rótulo, ou o padrão de celular (DDD + 9) que não seja o CPF.
  const phoneLabeled = PHONE_LABELED.exec(text);
  const phoneLoose = [
    ...text.matchAll(/(?<!\d)\(?(\d{2})\)?\s?(9\d{4})[-\s]?(\d{4})(?!\d)/g),
  ].find((match) => digits(match[0]) !== cpfDigits);
  const phone = phoneLabeled?.[1] ?? phoneLoose?.[0];
  if (phone && digits(phone).length >= 10) {
    put("mobilePhone", maskMobile(phone), (phoneLabeled ?? phoneLoose)![0]);
  }
}

/** A data de nascimento. */
function extractBirthDate(text: string, put: Put): void {
  // Data de nascimento: perto de "nasc"/"DN"; senão, a data mais antiga que
  // faça sentido como nascimento (14+ anos atrás).
  const dateRe = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/;
  const birthLabeled = new RegExp(
      String.raw`(?:nasc\w*|data de nascimento|\bdn\b|nascid[oa] em)\D{0,15}${dateRe.source}`,
      "i",
    ).exec(text);
  if (birthLabeled) {
    const iso = isoDate(birthLabeled[1], birthLabeled[2], birthLabeled[3]);
    if (iso) put("birthDate", iso, birthLabeled[0], brDate(iso));
  } else {
    const limit = new Date().getUTCFullYear() - 14;
    const candidates = [...text.matchAll(new RegExp(dateRe.source, "g"))]
      .map((match) => ({ match, iso: isoDate(match[1], match[2], match[3]) }))
      .filter((entry) => entry.iso && Number(entry.match[3]) <= limit)
      .sort((a, b) => a.iso!.localeCompare(b.iso!));
    if (candidates[0]) {
      put(
        "birthDate",
        candidates[0].iso!,
        candidates[0].match[0],
        brDate(candidates[0].iso!),
      );
    }
  }
}

/** O nome completo. */
function extractName(text: string, put: Put): void {
  // Nome: rótulo "nome"; senão, a primeira linha que pareça um nome.
  const nameLabeled = /\bnome(?: completo)?[ \t]*[:\-–][ \t]*([^\n,;]+)/i.exec(text);
  if (nameLabeled) {
    put("fullName", titleCase(clean(nameLabeled[1])), nameLabeled[0]);
  } else {
    const firstLine = text
      .split("\n")
      .map((line) => clean(line))
      .find(Boolean);
    if (
      firstLine &&
      /^[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+){1,6}$/.test(firstLine) &&
      !/\b(cpf|rg|nasc|cel|rua|av|mãe|mae|benef|aposent)/i.test(firstLine)
    ) {
      put("fullName", titleCase(firstLine), firstLine);
    }
  }
}

/** Mãe, gênero e estado civil. */
function extractFamily(text: string, put: Put): void {
  // Mãe: "mãe:", "filiação:", "filho(a) de … e …" (a mãe vem depois do "e").
  const mother = /\bm[ãa]e[ \t]*(?:[:\-–][ \t]*)?([a-zÀ-ú][^\n,;0-9]+)/i.exec(text);
  const filiation = /\b(?:filia[çc][ãa]o|filh[oa] de)[ \t]*(?:[:\-–][ \t]*)?([a-zÀ-ú][^\n;0-9][^\n;0-9,]*)(?=[,;\n]|$)/i.exec(text);
  if (mother) {
    put("motherName", titleCase(clean(mother[1])), mother[0]);
  } else if (filiation) {
    const parents = clean(filiation[1]).split(/(?<!\s)\s+e\s+/);
    put("motherName", titleCase(parents.at(-1)!), filiation[0]);
  }

  // Gênero: palavra explícita, ou "filha de"/"filho de".
  const gender =
    /\b(feminino|sexo\s*(?::\s*)?f\b|mulher)\b/i.exec(text) ??
    /\bfilha de\b/i.exec(text);
  const male =
    /\b(masculino|sexo\s*(?::\s*)?m\b|homem)\b/i.exec(text) ??
    /\bfilho de\b/i.exec(text);
  if (gender && !male) put("gender", "FEMININO", gender[0], "Feminino");
  else if (male && !gender) put("gender", "MASCULINO", male[0], "Masculino");

  for (const [re, value, display] of MARITAL_RULES) {
    const match = re.exec(text);
    if (match) {
      put("maritalStatus", value, match[0], display);
      break;
    }
  }
}

/** RG, NIT/PIS e profissão. */
function extractDocuments(text: string, put: Put): void {
  const rg = /\brg\b\s*(?:n[ºo°.]*\s*)?(?:[:\-–]\s*)?([\dx.-]{5,14})/i.exec(text);
  if (rg) put("rg", maskRG(rg[1]), rg[0]);

  const nit = /\b(?:nit|pis|pasep|nis)\s*(?:\/\s*pis\s*)?(?:[:\-–]\s*)?(\d[\d.-]{9,14})/i.exec(text);
  if (nit) put("nitPis", maskNIT(nit[1]), nit[0]);

  const profession = /\b(?:profiss[ãa]o|ocupa[çc][ãa]o|trabalha como|trabalhou como)[ \t]*[:\-–]?[ \t]*([^\n,;.]+)/i.exec(text);
  if (profession) {
    const value = clean(profession[1]);
    put("profession", value[0].toUpperCase() + value.slice(1), profession[0]);
  }
}

/** CEP, logradouro, número, bairro, cidade e UF. */
function extractAddress(text: string, put: Put, has: (key: SmartFieldKey) => boolean): void {
  // Endereço.
  const cep =
    /\bcep\s*(?:[:\-–]\s*)?(\d{5}-?\d{3})(?!\d)/i.exec(text) ??
    /(?<!\d)(\d{5}-\d{3})(?!\d)/.exec(text);
  if (cep) put("zipCode", maskCEP(cep[1]), cep[0]);

  const street = STREET.exec(text);
  if (street) {
    put("street", clean(street[1]), street[0]);
    if (street[2]) put("addressNumber", street[2], street[0]);
  }
  if (!has("addressNumber")) {
    const number = /\bn[ºo°]\.?\s*(\d+[a-z]?)\b/i.exec(text);
    if (number) put("addressNumber", number[1], number[0]);
  }

  const neighborhood = /\bbairro[ \t]*[:\-–]?[ \t]*([^\n,;]+)/i.exec(text);
  if (neighborhood)
    put("neighborhood", clean(neighborhood[1]), neighborhood[0]);

  const cityUf = [
    ...text.matchAll(CITY_UF),
  ].find((match) => UFS.has(match[2]));
  if (cityUf) {
    put("city", cityUf[1], cityUf[0]);
    put("state", cityUf[2], cityUf[0]);
  }
}

/** O benefício pretendido. */
function extractBenefit(text: string, put: Put): void {
  // Benefício: o primeiro tipo reconhecido, na ordem do mais específico.
  for (const [re, value] of BENEFIT_RULES) {
    const match = re.exec(text);
    if (match) {
      const label =
        BenefitOptions.find((option) => option.value === value)?.label ?? value;
      put("benefit", value, match[0], label);
      break;
    }
  }
}

export function extractClientData(input: string): ExtractedField[] {
  const text = input.replaceAll("\r", "");
  const found = new Map<
    SmartFieldKey,
    Omit<ExtractedField, "key" | "label" | "target">
  >();
  const put: Put = (key, value, source, display = value) => {
    if (!value || found.has(key)) return;
    found.set(key, { value, display, source: source.trim() });
  };

  extractContact(text, put);
  extractBirthDate(text, put);
  extractName(text, put);
  extractFamily(text, put);
  extractDocuments(text, put);
  extractAddress(text, put, (key) => found.has(key));
  extractBenefit(text, put);

  return (Object.keys(FIELDS) as SmartFieldKey[])
    .filter((key) => found.has(key))
    .map((key) => ({ key, ...FIELDS[key], ...found.get(key)! }));
}
