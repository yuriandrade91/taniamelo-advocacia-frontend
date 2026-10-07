"use client";

import React from "react";
import {
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  I18nProvider,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@heroui/react";
import {
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  today,
} from "@internationalized/date";
import { notificationCenter } from "@/services/notificationService";

export type FieldProps = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  maxLength?: number;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  onBlur?: () => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /**
   * Texto de apoio sob o campo, quando não há erro. Para avisos que não
   * bloqueiam o envio — "buscando endereço…", "CEP não encontrado" — e que,
   * pintados de vermelho, pareceriam um erro a corrigir antes de salvar.
   */
  description?: string;
  /** Para quem precisa mover o foco até o campo (ex.: o Número, depois do CEP). */
  inputRef?: React.Ref<HTMLInputElement>;
  /**
   * Botões dentro do campo, à direita — o olho e o copiar da senha. Com eles
   * o `Input` passa a morar num embrulho posicionado, com espaço reservado à
   * direita para os ícones não sentarem em cima do valor.
   */
  trailing?: React.ReactNode;
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
  type,
  maxLength,
  isRequired,
  isInvalid,
  errorMessage,
  onBlur,
  isDisabled,
  isReadOnly,
  description,
  inputRef,
  trailing,
}: FieldProps) {
  const input = (
    <Input
      ref={inputRef}
      className={`form-border-style${trailing ? " w-full pr-16" : ""}`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      maxLength={maxLength}
      variant="primary"
    />
  );

  return (
    <TextField
      className={className}
      type={type}
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      <Label
        className="text-secondary"
        isRequired={isRequired}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
      >
        {label}
      </Label>
      {/* O embrulho `relative` e o `w-full` do `Input`: ver o comentário do
          `PasswordField`, que é a mesma composição. */}
      {trailing ? (
        <div className="relative">
          {input}
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {trailing}
          </div>
        </div>
      ) : (
        input
      )}
      <FieldMessage isInvalid={isInvalid} errorMessage={errorMessage} description={description} />
    </TextField>
  );
}

/**
 * Erro ou texto de apoio sob um campo de texto — ligado ao campo
 * (`aria-describedby`) pelos `FieldError`/`Description` do HeroUI, para o
 * leitor de tela anunciar a mensagem junto do campo que errou.
 */
function FieldMessage({
  isInvalid,
  errorMessage,
  description,
}: {
  isInvalid?: boolean;
  errorMessage?: string;
  description?: string;
}) {
  if (isInvalid && errorMessage) return <FieldError className="mt-1 text-sm text-danger">{errorMessage}</FieldError>;
  if (description) {
    return (
      <Description className="mt-1 text-sm text-gray-100" aria-live="polite">
        {description}
      </Description>
    );
  }
  return null;
}

export type SelectFieldOption = { id: string; label: string };

export type MultiSelectFieldProps = {
  label: string;
  options: readonly SelectFieldOption[];
  /** Chaves selecionadas. */
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  /** Esconde o `Label` — útil em barras de filtro, onde o placeholder basta. */
  hideLabel?: boolean;
};

/**
 * Select de múltipla escolha.
 *
 * O `Select` do HeroUI v3 **suporta** `selectionMode="multiple"` (o tipo é
 * `Select<T, M extends "single" | "multiple">`). A página de clientes usava
 * `Popover` + `ListBox` como contorno, de quando eu tinha concluído que o v3
 * era single-only — era engano, e o contorno perdia o trigger, o indicador e o
 * resumo da seleção que o `Select` já traz prontos.
 */
export function MultiSelectField({
  label,
  options,
  selectedKeys,
  onSelectionChange,
  placeholder = "Selecione",
  className,
  isDisabled,
  hideLabel = false,
}: MultiSelectFieldProps) {
  /**
   * Rótulos das opções escolhidas, na ordem em que aparecem na lista (e não
   * na ordem de clique) — assim o texto do gatilho não muda de arranjo a cada
   * seleção.
   */
  const selectedLabels = options
    .filter((option) => selectedKeys.includes(option.id))
    .map((option) => option.label)
    .join(", ");

  return (
    <div className={className}>
      {!hideLabel && <Label className="text-secondary">{label}</Label>}
      {/*
        Em `selectionMode="multiple"` a API é `value`/`onChange` — não
        `selectedKey`/`onSelectionChange`, que o React Stately marca como
        deprecated e tipa só para modo único (`Key | null`).
      */}
      <Select
        selectionMode="multiple"
        aria-label={label}
        value={selectedKeys}
        onChange={(keys) => onSelectionChange(keys.map(String))}
        isDisabled={isDisabled}
      >
        <Select.Trigger className="form-border-style h-auto py-1.5 text-gray-100">
          {/*
            Mostra os RÓTULOS escolhidos, não uma contagem: "por idade,
            por invalidez…" diz o que está filtrado; "(2)" obriga a abrir o
            select para descobrir.

            O rótulo do campo fica em cima, pequeno, porque o valor toma a
            linha principal — sem isso o usuário perde de vista qual filtro é.
          */}
          <span className="flex min-w-0 flex-col items-start">
            <span className="text-[11px] leading-tight text-gray-100/60">
              {label}
            </span>
            <span className="w-full truncate text-left text-sm leading-tight">
              {selectedLabels || placeholder}
            </span>
          </span>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {options.map((opt) => (
              <ListBox.Item key={opt.id} id={opt.id}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

export type SelectFieldProps = {
  label: string;
  options: readonly SelectFieldOption[];
  selectedKey: string | null;
  onSelectionChange: (key: string) => void;
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  /**
   * Rótulo pequeno dentro do gatilho, como o `MultiSelectField` — para as
   * barras de filtro, onde os dois ficam lado a lado e um rótulo por fora
   * desalinhava a linha (e sumia na barra escura).
   */
  labelInside?: boolean;
};

export function SelectField({
  label,
  options,
  selectedKey,
  onSelectionChange,
  placeholder = "Selecione",
  className,
  isRequired,
  isInvalid,
  errorMessage,
  isDisabled,
  labelInside = false,
}: SelectFieldProps) {
  return (
    <div className={className}>
      <Select
        className="w-full"
        value={selectedKey || null}
        onChange={(key) => onSelectionChange(key == null ? "" : String(key))}
        isRequired={isRequired}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
      >
        {/*
          O rótulo fica DENTRO do `Select`. Fora dele era só texto solto: o
          React Aria não tinha como ligar um ao outro, e o nome acessível do
          controle virava o placeholder — "Selecione", sem dizer o quê. Quem usa
          leitor de tela ouvia "Selecione, botão" num formulário com oito
          selects, e `getByLabel("Tipo")` não encontrava nada.
        */}
        {/* Com `labelInside`, o `Label` continua aqui — é ele que dá nome
            acessível ao controle — e só sai de vista. */}
        <Label className={labelInside ? "sr-only" : "text-secondary"}>
          {label}
        </Label>
        {/*
          A borda fica no TRIGGER, não no `Select`.

          No `Select` ela envolvia também o `Label`, e a caixa saía ~30px mais
          alta e começando mais acima que a de um `Field` na mesma linha da
          grade — "Tipo de endereço" flutuando sobre "CEP", "Gênero" sobre
          "Órgão emissor". Não era espaçamento a acertar: era a borda em volta
          de conteúdo diferente. `Field` já desenhava no `Input` e
          `MultiSelectField` no trigger; este era o único fora do padrão.

          O `Label` continua DENTRO do `Select` (ver acima) — a correção é de
          onde a borda é pintada, não de onde o rótulo mora.
        */}
        <Select.Trigger
          className={`form-border-style w-full text-gray-100 ${
            labelInside ? "h-auto py-1.5" : ""
          }`}
        >
          <Select.Value>
            {({ isPlaceholder, selectedText }) => {
              const text = isPlaceholder ? placeholder : selectedText;
              return labelInside ? (
                <span className="flex min-w-0 flex-col items-start">
                  <span
                    aria-hidden="true"
                    className="text-[11px] leading-tight text-gray-100/60"
                  >
                    {label}
                  </span>
                  <span className="w-full truncate text-left text-sm leading-tight">
                    {text}
                  </span>
                </span>
              ) : (
                text
              );
            }}
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox className="text-gray-100">
            {options.map((opt) => (
              <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
                {opt.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {isInvalid && errorMessage ? (
        <p className="text-sm text-danger mt-1">{errorMessage}</p>
      ) : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Controles adicionais do formulário de cliente.
 *
 * Ficam aqui, junto de `Field`/`SelectField`, para que exista **um** lugar
 * onde o rótulo, a borda, o espaçamento e a mensagem de erro são decididos.
 * Espalhar `<Switch>` e `<TextArea>` crus pelas telas é como o formulário de
 * cliente acumulou estilos divergentes.
 * ──────────────────────────────────────────────────────────────── */

export type SwitchFieldProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  /** Texto ao lado do controle (ex.: "Sim"). */
  hint?: string;
  className?: string;
  isDisabled?: boolean;
};

export function SwitchField({
  label,
  value,
  onChange,
  hint,
  className,
  isDisabled,
}: SwitchFieldProps) {
  return (
    // `switch-field`: âncora de `formFields.css`, que põe o controle dentro
    // da mesma moldura dos outros campos.
    <div className={["switch-field", className].filter(Boolean).join(" ")}>
      <Label className="text-secondary">{label}</Label>
      <div className="switch-field__row mt-2 flex items-center gap-2">
        {/* v3: o Switch envolve o primitivo do React Aria — `onValueChange`
            virou `onChange(isSelected)`. Sem `Switch.Content`/`Switch.Control`/
            `Switch.Thumb` o controle não desenhava trilho nem bolinha, só o
            texto passado como children. O `Label` acima já rotula o campo,
            então aqui é o padrão "without label" da HeroUI: `aria-label` no
            lugar de um `Label` dentro do `Switch.Content`. */}
        <Switch
          aria-label={label}
          isSelected={value}
          onChange={onChange}
          isDisabled={isDisabled}
          className="group"
        >
          <Switch.Content>
            {/* Ligado é o verde do sucesso, o mesmo do "Sim" ao lado. */}
            <Switch.Control className="group-data-[selected=true]:bg-success">
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
        <span className={value ? "text-success" : "text-gray-100"}>
          {hint ?? (value ? "Sim" : "Não")}
        </span>
      </div>
    </div>
  );
}

export function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 10.5 8 10.5 8a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6C3.4 8.6 1.5 12 1.5 12s3.5 8 10.5 8a10.9 10.9 0 0 0 5.4-1.4M9.9 14.1a3 3 0 0 0 4.2-4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

export function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * Botão de ícone dentro de um campo (o olho, o copiar). Exportado porque o
 * `InssPasswordField` monta os mesmos dois na senha do "meu inss", e dois
 * tamanhos de alvo de clique no mesmo controle seria o começo de um dialeto.
 */
export const FIELD_ICON_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-full text-gray-100 hover:bg-black/5 hover:text-primary disabled:opacity-60 disabled:hover:bg-transparent";

/**
 * Copia uma senha e confirma em toast.
 *
 * Não é o `copyToClipboard` de `CopyableValue`: aquele põe o valor copiado na
 * descrição do toast ("CPF copiado · 123…"), que para senha significa
 * reimprimi-la na tela — e num canto que fica alguns segundos depois de o
 * campo já ter voltado para a máscara.
 */
export async function copiarSenha(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    notificationCenter.success("Senha copiada.");
  } catch {
    notificationCenter.warning("Não foi possível copiar a senha.", {
      description:
        "O navegador bloqueou a área de transferência. Selecione e copie o valor manualmente.",
    });
  }
}

export type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  onBlur?: () => void;
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

/**
 * Campo de senha com alterna show/hide.
 *
 * O ícone de copiar só aparece com a senha visível — copiar às cegas convida a
 * colar a senha errada em outro lugar sem perceber.
 */
export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  className,
  maxLength,
  isRequired,
  isInvalid,
  errorMessage,
  onBlur,
  isDisabled,
  isReadOnly,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <TextField
      className={className}
      type={isVisible ? "text" : "password"}
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
    >
      <Label
        className="text-secondary"
        isRequired={isRequired}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
      >
        {label}
      </Label>
      {/*
        `w-full` explícito: `.textfield` é `flex flex-col` e normalmente
        estica o `Input` (filho direto) a largura toda via `align-items:
        stretch`. Envolvê-lo neste `div` para posicionar os ícones tira o
        `Input` de filho direto do flex — sem `w-full` ele volta ao tamanho
        intrínseco do browser e os ícones, ancorados no `div` (que continua
        largura total), ficam flutuando fora da borda do campo.
      */}
      <div className="relative">
        <Input
          className="form-border-style w-full pr-16"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          maxLength={maxLength}
          variant="primary"
        />
        {/* Sem senha digitada não há o que mostrar nem copiar — os dois
            botões só fazem sentido com o campo preenchido. */}
        {value && (
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {isVisible && (
              <button
                type="button"
                onClick={() => void copiarSenha(value)}
                aria-label="Copiar senha"
                className={FIELD_ICON_BUTTON_CLASS}
              >
                <CopyIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsVisible((current) => !current)}
              aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
              className={FIELD_ICON_BUTTON_CLASS}
            >
              {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        )}
      </div>
      <FieldMessage isInvalid={isInvalid} errorMessage={errorMessage} />
    </TextField>
  );
}

export type DatePickerFieldProps = {
  label: string;
  /** ISO `YYYY-MM-DD`, ou `""` sem data escolhida — o formato que o backend espera. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  onBlur?: () => void;
  /**
   * Libera datas futuras. O padrão trava em hoje porque o primeiro uso foi
   * data de nascimento — mas vencimento futuro é o caso normal de uma conta a
   * pagar, e travar o calendário ali seria impedir o uso principal do campo.
   */
  allowFuture?: boolean;
};

/**
 * Data (heroui.com/.../date-picker#usage) — mesma composição manual do
 * `DatePicker` de `AppointmentFormFields`, mas com `CalendarDate` (só dia, sem
 * hora) em vez de `CalendarDateTime`, e com o seletor de ano do anatomy da
 * doc: sem ele, ir de hoje até o ano de nascimento seria mês a mês.
 */
export function DatePickerField({
  label,
  value,
  onChange,
  className,
  isRequired,
  isInvalid,
  errorMessage,
  isDisabled,
  onBlur,
  allowFuture = false,
}: DatePickerFieldProps) {
  const calendarValue = React.useMemo(() => {
    if (!value) return null;
    try {
      return parseDate(value);
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div className={className}>
      {/* pt-BR: sem o provider, os segmentos saem no formato do navegador
          (mm/dd/yyyy num Chrome em inglês) — o DateTimePickerField já tinha. */}
      <I18nProvider locale="pt-BR">
        {/*
          `w-full`: o `DatePicker` não ocupa a largura do container sozinho, e o
          `fullWidth` do `DateField.Group` estica o grupo dentro de um pai que
          continuava do tamanho do conteúdo. O campo ficava com metade da coluna
          — "Data de nascimento" parando no meio do espaço de "Idade".
        */}
        <DatePicker
          className="w-full"
          value={calendarValue}
          onChange={(next) => onChange(next ? next.toString() : "")}
          // Ninguém nasce no futuro — trava direto no calendário, não só no
          // validador. Com `allowFuture`, o limite sai: vencimento é para frente.
          maxValue={allowFuture ? undefined : today(getLocalTimeZone())}
          isRequired={isRequired}
          isInvalid={isInvalid}
          isDisabled={isDisabled}
          onBlur={onBlur}
        >
          <Label className="text-secondary" isRequired={isRequired}>
            {label}
          </Label>
          <DateField.Group fullWidth className="form-border-style">
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover>
            <Calendar aria-label={label} className="text-gray-100">
              <Calendar.Header>
                <Calendar.YearPickerTrigger>
                  <Calendar.YearPickerTriggerHeading />
                  <Calendar.YearPickerTriggerIndicator />
                </Calendar.YearPickerTrigger>
                <Calendar.NavButton slot="previous" className="text-gray-100" />
                <Calendar.NavButton slot="next" className="text-gray-100" />
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day) => (
                    <Calendar.HeaderCell className="text-secondary">
                      {day}
                    </Calendar.HeaderCell>
                  )}
                </Calendar.GridHeader>
                <Calendar.GridBody>
                  {(date) => <Calendar.Cell date={date} />}
                </Calendar.GridBody>
              </Calendar.Grid>
              <Calendar.YearPickerGrid>
                <Calendar.YearPickerGridBody>
                  {({ year }) => <Calendar.YearPickerCell year={year} />}
                </Calendar.YearPickerGridBody>
              </Calendar.YearPickerGrid>
            </Calendar>
          </DatePicker.Popover>
        </DatePicker>
      </I18nProvider>
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export type DateTimePickerFieldProps = {
  label: string;
  /**
   * ISO sem fuso, `YYYY-MM-DDTHH:mm`, ou `""` sem data escolhida — o mesmo
   * formato que o `datetime-local` nativo devolvia, então `toInterviewRequest`
   * (que faz `new Date(value).toISOString()`) continua funcionando sem mudar.
   */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  onBlur?: () => void;
};

/**
 * Data + hora (heroui.com/.../date-picker) — mesma composição de
 * `AppointmentFormFields`, com `CalendarDateTime` (`granularity="minute"`)
 * em vez do `CalendarDate` só-dia do `DatePickerField`.
 */
export function DateTimePickerField({
  label,
  value,
  onChange,
  className,
  isRequired,
  isInvalid,
  errorMessage,
  isDisabled,
  onBlur,
}: DateTimePickerFieldProps) {
  const calendarValue = React.useMemo(() => {
    if (!value) return null;
    try {
      return parseDateTime(value);
    } catch {
      return null;
    }
  }, [value]);

  return (
    <div className={className}>
      <I18nProvider locale="pt-BR">
        {/* `w-full` pelo mesmo motivo do DatePickerField — ver lá. */}
        <DatePicker
          className="w-full"
          value={calendarValue}
          onChange={(next) => onChange(next ? next.toString() : "")}
          granularity="minute"
          hourCycle={24}
          isRequired={isRequired}
          isInvalid={isInvalid}
          isDisabled={isDisabled}
          onBlur={onBlur}
        >
          <Label className="text-secondary" isRequired={isRequired}>
            {label}
          </Label>
          <DateField.Group fullWidth className="form-border-style">
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover>
            <Calendar aria-label={label} className="text-gray-100">
              <Calendar.Header>
                <Calendar.Heading />
                <Calendar.NavButton
                  slot="previous"
                  className="text-gray-100"
                />
                <Calendar.NavButton slot="next" className="text-gray-100" />
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day) => (
                    <Calendar.HeaderCell className="text-secondary">
                      {day}
                    </Calendar.HeaderCell>
                  )}
                </Calendar.GridHeader>
                <Calendar.GridBody>
                  {(date) => <Calendar.Cell date={date} />}
                </Calendar.GridBody>
              </Calendar.Grid>
            </Calendar>
          </DatePicker.Popover>
        </DatePicker>
      </I18nProvider>
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  onBlur?: () => void;
  isDisabled?: boolean;
  /** Teto de caracteres. Presente, o campo mostra quanto falta. */
  maxLength?: number;
};

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  isRequired,
  isInvalid,
  errorMessage,
  onBlur,
  isDisabled,
  maxLength,
}: TextAreaFieldProps) {
  return (
    <TextField
      className={className}
      isRequired={isRequired}
      isInvalid={isInvalid}
      isDisabled={isDisabled}
    >
      <Label className="text-secondary" isRequired={isRequired}>
        {label}
      </Label>
      <TextArea
        className="form-border-style"
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {/*
        O contador fica na mesma linha da mensagem: embaixo dela, ele empurra
        o campo seguinte quando aparece um erro. Fica apagado até sobrar pouco
        — avisar o tempo todo em vermelho é ruído, e quem está escrevendo duas
        linhas não precisa saber de teto nenhum.
      */}
      <div className="flex items-start justify-between gap-2">
        <FieldMessage isInvalid={isInvalid} errorMessage={errorMessage} />
        {maxLength !== undefined && (
          <p
            // `polite` e só perto do fim: ler a contagem a cada tecla
            // atrapalha quem usa leitor de tela.
            aria-live="polite"
            className={`mt-1 shrink-0 text-xs tabular-nums ${
              value.length >= maxLength ? "text-danger" : "text-gray-100/60"
            }`}
          >
            {value.length >= maxLength - 40
              ? `${value.length}/${maxLength} caracteres`
              : `${value.length}/${maxLength}`}
          </p>
        )}
      </div>
    </TextField>
  );
}
