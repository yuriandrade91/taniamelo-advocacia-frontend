"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Popover } from "@heroui/react";

/**
 * Valor de célula com botão de copiar e confirmação em popover.
 *
 * Estava declarado dentro de `clientes/page.tsx`, mas não tem nada de
 * específico de cliente: serve para qualquer identificador que a pessoa vá
 * colar em outro lugar (CPF, NIT/PIS, nº do benefício, protocolo).
 */

/** Tempo que a confirmação "copiado" fica na tela. */
const CONFIRMATION_MS = 1500;

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export type CopyableValueProps = {
  /** Nome do dado, usado no `aria-label` e na confirmação ("CPF copiado"). */
  label: string;
  value?: string;
};

export default function CopyableValue({ label, value }: CopyableValueProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O timer precisa morrer com o componente: trocar de página da tabela
  // desmonta a linha, e o `setState` cairia num componente já desmontado.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  if (!value || value.trim() === "") return <>-</>;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // `navigator.clipboard` exige contexto seguro (https ou localhost).
      // Em HTTP na rede local o botão simplesmente não confirma.
      return;
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
  };

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      {value}
      <Popover isOpen={copied} onOpenChange={setCopied}>
        <Button
          isIconOnly
          variant="ghost"
          aria-label={`Copiar ${label} ${value}`}
          onPress={handleCopy}
          className="h-5 w-5 min-w-5 shrink-0 text-gray-100/60 hover:text-secondary"
        >
          <CopyIcon />
        </Button>
        <Popover.Content placement="bottom">
          <span className="px-1 text-sm">{label} copiado</span>
        </Popover.Content>
      </Popover>
    </span>
  );
}
