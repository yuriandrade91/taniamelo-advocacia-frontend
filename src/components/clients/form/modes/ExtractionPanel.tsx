"use client";

import { useState } from "react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { notificationCenter } from "@/services/notificationService";
import type { ExtractedField, SmartFieldKey } from "./smartFill";
import { applyExtracted, currentValueOf, type FillModeProps } from "./shared";

/**
 * O que o texto revelou, antes de virar cadastro: cada dado com o trecho de
 * onde saiu e o aviso quando vai substituir algo já preenchido. A pessoa
 * desmarca o que não quiser e aplica — nada entra sozinho.
 */
export function ExtractionPanel({
  fields,
  forms,
}: {
  fields: readonly ExtractedField[];
  forms: FillModeProps;
}) {
  const [skipped, setSkipped] = useState<Set<SmartFieldKey>>(new Set());
  const chosen = fields.filter((field) => !skipped.has(field.key));

  const toggle = (key: SmartFieldKey) =>
    setSkipped((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const apply = () => {
    applyExtracted(chosen, forms);
    notificationCenter.success(
      `${chosen.length} dado${chosen.length === 1 ? "" : "s"} aplicado${chosen.length === 1 ? "" : "s"} ao cadastro.`,
      { description: "Confira nas abas ou na Revisão." },
    );
  };

  return (
    <section
      aria-label="Dados reconhecidos"
      className="flex flex-col rounded-3xl bg-white ring-1 ring-light-gray"
    >
      <header className="flex items-baseline justify-between gap-3 px-6 pt-6 pb-3">
        <h3 className="text-base font-semibold text-primary">
          {fields.length === 0
            ? "Nada reconhecido ainda"
            : `Encontrei ${fields.length} dado${fields.length === 1 ? "" : "s"}`}
        </h3>
        {fields.length > 0 && (
          <span className="text-xs text-gray-100">
            {chosen.length} para aplicar
          </span>
        )}
      </header>

      {fields.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-gray-100/80">
          Rótulos ajudam: “CPF:”, “mãe:”, “nasc.”, “cel”, “Rua …”, o nome do
          benefício. E-mail, CPF com pontos e CEP com hífen são reconhecidos
          mesmo sem rótulo.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 px-3 pb-3">
          {fields.map((field) => {
            const isOn = !skipped.has(field.key);
            const current = currentValueOf(field, forms);
            const replaces = current && current !== field.value;
            return (
              <li key={field.key}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                    isOn ? "hover:bg-page" : "opacity-50 hover:bg-page"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => toggle(field.key)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs text-gray-100">
                        {field.label}
                      </span>
                      <span className="text-sm font-semibold break-words text-primary">
                        {field.display}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-gray-100/60 italic">
                      “{field.source}”
                    </span>
                    {replaces && (
                      <span className="mt-0.5 block text-[11px] text-secondary">
                        substitui “{current}”
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto px-6 pb-6">
        <ActionGroup>
          <ActionButton
            tone="primary"
            grow
            disabled={chosen.length === 0}
            onClick={apply}
          >
            Aplicar ao cadastro
          </ActionButton>
        </ActionGroup>
      </div>
    </section>
  );
}
