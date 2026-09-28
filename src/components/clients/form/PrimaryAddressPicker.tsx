"use client";

import { useEffect, useState } from "react";
import { Button, Modal, WarningIcon } from "@heroui/react";

/**
 * Escolha do próximo endereço principal, ao excluir o que é principal hoje.
 *
 * Excluir o principal não pode simplesmente apagar: o cliente ficaria sem
 * principal, estado que o backend recusa (ele força o primeiro endereço a ser
 * principal) e que a lista não saberia ordenar — o `list` ordena por
 * `isPrimary desc`. Então a exclusão e a escolha do sucessor são **uma
 * decisão só**, e é isso que este diálogo representa.
 *
 * Com um único endereço restante a lista tem uma opção só, já marcada: vira
 * uma confirmação, não uma escolha. Preferi manter o mesmo diálogo a criar um
 * caminho separado — dois fluxos para a mesma decisão é como eles divergem.
 *
 * **Radio nativo, não o do HeroUI.** O `Radio` da lib é composto
 * (`Root`/`Content`/`Control`/`Indicator`) e eu não tenho como verificar a
 * montagem visualmente nesta sessão. `input[type=radio]` com `label` tem
 * semântica e navegação por teclado garantidas pelo próprio navegador; a
 * aparência é estilizada por cima. Se depois alguém confirmar a composição da
 * lib na tela, trocar aqui é local.
 */

export type PrimaryAddressOption = {
  /** Índice da aba. */
  index: number;
  label: string;
  /** Resumo do endereço, para diferenciar abas com o mesmo rótulo. */
  hint?: string;
};

export type PrimaryAddressPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Rótulo do endereço que está sendo excluído. */
  removingLabel: string;
  options: PrimaryAddressOption[];
  onConfirm: (nextPrimaryIndex: number) => void;
};

export default function PrimaryAddressPicker({
  isOpen,
  onClose,
  removingLabel,
  options,
  onConfirm,
}: PrimaryAddressPickerProps) {
  const [selected, setSelected] = useState<number | null>(null);

  // Repõe a pré-seleção a cada abertura: reaproveitar a escolha da vez
  // anterior faria o diálogo abrir apontando para uma aba que pode nem existir
  // mais depois da remoção passada.
  useEffect(() => {
    if (isOpen) setSelected(options[0]?.index ?? null);
  }, [isOpen, options]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop
        variant="opaque"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]">
          <Modal.Dialog className="sm:max-w-[460px]">
            <Modal.CloseTrigger />

            <Modal.Header>
              <Modal.Icon className="bg-secondary/10 text-secondary">
                <WarningIcon className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Qual passa a ser o principal?</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              <p className="mt-1 text-sm text-gray-100/70">
                <span className="font-medium">{removingLabel}</span> é o
                endereço principal. Escolha quem assume antes de excluir.
              </p>

              <fieldset className="mt-4 flex flex-col gap-2">
                <legend className="sr-only">Próximo endereço principal</legend>
                {options.map((option) => (
                  <label
                    key={option.index}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      selected === option.index
                        ? "border-secondary bg-light-secondary"
                        : "border-light-gray hover:border-secondary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="next-primary-address"
                      className="mt-1 accent-[var(--color-secondary)]"
                      value={option.index}
                      checked={selected === option.index}
                      onChange={() => setSelected(option.index)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-primary">
                        {option.label}
                      </span>
                      {option.hint && (
                        <span className="block truncate text-xs text-gray-100">
                          {option.hint}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
            </Modal.Body>

            <Modal.Footer>
              <Button
                className="w-full"
                type="button"
                variant="danger"
                isDisabled={selected === null}
                onClick={() => {
                  if (selected === null) return;
                  onConfirm(selected);
                  onClose();
                }}
              >
                Excluir e definir principal
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Manter
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
