"use client";

import type { ComponentType } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";

/**
 * Modelos de visualização — o estudo visual das telas, no padrão da Agenda.
 *
 * A página continua dona dos dados, dos filtros, dos modais e das ações; o
 * modelo só decide o **desenho**. Assim os dez modelos de uma tela discordam
 * apenas no visual, e escolher um deles não muda regra nenhuma.
 *
 * `Component: null` é o "Atual": a página desenha o que já desenhava, sem
 * passar por aqui — é o padrão, e é nele que os e2e rodam.
 */
export type ViewModel<P> = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  Component: ComponentType<P> | null;
  /**
   * Fora da numeração do seletor, como o "Atual" — para uma versão nova
   * entrar na fita sem renumerar os modelos que já se discute pelo número.
   */
  unnumbered?: boolean;
};

/**
 * O modelo escolhido, lembrado por navegador (`useStoredValue`). Sem escolha
 * salva (ou com uma que não existe mais), vale `defaultId` — o de agora, e não
 * o da primeira renderização: em Relatórios o padrão é a primeira aba da ordem
 * do usuário, que só se conhece depois de ler o storage.
 */
export function useViewModel<M extends { id: string }>(
  storageKey: string,
  models: readonly M[],
  defaultId: string = models[0]?.id ?? "atual",
) {
  const [chosenId, choose] = useStoredValue(storageKey);
  const model =
    models.find((m) => m.id === chosenId) ??
    models.find((m) => m.id === defaultId) ??
    models[0];
  return { model, modelId: model.id, choose: (id: string) => choose(id) };
}

/** Seletor dos modelos: fita rolável de pílulas com ícone e número. */
export function ViewModelPicker<P>({
  models,
  value,
  onChange,
  label = "Modelo de visualização",
}: {
  models: readonly ViewModel<P>[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 ring-1 ring-black/5 [scrollbar-width:none]"
    >
      {models.map((model) => {
        const Icon = model.icon;
        const active = model.id === value;
        const number = model.unnumbered || model.id === "atual"
          ? 0
          : models
              .filter((m) => !m.unnumbered && m.id !== "atual")
              .indexOf(model) + 1;
        return (
          <button
            key={model.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(model.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
              active
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "text-gray-100 hover:bg-page hover:text-primary"
            }`}
          >
            <Icon className="h-4 w-4" />
            {number > 0 && (
              <span className={active ? "text-secondary" : "text-gray-100/50"}>
                {number}
              </span>
            )}
            {model.label}
          </button>
        );
      })}
    </div>
  );
}
