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
  /**
   * Versão estreita, para o cabeçalho de um cartão em vez do de uma página.
   *
   * Só muda tamanho: o rótulo continua "Outubro de 2026", com o ano. Cortar o
   * ano economizaria 40px e tornaria a navegação ambígua justamente em
   * dezembro–janeiro, quando ela é mais usada.
   */
  compact?: boolean;
};

const isAfter = (a: MonthRef, b: MonthRef) =>
  a.year * 12 + a.month > b.year * 12 + b.month;

export function MonthPicker({
  value,
  onChange,
  maxMonth,
  tone = "light",
  compact = false,
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

  const size = compact ? "sm" : "md";

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
      <Button
        type="button"
        size={size}
        variant={isDark ? "outline" : "secondary"}
        className={navClass}
        aria-label="Mês anterior"
        onClick={() => onChange(shiftMonth(value, -1))}
      >
        ‹
      </Button>
      <span
        className={`text-center font-medium whitespace-nowrap ${
          compact ? "min-w-32 text-xs" : "min-w-44 text-sm"
        } ${isDark ? "text-white" : "text-primary"}`}
      >
        {formatMonthLabel(value)}
      </span>
      <Button
        type="button"
        size={size}
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
