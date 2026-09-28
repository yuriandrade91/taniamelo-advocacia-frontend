"use client";

import { Input, Label, TextField } from "@heroui/react";
import { formatBRL, parseAmountBRL } from "@/lib/format";

/**
 * Campo de dinheiro.
 *
 * ## Por que não é máscara
 *
 * Máscara de moeda reescreve o texto enquanto se digita e move o cursor
 * sozinho — colar "1.234,56" de uma planilha costuma sair torto, e apagar um
 * dígito no meio anda o valor de casa. Aqui o campo aceita o texto como veio e
 * mostra **embaixo** como ele foi entendido: `1.234,56 → R$ 1.234,56`.
 *
 * Esse eco não é enfeite. `parseAmountBRL` precisa decidir se o ponto de
 * "1.234" é milhar ou decimal, e a diferença entre as duas leituras é de mil
 * por cento. Quem digita tem que poder ver a decisão antes de salvar, e não
 * descobrir depois no extrato.
 */

export type AmountFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
};

export function AmountField({
  label,
  value,
  onChange,
  onBlur,
  placeholder = "0,00",
  className,
  isRequired,
  isInvalid,
  errorMessage,
  isDisabled,
}: AmountFieldProps) {
  const parsed = parseAmountBRL(value);
  // O eco só aparece com valor legível e sem erro em exibição: repetir o
  // número embaixo de uma mensagem vermelha só disputa a atenção com ela.
  const showEcho = parsed !== null && parsed > 0 && !isInvalid;

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
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-100/60"
        >
          R$
        </span>
        <Input
          className="form-border-style w-full pl-10"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          // `inputMode="decimal"` abre o teclado numérico no celular sem
          // recusar ponto e vírgula, que `type="number"` faria — e `number`
          // ainda trocaria o separador conforme o locale do navegador.
          inputMode="decimal"
          variant="primary"
        />
      </div>
      {isInvalid && errorMessage ? (
        <p className="mt-1 text-sm text-danger">{errorMessage}</p>
      ) : showEcho ? (
        <p className="mt-1 text-sm text-gray-100/70" aria-live="polite">
          {formatBRL(parsed)}
        </p>
      ) : null}
    </TextField>
  );
}
