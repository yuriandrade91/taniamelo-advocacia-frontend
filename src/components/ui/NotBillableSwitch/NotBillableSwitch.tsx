import { Switch } from "@heroui/switch";

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
        <Switch
          size="md"
          color={value ? "success" : "default"}
          className={value ? "text-success" : "text-gray-500"}
          classNames={{ label: value ? "!text-success" : "!text-gray-500" }}
          isSelected={value}
          onValueChange={onChange}
          isDisabled={disabled}
        >
          Sim
        </Switch>
      </div>
    </div>
  );
}
