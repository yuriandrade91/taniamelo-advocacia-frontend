"use client";

import type { Ref } from "react";
import { Skeleton } from "@heroui/react";
import {
  DatePickerField,
  DateTimePickerField,
  Field,
  PasswordField,
  SelectField,
  SwitchField,
  TextAreaField,
} from "./Field";
import { AmountField } from "./AmountField";
import { FIELD_STRATEGIES, type SectionSchema } from "./schema";
import type { FormValues, SectionForm } from "@/hooks/useSectionForm";

/**
 * Desenha campos de um schema (`defineSection`) ligados a um `useSectionForm`:
 * máscara na digitação, erro depois de visitado, obrigatoriedade no rótulo.
 *
 * A seção decide a ordem e os agrupamentos; aqui só se desenha o campo pedido.
 * `isReadOnly` vira a ficha em modo leitura com o mesmo schema.
 */

/** Classes literais: o Tailwind não gera classe montada por interpolação. */
const SPAN_CLASS = { 2: "sm:col-span-2", 4: "sm:col-span-2 lg:col-span-4" } as const;

type SchemaFieldProps<V extends FormValues> = {
  /** Carregando: o rótulo de verdade e o valor em skeleton, na altura do controle. */
  isLoading?: boolean;
  form: SectionForm<V>;
  name: keyof V & string;
  /** Schema da seção — o do `form` quando omitido. */
  schema?: SectionSchema;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  /**
   * Obrigatoriedade só da tela, quando o schema não a alcança: a data da
   * liquidação é exigida enquanto a caixa ao lado estiver marcada, e marcá-la
   * `required` no schema cobraria o campo até escondido.
   */
  isRequired?: boolean;
  className?: string;
  /** Linha de apoio sob o campo; no switch, a dica ao lado do rótulo. */
  description?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Avisado depois de gravar o valor (ex.: CEP dispara a consulta). */
  onValueChange?: (value: string) => void;
};

export function SchemaField<V extends FormValues>({
  form,
  name,
  schema = form.schema,
  isReadOnly,
  isDisabled,
  isRequired: isRequiredProp,
  className,
  description,
  inputRef,
  onValueChange,
  isLoading,
}: SchemaFieldProps<V>) {
  const def = schema?.[name];
  if (!def) throw new Error(`Campo "${name}" fora do schema.`);
  const strategy = FIELD_STRATEGIES[def.kind];
  const value = form.values[name];
  const error = form.errorOf(name);
  const isRequired = (isRequiredProp ?? Boolean(def.required)) && !isReadOnly;
  const classes = [def.span ? SPAN_CLASS[def.span] : "", className].filter(Boolean).join(" ") || undefined;
  const set = (next: string | boolean) => {
    form.setField(name, next as V[typeof name]);
    onValueChange?.(String(next));
  };
  const setText = (raw: string) => set(strategy.mask ? strategy.mask(raw) : raw);
  const touch = () => form.touchField(name);
  const invalid = { isInvalid: !!error, errorMessage: error };
  // Em leitura, vazio é "—": o exemplo de preenchimento passaria por dado.
  const placeholder = isReadOnly ? "—" : def.placeholder;

  if (isLoading) return <FieldSkeleton label={def.label} isSwitch={strategy.control === "switch"} className={classes} />;

  switch (strategy.control) {
    case "switch":
      return (
        <SwitchField
          className={classes}
          label={def.label}
          value={value === true}
          hint={description}
          isDisabled={isReadOnly || isDisabled}
          onChange={set}
        />
      );
    case "amount":
      return (
        <AmountField
          className={classes}
          label={def.label}
          isRequired={isRequired}
          placeholder={placeholder}
          value={value as string}
          isDisabled={isReadOnly || isDisabled}
          onChange={set}
          onBlur={touch}
          {...invalid}
        />
      );
    case "textarea":
      return (
        <TextAreaField
          className={classes}
          label={def.label}
          isRequired={isRequired}
          placeholder={placeholder}
          rows={def.rows}
          maxLength={def.maxLength}
          value={value as string}
          isDisabled={isReadOnly || isDisabled}
          onChange={set}
          onBlur={touch}
          {...invalid}
        />
      );
    case "select":
      return (
        <SelectField
          className={classes}
          label={def.label}
          isRequired={isRequired}
          options={def.options ?? []}
          placeholder={placeholder}
          selectedKey={(value as string) || null}
          isDisabled={isReadOnly || isDisabled}
          onSelectionChange={(key) => {
            set(key);
            touch();
          }}
          {...invalid}
        />
      );
    case "date":
      return (
        <DatePickerField
          className={classes}
          label={def.label}
          isRequired={isRequired}
          allowFuture={def.allowFuture}
          value={value as string}
          isDisabled={isReadOnly || isDisabled}
          onChange={set}
          onBlur={touch}
          {...invalid}
        />
      );
    case "datetime":
      return (
        <DateTimePickerField
          className={classes}
          label={def.label}
          isRequired={isRequired}
          value={value as string}
          isDisabled={isReadOnly || isDisabled}
          onChange={set}
          onBlur={touch}
          {...invalid}
        />
      );
    case "password":
      return (
        <PasswordField
          className={classes}
          label={def.label}
          isRequired={isRequired}
          isReadOnly={isReadOnly}
          isDisabled={isDisabled}
          placeholder={placeholder}
          value={value as string}
          onChange={(event) => setText(event.target.value)}
          onBlur={touch}
          {...invalid}
        />
      );
    default:
      return (
        <Field
          className={classes}
          label={def.label}
          type={strategy.inputType}
          isRequired={isRequired}
          isReadOnly={isReadOnly}
          isDisabled={isDisabled}
          placeholder={placeholder}
          maxLength={def.maxLength ?? strategy.maxLength}
          value={value as string}
          onChange={(event) => setText(event.target.value)}
          onBlur={touch}
          description={description}
          inputRef={inputRef}
          {...invalid}
        />
      );
  }
}

/** Um campo carregando: o rótulo fixo e o valor em skeleton, no tamanho do controle. */
export function FieldSkeleton({ label, isSwitch, className }: { label: string; isSwitch?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-secondary">{label}</p>
      <Skeleton className={`mt-1 rounded-xl ${isSwitch ? "h-6 w-24" : "h-10 w-full"}`} />
    </div>
  );
}
