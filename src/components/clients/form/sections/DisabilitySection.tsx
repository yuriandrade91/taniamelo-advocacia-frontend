"use client";

import {
  DatePickerField,
  SelectField,
  SwitchField,
} from "@/components/ui/form/Field";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import { toSelectOptions } from "@/components/ui/form/options";
import { TrashIcon } from "@/components/ui/icons/actions";
import {
  DisabilityGradeOptions,
  getDisabilityGradeLabelByKey,
} from "@/enums/disabilityGrade/DisabilityGrade";
import {
  basisFromGender,
  convertIntervals,
  formatDateBR,
  formatFactor,
} from "@/lib/disabilityTime";
import {
  convertibleIntervals,
  type DisabilityPeriodDraft,
  type DisabilityPeriodErrors,
} from "../disabilityPeriods";
import { AddItemButton, FormGroup } from "../FormSection";

/**
 * "Períodos de deficiência" — os intervalos e o tempo convertido (LC 142/2013).
 *
 * Aparece apenas quando o benefício pretendido é aposentadoria por deficiência:
 * é a única hipótese em que o grau e o tempo em cada grau mudam o requerimento.
 * Em qualquer outro benefício, a seção seria um campo a mais para ignorar.
 *
 * Como as outras seções, é apresentacional: não chama service, não valida. Quem
 * faz as duas coisas é a página — e é isso que permite reaproveitá-la na ficha
 * de edição sem arrastar a orquestração do cadastro.
 */

/** `{ id, label }` do SelectField — o `id` é a chave do enum, não um índice. */
const GRADE_OPTIONS = toSelectOptions(DisabilityGradeOptions);

