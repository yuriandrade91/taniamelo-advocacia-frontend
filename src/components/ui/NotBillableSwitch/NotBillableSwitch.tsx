"use client";

import { Switch } from "@heroui/react";

type IsentoSwitchProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
  wrapperClassName?: string;
  labelClassName?: string;
};

export default function NotBillableSwitch({
  value,
  onChange,
  disabled = false,
  label = "Cliente isento do serviço?",
  wrapperClassName = "flex flex-col gap-4 items-center justify-center",
  labelClassName = "text-primary font-medium",
}: IsentoSwitchProps) {
  return (
    <div className={wrapperClassName}>
      <p className={labelClassName}>{label}</p>
      <div className="flex gap-3 items-center">
        <p className="text-gray-500 gap-1">Não</p>
        {/* v3: o Switch envolve o primitivo do React Aria — `onValueChange`
            virou `onChange(isSelected)`. */}
        <Switch
          className={value ? "text-success" : "text-gray-100"}
          isSelected={value}
          onChange={onChange}
          isDisabled={disabled}
        >
          Sim
        </Switch>
      </div>
    </div>
  );
}
