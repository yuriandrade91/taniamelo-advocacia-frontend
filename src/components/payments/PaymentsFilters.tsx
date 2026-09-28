"use client";

import { Button, Input, Label } from "@heroui/react";
import { Field, MultiSelectField } from "@/components/ui/form/Field";
import { PaymentMethodOptions, PaymentStatusOptions } from "@/enums/payment/Payment";

/**
 * Barra de filtros dos recebimentos.
 *
 * Controlada de ponta a ponta: quem guarda o estado e dispara a busca é a
 * página. O componente não conhece service nem paginação — é o mesmo princípio
 * das seções do formulário de cliente, e o que permite testar a página sem
 * montar a barra e vice-versa.
 *
 * As opções de status e método usam a **chave** do enum como `id`
 * (`toSelectOptions`), não índice posicional: é a chave que vai na query
 * string, e o `EnumLabelSupport` do backend resolve nome ou label.
 */

export type PaymentsFiltersValue = {
  searchTerm: string;
  dueFrom: string;
  dueTo: string;
  status: string[];
  paymentMethod: string[];
};

export const EMPTY_FILTERS: PaymentsFiltersValue = {
  searchTerm: "",
  dueFrom: "",
  dueTo: "",
  status: [],
  paymentMethod: [],
};

/** `true` quando algum filtro está ativo — habilita o "Limpar". */
export const hasActiveFilters = (value: PaymentsFiltersValue) =>
  Boolean(
    value.searchTerm.trim() ||
      value.dueFrom ||
      value.dueTo ||
      value.status.length ||
      value.paymentMethod.length,
  );

const STATUS_OPTIONS = PaymentStatusOptions.map((option) => ({
  id: option.value,
  label: option.label,
}));
const METHOD_OPTIONS = PaymentMethodOptions.map((option) => ({
  id: option.value,
  label: option.label,
}));

export type PaymentsFiltersProps = {
  value: PaymentsFiltersValue;
  onChange: (next: PaymentsFiltersValue) => void;
  onClear: () => void;
};

export function PaymentsFilters({
  value,
  onChange,
  onClear,
}: PaymentsFiltersProps) {
  const set = <K extends keyof PaymentsFiltersValue>(
    key: K,
    next: PaymentsFiltersValue[K],
  ) => onChange({ ...value, [key]: next });

  return (
    <div className="rounded-t-2xl bg-primary px-5 py-4">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <Label className="text-white/70">Buscar</Label>
          <Input
            className="form-border-style bg-white"
            placeholder="Cliente ou descrição"
            value={value.searchTerm}
            onChange={(event) => set("searchTerm", event.target.value)}
          />
        </div>

        <Field
          label="Vence de"
          type="date"
          value={value.dueFrom}
          onChange={(event) => set("dueFrom", event.target.value)}
        />
        <Field
          label="Vence até"
          type="date"
          value={value.dueTo}
          onChange={(event) => set("dueTo", event.target.value)}
        />

        <MultiSelectField
          label="Status"
          options={STATUS_OPTIONS}
          selectedKeys={value.status}
          onSelectionChange={(keys) => set("status", keys)}
        />
        <div className="flex items-end gap-3">
          <MultiSelectField
            className="flex-1"
            label="Forma"
            options={METHOD_OPTIONS}
            selectedKeys={value.paymentMethod}
            onSelectionChange={(keys) => set("paymentMethod", keys)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 border-white text-white"
            isDisabled={!hasActiveFilters(value)}
            onPress={onClear}
          >
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
}
