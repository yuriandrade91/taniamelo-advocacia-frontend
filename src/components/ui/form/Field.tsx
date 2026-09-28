"use client";

import React from "react";
import {
  Calendar,
  DateField,
  DatePicker,
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
}: FieldProps) {
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
      <Input
        className={`form-border-style`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        maxLength={maxLength}
        variant="primary"
      />
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger rounded-xl">{errorMessage}</p>
      ) : null}
    </TextField>
  );
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
}: SelectFieldProps) {
  return (
    <div className={className}>
      <Select
        className={`form-border-style`}
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
        <Label className="text-secondary">{label}</Label>
        <Select.Trigger className="text-gray-100">
          <Select.Value>
            {({ isPlaceholder, selectedText }) =>
              isPlaceholder ? placeholder : selectedText
            }
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
    <div className={className}>
      <Label className="text-secondary">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
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
        >
          <Switch.Content>
            <Switch.Control>
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

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function EyeOffIcon({ className = "h-4 w-4" }: { className?: string }) {
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

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
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

  const copyToClipboard = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      notificationCenter.success("Senha copiada.");
    } catch {
      notificationCenter.warning("Não foi possível copiar a senha.");
    }
  };

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
                onClick={copyToClipboard}
                aria-label="Copiar senha"
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-100 hover:bg-black/5 hover:text-primary"
              >
                <CopyIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsVisible((current) => !current)}
              aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-100 hover:bg-black/5 hover:text-primary"
            >
              {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        )}
      </div>
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger rounded-xl">{errorMessage}</p>
      ) : null}
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
      <DatePicker
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
        <DatePicker
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger">{errorMessage}</p>
      ) : null}
    </TextField>
  );
}