export type DisabilitySectionProps = {
  periods: readonly DisabilityPeriodDraft[];
  errors: Record<string, DisabilityPeriodErrors>;
  /** Rótulo de sexo como a API devolve ("Feminino"/"Masculino"). */
  gender?: string;
  /** `YYYY-MM-DD` — o fim de um intervalo em aberto. */
  today: string;
  onChange: (key: string, patch: Partial<DisabilityPeriodDraft>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  /**
   * O papel pode excluir intervalo **gravado**? O `DELETE` é
   * `@RequerAdvogado` (ADMIN/SUPPORT): para os outros papéis o botão nem
   * aparece num intervalo salvo, em vez de oferecer um clique que volta 403.
   * Rascunho, que só existe na tela, qualquer um tira. Padrão `true`.
   */
  canDeleteSaved?: boolean;
};

export function DisabilitySection({
  periods,
  errors,
  gender,
  today,
  onChange,
  onAdd,
  onRemove,
  canDeleteSaved = true,
}: DisabilitySectionProps) {
  const basis = basisFromGender(gender);
  const convertible = convertibleIntervals(periods, today);
  const conversion =
    basis && convertible.length > 0
      ? convertIntervals(convertible, "SEM_DEFICIENCIA", basis, today)
      : null;

  return (
    <div className="flex flex-col gap-8">
      {periods.map((period, index) => {
        const fieldErrors = errors[period.key] ?? {};
        // Rascunho único não tem "Remover" (esvaziar é o mesmo que não
        // preencher); gravado tem, mesmo sozinho — senão não haveria como
        // tirar da ficha o único intervalo cadastrado.
        const removable = period.id
          ? canDeleteSaved
          : periods.length > 1;
        return (
          // Um período é um grupo, como "Identificação" ou "Contato" nas
          // outras abas: título com filete e a mesma grade de campos.
          <FormGroup
            key={period.key}
            title={
              periods.length === 1
                ? "Período de deficiência"
                : `Período ${index + 1}`
            }
            action={
              removable && (
                <ChipButton
                  tone="danger"
                  icon={<TrashIcon className="h-3.5 w-3.5" />}
                  onClick={() => onRemove(period.key)}
                >
                  Remover
                </ChipButton>
              )
            }
          >
              <SelectField
                label="Grau da deficiência"
                isRequired
                placeholder="Leve, moderada ou grave"
                options={GRADE_OPTIONS}
                selectedKey={period.grade || null}
                onSelectionChange={(key) =>
                  onChange(period.key, {
                    grade: (key ?? "") as DisabilityPeriodDraft["grade"],
                  })
                }
                isInvalid={!!fieldErrors.grade}
                errorMessage={fieldErrors.grade}
              />
              <DatePickerField
                label="Data de início"
                isRequired
                value={period.startedOn}
                onChange={(value) => onChange(period.key, { startedOn: value })}
                isInvalid={!!fieldErrors.startedOn}
                errorMessage={fieldErrors.startedOn}
              />
              <DatePickerField
                label="Data de cessação"
                value={period.ongoing ? "" : period.endedOn}
                onChange={(value) => onChange(period.key, { endedOn: value })}
                // Desabilitado, e não escondido: a pessoa precisa ver que o
                // campo existe para entender o que a chave ao lado controla.
                isDisabled={period.ongoing}
                isInvalid={!!fieldErrors.endedOn}
                errorMessage={fieldErrors.endedOn}
              />
              <SwitchField
                label="Se mantém até a presente data?"
                hint={period.ongoing ? "Sim, sem cessação" : "Não"}
                value={period.ongoing}
                onChange={(value) =>
                  // Ligar a chave limpa a data: senão um intervalo "em aberto"
                  // seguiria carregando uma cessação que a tela não mostra.
                  onChange(period.key, {
                    ongoing: value,
                    ...(value ? { endedOn: "" } : {}),
                  })
                }
              />
          </FormGroup>
        );
      })}

      <div>
        <AddItemButton onClick={onAdd}>
          Adicionar novo intervalo de deficiência
        </AddItemButton>
      </div>

      <DisabilityConversion
        conversion={conversion}
        gender={gender}
        hasBasis={!!basis}
        hasPeriods={periods.length > 0}
      />
    </div>
  );
}

/**
 * O tempo convertido, com a conta aberta.
 *
 * Aberta de propósito: este número vai para dentro de um requerimento, e quem o
 * defende precisa poder mostrar de onde saiu. Só o total obrigaria o escritório
 * a refazer a conta à mão para conferir — e aí a tela seria um palpite a mais
 * em vez de ferramenta.
 */
export function DisabilityConversion({
  conversion,
  gender,
  hasBasis,
  hasPeriods,
  source = "local",
}: {
  conversion: ReturnType<typeof convertIntervals> | null;
  gender?: string;
  hasBasis: boolean;
  hasPeriods: boolean;
  /**
   * De onde veio a conta. `local` é a prévia enquanto se digita; `server` é a
   * de `GET .../conversion`, que a ficha mostra para um cliente já gravado — e
   * a nota de rodapé diz qual das duas a pessoa está lendo.
   */
  source?: "local" | "server";
}) {
  if (!hasBasis) {
    // Sem coluna na lei, não há conversão a oferecer. Dizer isso é melhor que
    // esconder a seção: a pessoa preencheu os intervalos e precisa saber por
    // que o total não aparece.
    return (
      <p className="rounded-lg bg-light-gray/50 p-3 text-sm text-gray-100">
        {gender
          ? `A conversão de tempo da LC 142/2013 tem tabela apenas para os sexos masculino e feminino — o deste cliente está como "${gender}". Os intervalos são gravados normalmente.`
          : "Informe o sexo do cliente em Dados pessoais para calcular o tempo convertido."}
      </p>
    );
  }

  if (!conversion) {
    return hasPeriods ? (
      <p className="rounded-lg bg-light-gray/50 p-3 text-sm text-gray-100">
        Preencha o grau e a data de início para ver o tempo convertido.
      </p>
    ) : null;
  }

  return (
    <div className="rounded-lg bg-light-secondary/40 p-4">
      <p className="mb-3 text-sm font-medium text-secondary">
        Tempo convertido para a regra geral ({conversion.targetYears} anos)
      </p>

      <ul className="mb-3 flex flex-col gap-1 text-sm text-gray-100">
        {conversion.lines.map((line, index) => (
          <li key={index} className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium">
              {getDisabilityGradeLabelByKey(line.grade)}
            </span>
            <span className="text-xs">({line.gradeYears} anos)</span>
            <span>
              {line.days} dias{" "}
              {/*
                As datas do intervalo ao lado dos dias. Sem elas, três linhas
                de "1093 dias", "2198 dias", "2207 dias" não dizem a QUAL
                intervalo cada uma pertence — e é justamente conferindo o
                período que alguém descobre que digitou o ano errado.
              */}
              <span className="text-xs text-gray-100">
                ({formatDateBR(line.startedOn)} a{" "}
                {line.ongoing
                  ? `hoje, ${formatDateBR(line.endedOn)}`
                  : formatDateBR(line.endedOn)}
                )
              </span>{" "}
              × {formatFactor(line.factor)} ={" "}
              <strong>{line.convertedDays} dias</strong>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-base font-medium text-secondary">
        Total: {conversion.total.label}
        <span className="ml-2 text-xs font-normal text-gray-100">
          ({conversion.total.totalDays} dias)
        </span>
      </p>
      <p className="mt-2 text-xs text-gray-100">
        O multiplicador é o tempo exigido no destino dividido pelo exigido na
        origem (art. 3º da LC 142/2013). Cada intervalo converte pelo seu próprio
        grau antes de entrar na soma.{" "}
        {source === "server"
          ? "Calculado pelo servidor com os períodos gravados."
          : "O cálculo é conferido no servidor ao salvar."}
      </p>
    </div>
  );
}
