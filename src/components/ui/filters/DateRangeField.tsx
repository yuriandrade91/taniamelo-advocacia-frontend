"use client";

import {
  DateField,
  DateRangePicker,
  I18nProvider,
  RangeCalendar,
} from "@heroui/react";
import type { CalendarDate } from "@internationalized/date";

/** Intervalo do picker: data sem hora e sem fuso — o que o filtro significa. */
export type DateRange = { start: CalendarDate; end: CalendarDate } | null;

/**
 * Filtro de período — o `DateRangePicker` completo, em pt-BR.
 *
 * - O ícone do calendário abre o campo, **à esquerda**: é onde o olho começa a
 *   ler, e o gatilho no fim ficava colado no separador da data final, parecendo
 *   pertencer só a ela.
 * - `I18nProvider locale="pt-BR"`: nomes de mês e dia, ordem dia/mês/ano e o
 *   primeiro dia da semana. Sem ele o React Aria segue o navegador (en-US).
 * - O erro de intervalo invertido aparece embaixo, em `absolute`, para não
 *   empurrar os outros filtros da linha.
 */
export function DateRangeField({
  value,
  onChange,
  error,
  className = "",
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  error?: string | null;
  className?: string;
}) {
  return (
    <div className={`relative min-w-[240px] ${className}`}>
      <I18nProvider locale="pt-BR">
        <DateRangePicker
          aria-label="Período"
          value={value}
          onChange={onChange}
          isInvalid={!!error}
          className="min-w-[240px]"
        >
          <DateField.Group className="form-border-style h-11 bg-white">
            <DateField.Prefix>
              <DateRangePicker.Trigger aria-label="Abrir calendário do período">
                <DateRangePicker.TriggerIndicator />
              </DateRangePicker.Trigger>
            </DateField.Prefix>
            <DateField.Input slot="start">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
          </DateField.Group>

          <DateRangePicker.Popover>
            <RangeCalendar className="text-gray-100">
              <RangeCalendar.Header>
                <RangeCalendar.NavButton slot="previous" />
                <RangeCalendar.Heading />
                <RangeCalendar.NavButton slot="next" />
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>
                  {(day) => (
                    <RangeCalendar.HeaderCell className="text-secondary">
                      {day}
                    </RangeCalendar.HeaderCell>
                  )}
                </RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>
                  {(date) => <RangeCalendar.Cell date={date} />}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>
      </I18nProvider>
      {error && (
        <p className="absolute top-full left-0 mt-1 text-xs whitespace-nowrap text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
