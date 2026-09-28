"use client";

import { Button } from "@heroui/react";
import { formatMonthLabel, shiftMonth, type MonthRef } from "@/lib/period";

/**
 * Navegação de mês da Carteira.
 *
 * O mês é o par (ano, mês), nunca um intervalo de datas: derivar o intervalo
 * do mês é trivial, o contrário não. E a aritmética de virada de ano fica em
 * `shiftMonth`, testada, em vez de espalhada em `if (month > 12)`.
 */

export type MonthPickerProps = {
  value: MonthRef;
  onChange: (next: MonthRef) => void;
  /** Impede navegar para meses futuros. */
  maxMonth?: MonthRef;
  /**
   * `dark` para uso sobre o azul da marca (o cabeçalho de página).
   *
   * Existe porque o rótulo do mês é `text-primary` — o próprio azul do cartão.
   * No claro isso está certo; no escuro o mês simplesmente desaparecia, e o
   * componente ficava dois botões com um vazio no meio.
   */
  tone?: "light" | "dark";
};

const isAfter = (a: MonthRef, b: MonthRef) =>
  a.year * 12 + a.month > b.year * 12 + b.month;

export function MonthPicker({
  value,
  onChange,
  maxMonth,
  tone = "light",
}: MonthPickerProps) {
  const next = shiftMonth(value, 1);
  const canGoForward = !maxMonth || !isAfter(next, maxMonth);
  const isDark = tone === "dark";

  /**
   * No escuro os botões viram contorno branco — o mesmo tratamento que as
   * barras de filtro já usam sobre azul. `disabled:opacity-30` mantém o botão
   * de avançar visível quando travado no mês atual: sumir com ele mudaria a
   * largura do controle a cada navegação.
   */
  const navClass = isDark
    ? "border-white/40 text-white hover:bg-white/10 disabled:opacity-30"
    : "";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isDark ? "outline" : "secondary"}
        className={navClass}
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        ‹
      </Button>
      <span
        className={`min-w-44 text-center text-sm font-medium ${
          isDark ? "text-white" : "text-primary"
        }`}
      >
        {formatMonthLabel(value)}
      </span>
      <Button
        type="button"
        variant={isDark ? "outline" : "secondary"}
        className={navClass}
        aria-label="Próximo mês"
        isDisabled={!canGoForward}
        onClick={() => onChange(next)}
      >
        ›
      </Button>
    </div>
  );
}
