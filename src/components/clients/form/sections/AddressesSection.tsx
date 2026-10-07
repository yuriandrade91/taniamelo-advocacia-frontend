"use client";

import type { ReactNode } from "react";
import { Tabs } from "@heroui/react";
import type { SectionForm } from "@/hooks/useSectionForm";
import { AddressSection } from "./AddressSection";
import type { AddressValues } from "../schemas";
import { AddItemButton } from "../FormSection";
import {
  TAB_CLASS,
  TAB_INDICATOR_CLASS,
  TAB_LIST_CLASS,
  TAB_LIST_CONTAINER_CLASS,
} from "../tabs/tabStyle";

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
  return (
    // As abas no padrão do cadastro (`tabStyle`), mesmo com um endereço só:
    // a aba "Endereço atual" diz de qual endereço são os campos.
    //
    // A barra ocupa a largura toda, como a das seções: estreita, o HeroUI a
    // trata como rolável e esmaece o texto da direita. O "Adicionar" fica
    // dentro dela, à direita — fora do `Tabs`, por cima, porque não é aba.
    <div className="relative">
      {/* `key` pela quantidade: o indicador do HeroUI é medido em JS e, com
          a aba nova nascendo já selecionada, ficava com a medida velha (por
          cima das duas abas). Remontar mede de novo; o estado dos endereços
          mora na página, nada se perde. */}
      <Tabs
        key={slots.length}
        selectedKey={selectedKey}
        onSelectionChange={(key) => onSelectionChange(String(key))}
        className="gap-5"
      >
        <Tabs.ListContainer
          className={`${TAB_LIST_CONTAINER_CLASS} ${canAddMore ? "pr-48" : ""}`}
        >
          <Tabs.List aria-label="Endereços do cliente" className={TAB_LIST_CLASS}>
            {slots.map((slot) => (
              <Tabs.Tab key={slot.key} id={slot.key} className={TAB_CLASS}>
                {slot.label}
                {slot.form.values.isPrimary && (
                  <span
                    aria-hidden="true"
                    className="rounded-full bg-light-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white"
                  >
                    principal
                  </span>
                )}
                <Tabs.Indicator className={TAB_INDICATOR_CLASS} />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {slots.map((slot) => (
          <Tabs.Panel key={slot.key} id={slot.key} className="p-0">
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
        <div className="absolute top-2.5 right-3">
          <AddItemButton onClick={onAddAddress}>Adicionar endereço</AddItemButton>
        </div>
      )}
    </div>
  );
}
