"use client";

import type { ReactNode } from "react";
import { Tabs } from "@heroui/react";
import type { SectionForm } from "@/hooks/useSectionForm";
import { PlusIcon } from "@/components/ui/icons/actions";
import { AddressSection, type AddressValues } from "./AddressSection";

/**
 * Um endereço na lista de abas: até 3 no total (o atual + 2 adicionais), cada
 * um com seu próprio `SectionForm` — cada aba grava num `POST
 * /clients/{id}/addresses` independente, então cada uma precisa do seu
 * próprio estado de formulário e validação.
 */
export type AddressSlot = {
  key: string;
  label: string;
  form: SectionForm<AddressValues>;
};

function AddAddressButton({ onAddAddress }: { onAddAddress: () => void }) {
  return (
    <button
      type="button"
      onClick={onAddAddress}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-secondary/50 px-3 py-1.5 text-xs font-medium text-secondary hover:bg-light-secondary"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      Adicionar endereço
    </button>
  );
}

export function AddressesSection({
  slots,
  selectedKey,
  onSelectionChange,
  canAddMore,
  onAddAddress,
  onRequestPrimary,
  renderActions,
}: {
  slots: AddressSlot[];
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  canAddMore: boolean;
  onAddAddress: () => void;
  /** Pedido de troca do principal — a página confirma e coordena. */
  onRequestPrimary: (slot: AddressSlot) => void;
  /** Rodapé de cada aba (botão de salvar) — quem sabe salvar é a página. */
  renderActions: (slot: AddressSlot) => ReactNode;
}) {
  const only = slots.length === 1 ? slots[0] : null;

  // Com um único endereço não há entre o quê escolher — a barra de abas some
  // e sobra só o botão de adicionar, sem pill nenhum para o "atual".
  if (only) {
    return (
      <div className="flex flex-col gap-4">
        {canAddMore && (
          <div className="flex justify-end">
            <AddAddressButton onAddAddress={onAddAddress} />
          </div>
        )}
        <AddressSection
          form={only.form}
          onRequestPrimary={() => onRequestPrimary(only)}
        />
        {renderActions(only)}
      </div>
    );
  }

  return (
    // O botão de adicionar precisa ficar FORA de `Tabs` como wrapper direto:
    // o CSS do variant `secondary` mira `.tabs--secondary > .tabs__list-container`
    // (combinador de filho direto). Um `div` entre os dois pra alinhar o botão
    // quebra essa relação e o variant nunca aplica — a barra fica com a cara
    // do `primary` mesmo com a prop certa.
    <div className="relative">
      <Tabs
        variant="secondary"
        selectedKey={selectedKey}
        onSelectionChange={(key) => onSelectionChange(String(key))}
      >
        <Tabs.ListContainer className={canAddMore ? "pr-40" : undefined}>
          <Tabs.List aria-label="Endereços do cliente">
            {slots.map((slot) => (
              <Tabs.Tab key={slot.key} id={slot.key}>
                {slot.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {slots.map((slot) => (
          <Tabs.Panel key={slot.key} id={slot.key} className="pt-4">
            <div className="flex flex-col gap-4">
              <AddressSection
                form={slot.form}
                onRequestPrimary={() => onRequestPrimary(slot)}
              />
              {renderActions(slot)}
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>

      {canAddMore && (
        <div className="absolute right-0 top-1">
          <AddAddressButton onAddAddress={onAddAddress} />
        </div>
      )}
    </div>
  );
}
