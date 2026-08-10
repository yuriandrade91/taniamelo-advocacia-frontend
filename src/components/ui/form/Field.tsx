"use client";

import React from "react";
import {
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";

/**
 * Campos de formulário no padrão HeroUI v3.
 *
 * No v3 o `Input` virou primitivo e o `Select` virou compound. Estes wrappers
 * concentram a composição (`TextField > Label + Input + FieldError`) para que as
 * telas continuem declarativas, como eram no v2.
 *
 * Props do v2 que deixaram de existir (`variant`, `size`, `radius`, `color`,
 * `classNames`) foram substituídas por classes Tailwind.
 */

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
      <Label className="text-secondary">{label}</Label>
      <Input
        className="text-gray-100"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        maxLength={maxLength}
      />
      {isInvalid && errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
    </TextField>
  );
}

export type SelectFieldOption = { id: string; label: string };

export type SelectFieldProps = {
  label: string;
  options: readonly SelectFieldOption[];
  /** Chave selecionada (v3 usa `selectedKey`, no singular). */
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
      <Label className="text-secondary">{label}</Label>
      <Select
        selectedKey={selectedKey ?? null}
        onSelectionChange={(key) => onSelectionChange(key == null ? "" : String(key))}
        isRequired={isRequired}
        isInvalid={isInvalid}
        isDisabled={isDisabled}
      >
        <Select.Trigger className="text-gray-100">
          <Select.Value>
            {({ isPlaceholder, selectedText }) =>
              isPlaceholder ? placeholder : selectedText
            }
          </Select.Value>
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
      {isInvalid && errorMessage ? (
        <p className="text-sm text-danger mt-1">{errorMessage}</p>
      ) : null}
    </div>
  );
}
