"use client";

import { Button } from "@heroui/react";
import { notificationCenter } from "@/services/notificationService";
import { CopyIcon } from "@/components/ui/icons/glyphs";

/**
 * Valor de célula com botão de copiar — a confirmação sai em toast.
 *
 * Serve para qualquer identificador que a pessoa vá colar em outro lugar
 * (CPF, NIT/PIS, nº do benefício, protocolo).
 *
 * ## Por que toast, e não o popover ao lado do botão
 *
 * O popover precisava de estado, de timer para sumir e de limpar esse timer
 * quando a linha desmontava (trocar de página da tabela). E aparecia colado
 * na célula, cobrindo a linha de baixo. O toast é o canal de confirmação do
 * resto da aplicação: some sozinho, não cobre dado e não deixa estado para
 * trás no componente — que volta a ser só apresentação.
 */

/**
 * Copia e avisa. Exportada para quem precisar do mesmo comportamento sem o
 * botão desta célula.
 *
 * `navigator.clipboard` só existe em contexto seguro (https ou localhost): em
 * HTTP na rede local ele falta, e antes o botão simplesmente não fazia nada.
 * Agora a pessoa sabe que precisa copiar à mão.
 */
export async function copyToClipboard(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    notificationCenter.success(`${label} copiado`, { description: value });
  } catch {
    notificationCenter.danger(`Não foi possível copiar o ${label}`, {
      description: "O navegador bloqueou a área de transferência. Selecione e copie o valor manualmente.",
    });
  }
}

export type CopyableValueProps = {
  /** Nome do dado, usado no `aria-label` e na confirmação ("CPF copiado"). */
  label: string;
  value?: string;
};

export default function CopyableValue({ label, value }: CopyableValueProps) {
  // Mesmo traço de campo vazio do resto das listagens ("—", não "-").
  if (!value || value.trim() === "") return <>—</>;

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {value}
      <Button
        isIconOnly
        variant="ghost"
        aria-label={`Copiar ${label} ${value}`}
        onPress={() => void copyToClipboard(label, value)}
        className="h-5 w-5 min-w-5 shrink-0 text-gray-100/60 hover:text-secondary"
      >
        <CopyIcon />
      </Button>
    </span>
  );
}
