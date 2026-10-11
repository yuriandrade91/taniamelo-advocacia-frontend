"use client";

import { useRef } from "react";
import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import { useClientSearch } from "@/hooks/useClientSearch";

/**
 * Cliente por busca: sugestões conforme digita (`useClientSearch`, com
 * debounce) ou texto livre.
 *
 * Escolher uma sugestão vincula o `clientId` ao nome; digitar de novo solta o
 * vínculo — o nome na tela e o id enviado nunca divergem sem ninguém notar.
 */
type ClientLink = { clientId: string; clientName: string };

export function ClientSearchField({
  value,
  onChange,
  label = "Cliente",
  isRequired,
  isDisabled,
  errorMessage,
  className,
}: {
  value: ClientLink;
  onChange: (next: ClientLink) => void;
  label?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  errorMessage?: string;
  /** A célula da grade de campos (ex.: `col-span-full`). */
  className?: string;
}) {
  /** A sugestão recém-escolhida: o ComboBox reescreve o texto com o nome dela, e isso não desfaz o vínculo. */
  const picked = useRef<ClientLink | null>(null);
  const { suggestions } = useClientSearch({
    query: value.clientName,
    linkedClientId: value.clientId,
    enabled: !isDisabled,
  });
  return (
    <div className={className}>
      <ComboBox
        aria-label={label}
        inputValue={value.clientName}
        onInputChange={(clientName) =>
          onChange({ clientName, clientId: picked.current?.clientName === clientName ? picked.current.clientId : "" })
        }
        selectedKey={value.clientId || null}
        onSelectionChange={(key) => {
          const match = suggestions.find((client) => client.id === String(key));
          if (!match?.id) return;
          picked.current = { clientId: match.id, clientName: match.fullName };
          onChange(picked.current);
        }}
        allowsCustomValue
        allowsEmptyCollection
        isRequired={isRequired}
        isInvalid={!!errorMessage}
        isDisabled={isDisabled}
      >
        <Label className="text-secondary" isRequired={isRequired} isInvalid={!!errorMessage}>
          {label}
        </Label>
        <ComboBox.InputGroup>
          <Input placeholder="Nome da pessoa" className="form-border-style" />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox
            renderEmptyState={() => (
              <div className="px-3 py-2 text-sm text-gray-100/60">Nenhum cliente cadastrado com esse nome.</div>
            )}
          >
            {suggestions.map((client) => (
              <ListBox.Item key={client.id} id={client.id ?? ""} textValue={client.fullName}>
                {client.fullName}
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      {errorMessage && <p className="mt-1 text-sm text-danger">{errorMessage}</p>}
    </div>
  );
}
