/**
 * A revisão do cadastro: todos os campos do formulário, com rótulo e valor
 * legível, antes de salvar.
 *
 * Função pura, como `payloads.ts` — recebe os valores das seções e devolve o
 * que a aba "Revisão" desenha. Os rótulos são os mesmos dos campos, para a
 * pessoa reconhecer na revisão o que digitou no formulário.
 *
 * Três estados por item: preenchido, vazio (opcional, mostra "—") e
 * **faltando** (obrigatório vazio). "Obrigatório" segue as mesmas regras do
 * salvamento: as três primeiras seções sempre; endereço, entrevista e
 * deficiência só quando a pessoa começou a preenchê-los.
 *
 * Rótulo, obrigatoriedade e formatação vêm do schema dos campos
 * (`schemas.ts`), o mesmo que desenha o formulário: a revisão não tem como
 * chamar um campo por outro nome.
 */
import { formatValue, type SectionSchema } from "@/components/ui/form/schema";
import { DisabilityGradeOptions } from "@/enums/disabilityGrade/DisabilityGrade";
import { DocumentTypeOptions } from "@/enums/documentType/DocumentType";
import { ageFromBirthDate } from "@/lib/validators";
import {
  hasDisabilityInput,
  type DisabilityPeriodDraft,
} from "./disabilityPeriods";
import {
  isDocumentComplete,
  isSimulationComplete,
  type StagedDocument,
  type StagedSimulation,
} from "./sections/files/types";
import {
  PERSONAL_GROUPS,
  PROFESSIONAL_GROUPS,
  addressSchema,
  personalSchema,
  professionalSchema,
  serviceSchema,
  type AddressValues,
  type InterviewValues,
  type PersonalValues,
  type ProfessionalValues,
  type ServiceValues,
} from "./schemas";
import { formatDateBR } from "@/lib/format";

type ReviewItemState = "filled" | "empty" | "missing";

export type ReviewItem = {
  label: string;
  /** Texto pronto para exibir; `""` quando vazio ou faltando. */
  value: string;
  state: ReviewItemState;
  /** Ocupa a linha inteira (texto longo, como o relato da entrevista). */
  wide?: boolean;
};

export type ReviewGroup = {
  /** "Endereço 1 · principal", "Período 2" — sem título, o grupo é a seção. */
  title?: string;
  items: ReviewItem[];
  /** Mostrado quando `items` vem vazio. */
  emptyMessage?: string;
  /**
   * Antes do rótulo na lista de pendências do rodapé, onde o campo aparece
   * fora do grupo: "Período 2 · Data de início", não só "Data de início".
   */
  qualifier?: string;
};

/** As mesmas chaves do `SECTION_KEYS` da página. */
export type ReviewSectionKey =
  | "service"
  | "disability"
  | "personal"
  | "professional"
  | "address"
  | "interview"
  | "documents";

export type ReviewSection = {
  key: ReviewSectionKey;
  title: string;
  groups: ReviewGroup[];
  /** Quantos itens obrigatórios estão vazios. */
  missing: number;
};

export type ClientReviewInput = {
  service: ServiceValues;
  personal: PersonalValues;
  professional: ProfessionalValues;
  /** Uma entrada por aba de endereço, na ordem da tela. */
  addresses: readonly {
    label: string;
    values: AddressValues;
    hasInput: boolean;
  }[];
  interview: { values: InterviewValues; hasInput: boolean };
  /** `null` quando a seção de deficiência não aparece no formulário. */
  disability: readonly DisabilityPeriodDraft[] | null;
  documents: readonly StagedDocument[];
  simulations: readonly StagedSimulation[];
};

const labelOf = (
  options: readonly { value: string; label: string }[],
  value: string,
) => (value ? (options.find((o) => o.value === value)?.label ?? value) : "");

/** `YYYY-MM-DD` (com ou sem hora) → `DD/MM/AAAA`; fora do formato, como veio. */
const dateBR = (iso: string) => formatDateBR(iso, iso);

/** `YYYY-MM-DDTHH:mm[:ss]` → `DD/MM/AAAA às HH:mm`. */
const dateTimeBR = (iso: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return match
    ? `${match[3]}/${match[2]}/${match[1]} às ${match[4]}:${match[5]}`
    : dateBR(iso);
};

