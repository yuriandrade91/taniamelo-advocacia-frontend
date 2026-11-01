"use client";

import type { ReactNode } from "react";
import type { SectionForm } from "@/hooks/useSectionForm";
import { ChipButton } from "@/components/ui/actions/ActionGroup";
import { TrashIcon } from "@/components/ui/icons/actions";
import { SegmentedTabs } from "@/components/ui/tabs/SegmentedTabs";
import { AddressSection } from "./AddressSection";
import type { AddressValues } from "../schemas";
import { AddItemButton } from "@/components/clients/form/FormGroup";
import { Pill } from "@/components/ui/feedback/Badges";

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

/** "principal" ao lado do nome da aba — some no azul da aba ativa. */
function PrimaryTag() {
  return (
    <span aria-hidden="true">
      <Pill
        weight="semibold"
        className="group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white"
      >
        principal
      </Pill>
    </span>
  );
}

export function AddressesSection({
  slots,
  selectedKey,
  onSelectionChange,
  canAddMore,
  onAddAddress,
  onRemoveAddresses,
  onRequestPrimary,
  renderActions,
  isReadOnly,
  isLoading,
}: Readonly<{
  slots: AddressSlot[];
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  canAddMore: boolean;
  /** Sem ele (a ficha), não há "Adicionar". */
  onAddAddress?: () => void;
  /** Abre a exclusão — um ou vários de uma vez; a página confirma. Sem ele (a ficha), não há "Excluir". */
  onRemoveAddresses?: () => void;
  /** Pedido de troca do principal — a página confirma e coordena. */
  onRequestPrimary: (slot: AddressSlot) => void;
  /** Rodapé de cada aba (botão de salvar) — quem sabe salvar é a página. A ficha grava tudo no "Salvar". */
  renderActions?: (slot: AddressSlot) => ReactNode;
  isReadOnly?: boolean;
  isLoading?: boolean;
}>) {
  // Com um endereço só não há barra: uma aba "Endereço atual" sozinha não
  // tem de quem se distinguir. As abas aparecem a partir do segundo, e com
  // elas o "Excluir" — o último endereço não se exclui.
  const actions = (
    <>
      {onRemoveAddresses && slots.length > 1 && (
        <ChipButton
          tone="danger"
          icon={<TrashIcon className="h-3.5 w-3.5" />}
          onClick={onRemoveAddresses}
        >
          Excluir endereços
        </ChipButton>
      )}
      {onAddAddress && canAddMore && (
        <AddItemButton onClick={onAddAddress}>Adicionar endereço</AddItemButton>
      )}
    </>
  );

  return (
    <SegmentedTabs
      label="Endereços do cliente"
      hideSingle
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      actions={actions}
      tabs={slots.map((slot) => ({
        id: slot.key,
        label: (
          <>
            {slot.label}
            {slot.form.values.isPrimary && <PrimaryTag />}
          </>
        ),
        content: (
          <div className="flex flex-col gap-4">
            <AddressSection
              form={slot.form}
              onRequestPrimary={() => onRequestPrimary(slot)}
              isReadOnly={isReadOnly}
              isLoading={isLoading}
            />
            {renderActions?.(slot)}
          </div>
        ),
      }))}
    />
  );
}
