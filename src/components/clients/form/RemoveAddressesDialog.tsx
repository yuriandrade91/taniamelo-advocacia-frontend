"use client";

import { useState } from "react";
import { Checkbox } from "@heroui/react";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { useResetOnOpen } from "@/hooks/useResetOnOpen";
import { Pill } from "@/components/ui/feedback/Badges";

/**
 * Exclusão de endereços do cadastro — um ou vários de uma vez.
 *
 * Um endereço fica sempre: a caixa do último não marcado trava. Excluir o
 * principal e escolher o sucessor são **uma decisão só** — sem principal, o
 * backend recusa (ele força o primeiro endereço a ser principal) e a lista,
 * ordenada por `isPrimary desc`, não teria como ordenar. Então, marcado o
 * principal, a mesma modal pergunta quem assume; sobrando um só, ele assume
 * sem pergunta.
 *
 * **Radio nativo** na escolha do sucessor: `input[type=radio]` com `label` tem
 * semântica e teclado garantidos pelo navegador, e a aparência vem por cima.
 */

export type AddressOption = {
  /** Índice da aba. */
  index: number;
  label: string;
  /** Resumo do endereço, para diferenciar abas com o mesmo rótulo. */
  hint: string;
  isPrimary: boolean;
};

export type RemoveAddressesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  options: AddressOption[];
  /**
   * `nextPrimary` na numeração **anterior** à remoção; ausente quando o
   * principal fica.
   */
  onConfirm: (removed: number[], nextPrimary?: number) => void;
};

/** A moldura de uma opção: marcada, ganha o dourado da seleção. */
const optionClass = (isSelected: boolean) =>
  `flex items-start gap-3 rounded-xl border p-3 transition ${
    isSelected
      ? "border-secondary bg-light-secondary"
      : "border-light-gray hover:border-secondary/50"
  }`;

function OptionText({ option }: { option: AddressOption }) {
  return (
    <span className="min-w-0">
      <span className="flex items-center gap-2 text-sm font-medium text-primary">
        {option.label}
        {option.isPrimary && (
          <Pill weight="semibold">principal</Pill>
        )}
      </span>
      <span className="block truncate text-xs text-gray-100">{option.hint}</span>
    </span>
  );
}

export default function RemoveAddressesDialog({
  isOpen,
  onClose,
  options,
  onConfirm,
}: RemoveAddressesDialogProps) {
  const [removed, setRemoved] = useState<number[]>([]);
  const [chosenPrimary, setChosenPrimary] = useState<number | null>(null);

  // Cada abertura começa do zero: a marcação da vez anterior apontaria para
  // abas que já mudaram de posição.
  useResetOnOpen(isOpen, () => {
    setRemoved([]);
    setChosenPrimary(null);
  });

  const remaining = options.filter((option) => !removed.includes(option.index));
  const removesPrimary = options.some(
    (option) => option.isPrimary && removed.includes(option.index),
  );
  /** `undefined`: o principal fica. `null`: falta escolher quem assume. */
  const successor = !removesPrimary
    ? undefined
    : remaining.length === 1
      ? remaining[0].index
      : (remaining.find((option) => option.index === chosenPrimary)?.index ?? null);

  const toggle = (index: number) =>
    setRemoved((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index],
    );

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(removed, successor ?? undefined)}
      tone="danger"
      heading="Excluir endereços"
      confirmLabel={
        removed.length > 1 ? `Excluir ${removed.length} endereços` : "Excluir endereço"
      }
      cancelLabel="Manter"
      isConfirmDisabled={removed.length === 0 || successor === null}
      description="Marque os que saem. Os já gravados saem da ficha, sem como desfazer; um endereço fica sempre."
    >
      <ul aria-label="Endereços a excluir" className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const isChecked = removed.includes(option.index);
          return (
            <li key={option.index} className={optionClass(isChecked)}>
              <Checkbox
                isSelected={isChecked}
                isDisabled={!isChecked && remaining.length === 1}
                onChange={() => toggle(option.index)}
                className="w-full cursor-pointer items-start"
              >
                <Checkbox.Content className="items-start gap-3">
                  <Checkbox.Control className="mt-0.5">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <OptionText option={option} />
                </Checkbox.Content>
              </Checkbox>
            </li>
          );
        })}
      </ul>

      {removesPrimary && remaining.length > 1 && (
        <fieldset className="mt-5 flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-primary">
            Qual passa a ser o principal?
          </legend>
          {remaining.map((option) => (
            <label
              key={option.index}
              className={`cursor-pointer ${optionClass(successor === option.index)}`}
            >
              <input
                type="radio"
                name="next-primary-address"
                className="mt-1 accent-[var(--color-secondary)]"
                value={option.index}
                checked={successor === option.index}
                onChange={() => setChosenPrimary(option.index)}
              />
              <OptionText option={option} />
            </label>
          ))}
        </fieldset>
      )}

      {removesPrimary && remaining.length === 1 && (
        <p className="mt-4 text-sm text-gray-100">
          <span className="font-medium text-primary">{remaining[0].label}</span>{" "}
          passa a ser o principal.
        </p>
      )}
    </ConfirmDialog>
  );
}