const yesNo = (value: boolean) => (value ? "Sim" : "Não");

/** O relato vem do editor rico: tira as tags e junta os parágrafos. */
const plainText = (html: string) =>
  html
    .replace(/<\/(p|li|h\d|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{2,}/g, "\n")
    .trim();

/** Um item; `required` vazio vira "faltando", opcional vazio vira "—". */
const item = (
  label: string,
  value: string,
  options: { required?: boolean; wide?: boolean } = {},
): ReviewItem => {
  const text = value.trim();
  return {
    label,
    value: text,
    state: text ? "filled" : options.required ? "missing" : "empty",
    ...(options.wide ? { wide: true } : {}),
  };
};

const flag = (label: string, value: boolean): ReviewItem => ({
  label,
  value: yesNo(value),
  state: "filled",
});

/** Um campo do schema: rótulo, valor legível e obrigatoriedade saem da definição. */
const schemaItem = (
  schema: SectionSchema,
  values: Record<string, string | boolean>,
  name: string,
): ReviewItem => {
  const def = schema[name];
  return def.kind === "switch"
    ? flag(def.label, values[name] === true)
    : item(def.label, formatValue(def, values[name]), { required: Boolean(def.required) });
};

const schemaItems = (
  schema: SectionSchema,
  values: Record<string, string | boolean>,
  names: readonly string[],
) => names.map((name) => schemaItem(schema, values, name));

/** "33 anos, 11 meses e 5 dias" — só as partes preenchidas. */
const contributionTime = ({
  contributionYears: years,
  contributionMonths: months,
  contributionDays: days,
}: ProfessionalValues) => {
  const parts = [
    [years, "ano", "anos"],
    [months, "mês", "meses"],
    [days, "dia", "dias"],
  ]
    .filter(([value]) => value.trim())
    .map(
      ([value, one, many]) => `${value} ${Number(value) === 1 ? one : many}`,
    );
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
};

/** Campos do endereço na revisão — o "principal" já vai no título do grupo. */
const ADDRESS_FIELDS = Object.keys(addressSchema).filter(
  (name) => name !== "isPrimary" && name !== "cepLookup",
);

const countMissing = (groups: ReviewGroup[]) =>
  groups.reduce(
    (sum, group) =>
      sum + group.items.filter((entry) => entry.state === "missing").length,
    0,
  );

const section = (
  key: ReviewSectionKey,
  title: string,
  groups: ReviewGroup[],
): ReviewSection => ({ key, title, groups, missing: countMissing(groups) });

export function buildClientReview(input: ClientReviewInput): ReviewSection[] {
  const { service, personal, professional } = input;
  const age = ageFromBirthDate(personal.birthDate);

  const sections: ReviewSection[] = [
    section("service", "Atendimento", [
      { items: schemaItems(serviceSchema, service, Object.keys(serviceSchema)) },
    ]),
  ];

  if (input.disability) {
    const periods = input.disability.filter(hasDisabilityInput);
    sections.push(
      section(
        "disability",
        "Períodos de deficiência",
        periods.length === 0
          ? [{ items: [], emptyMessage: "Nenhum período informado." }]
          : periods.map((period, index) => ({
              title: `Período ${index + 1}`,
              qualifier: `Período ${index + 1}`,
              items: [
                item(
                  "Grau da deficiência",
                  labelOf(DisabilityGradeOptions, period.grade),
                  { required: true },
                ),
                item("Data de início", dateBR(period.startedOn), {
                  required: true,
                }),
                period.ongoing
                  ? item("Data de cessação", "Mantém-se até hoje")
                  : item("Data de cessação", dateBR(period.endedOn), {
                      required: true,
                    }),
              ],
            })),
      ),
    );
  }

  sections.push(
    section(
      "personal",
      "Dados pessoais",
      PERSONAL_GROUPS.map((group) => ({
        title: group.title,
        items: group.names.map((name) =>
          name === "age"
            ? item("Idade", age === null ? "" : `${age} anos`)
            : schemaItem(personalSchema, personal, name),
        ),
      })),
    ),
    section("professional", "Dados profissionais", [
      {
        title: PROFESSIONAL_GROUPS[0].title,
        items: schemaItems(professionalSchema, professional, PROFESSIONAL_GROUPS[0].names),
      },
      {
        title: PROFESSIONAL_GROUPS[1].title,
        items: [item("Tempo de contribuição", contributionTime(professional))],
      },
      {
        title: PROFESSIONAL_GROUPS[2].title,
        items: [
          // Nunca exibida: a revisão pode estar na tela com o cliente ao lado.
          item(
            professionalSchema.inssPassword.label,
            professional.inssPassword.trim() ? "•••••••• (preenchida)" : "",
            { required: true },
          ),
        ],
      },
    ]),
  );

  const filledAddresses = input.addresses.filter((entry) => entry.hasInput);
  sections.push(
    section(
      "address",
      "Endereço",
      filledAddresses.length === 0
        ? [{ items: [], emptyMessage: "Nenhum endereço informado." }]
        : filledAddresses.map(({ label, values }) => ({
            title: values.isPrimary ? `${label} · principal` : label,
            qualifier: label,
            items: schemaItems(addressSchema, values, ADDRESS_FIELDS),
          })),
    ),
  );

  const { values: interview, hasInput: interviewTouched } = input.interview;
  sections.push(
    section(
      "interview",
      "Entrevista",
      interviewTouched
        ? [
            {
              items: [
                item("Data e hora", dateTimeBR(interview.occurredAt)),
                item(
                  "Duração (minutos)",
                  interview.durationMinutes
                    ? `${interview.durationMinutes} min`
                    : "",
                ),
                item("Conteúdo", plainText(interview.content), {
                  required: true,
                  wide: true,
                }),
              ],
            },
          ]
        : [{ items: [], emptyMessage: "Nenhuma entrevista registrada." }],
    ),
  );

  sections.push(
    section("documents", "Arquivos", [
      {
        title: "Documentos",
        qualifier: "Tipo do arquivo",
        // Arquivo incompleto conta como pendente: no cadastro todo campo dele
        // é obrigatório (`documentErrors`/`simulationErrors`).
        items: input.documents.map((doc) =>
          item(
            doc.file.name,
            isDocumentComplete(doc)
              ? `${labelOf(DocumentTypeOptions, doc.documentType)} · ${doc.notes.trim()}`
              : "",
            { required: true },
          ),
        ),
        emptyMessage: "Nenhum documento escolhido.",
      },
      {
        title: "Simulações",
        items: input.simulations.map((simulation) =>
          item(
            simulation.file.name,
            isSimulationComplete(simulation)
              ? [
                  `de ${dateBR(simulation.simulationDate)}`,
                  `versão ${simulation.version}`,
                  `${simulation.vinculos} vínculos`,
                  simulation.isPrincipal && "principal",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "",
            { required: true },
          ),
        ),
        emptyMessage: "Nenhuma simulação escolhida.",
      },
    ]),
  );

  return sections;
}

/** Total de obrigatórios vazios no formulário inteiro. */
export const totalMissing = (sections: readonly ReviewSection[]) =>
  sections.reduce((sum, entry) => sum + entry.missing, 0);

export type MissingField = {
  key: ReviewSectionKey;
  /** Título da seção — o rodapé agrupa as pendências por ela. */
  section: string;
  label: string;
};

/** Os obrigatórios vazios, na ordem do formulário, com a seção de cada um. */
export const missingFields = (
  sections: readonly ReviewSection[],
): MissingField[] =>
  sections.flatMap(({ key, title, groups }) =>
    groups.flatMap(({ qualifier, items }) =>
      items
        .filter((entry) => entry.state === "missing")
        .map((entry) => ({
          key,
          section: title,
          label: qualifier ? `${qualifier} · ${entry.label}` : entry.label,
        })),
    ),
  );

/**
 * Para a revisão compacta: o que aparece como campo (preenchidos e
 * obrigatórios faltando) e os rótulos dos opcionais em branco, que viram uma
 * linha só ("Em branco: RG · Órgão emissor") em vez de um "—" por campo.
 */
export function splitBlankOptional(items: readonly ReviewItem[]) {
  return {
    shown: items.filter((entry) => entry.state !== "empty"),
    blank: items
      .filter((entry) => entry.state === "empty")
      .map((entry) => entry.label),
  };
}
