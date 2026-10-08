"use client";

import dynamic from "next/dynamic";
import { Accordion } from "@heroui/react";
import { useState } from "react";
import { useStoredChoice, useUrlParam } from "@/hooks/useStoredValue";
import type { FillModeProps } from "./shared";

/**
 * Modos de preenchimento do cadastro — EXPERIMENTAIS, e recolhidos.
 *
 * O cadastro abre sempre nas abas. Os outros modos moram num acordeão
 * fechado logo abaixo do cabeçalho ("Outras formas de preencher"): estão à
 * mão para quem quiser experimentar, sem disputar a tela com o formulário.
 * `?modo=` na URL abre direto num deles (ex.: `/clientes/novo?modo=colar`).
 *
 * Não são skins dos campos: cada um muda a forma de entrar com os dados.
 * Todos editam os mesmos formulários da página; trocar de modo não perde
 * nada, e "Salvar cliente" grava o que qualquer modo preencheu. As abas
 * continuam sendo o modo completo (deficiência, vários endereços, entrevista,
 * arquivos só existem nelas).
 */
export const FILL_MODES = [
  {
    id: "abas",
    title: "Abas",
    hint: "O formulário completo, seção por seção.",
  },
  {
    id: "peticao",
    title: "Petição viva",
    hint: "Preencha as lacunas do parágrafo de qualificação.",
  },
  {
    id: "colar",
    title: "Colar e preencher",
    hint: "Cole a mensagem do cliente; os dados se extraem.",
  },
  {
    id: "voz",
    title: "Ditado por voz",
    hint: "Fale os dados; vira texto e depois cadastro.",
  },
  {
    id: "carteirinha",
    title: "Carteirinha",
    hint: "Edite direto no cartão do cliente; ele vira.",
  },
  {
    id: "linha",
    title: "Linha da vida",
    hint: "A trajetória do cliente, com a régua de idade e contribuição.",
  },
] as const;

/** Cada modo só é baixado quando escolhido. */
const PetitionMode = dynamic(() => import("./PetitionMode").then((m) => m.PetitionMode));
const PasteMode = dynamic(() => import("./PasteMode").then((m) => m.PasteMode));
const VoiceMode = dynamic(() => import("./VoiceMode").then((m) => m.VoiceMode));
const IdCardMode = dynamic(() => import("./IdCardMode").then((m) => m.IdCardMode));
const LifelineMode = dynamic(() => import("./LifelineMode").then((m) => m.LifelineMode));

export type FillModeId = (typeof FILL_MODES)[number]["id"];


const STORAGE_KEY = "cadastro-cliente:modo";

/**
 * O modo escolhido. Sem `?modo=` na URL é sempre "abas" — uma escolha antiga
 * guardada no navegador não abre o cadastro num modo experimental; escolher
 * um modo grava o parâmetro, e ele vale até sair da página.
 */
export function useFillModeChoice() {
  const [choice, choose] = useStoredChoice<FillModeId>(
    STORAGE_KEY,
    "modo",
    FILL_MODES.map((mode) => mode.id),
    "abas",
  );
  const isChosenInUrl = useUrlParam("modo") !== null;
  return [isChosenInUrl ? choice : "abas", choose] as const;
}

const PANEL_KEY = "outros-modos";

/**
 * O seletor dentro de um acordeão fechado. Num modo experimental ele fica
 * aberto — é por ele que se volta às abas —, e fechá-lo volta às abas: nada
 * se perde, todos os modos editam os mesmos formulários.
 */
export function FillModeDisclosure({
  value,
  onChange,
}: {
  value: FillModeId;
  onChange: (mode: FillModeId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isExpanded = isOpen || value !== "abas";
  const current = FILL_MODES.find((mode) => mode.id === value);

  return (
    <Accordion
      hideSeparator
      expandedKeys={isExpanded ? [PANEL_KEY] : []}
      onExpandedChange={(keys) => {
        const next = keys.has(PANEL_KEY);
        setIsOpen(next);
        if (!next && value !== "abas") onChange("abas");
      }}
    >
      <Accordion.Item id={PANEL_KEY}>
        <Accordion.Heading>
          <Accordion.Trigger className="w-fit cursor-pointer gap-2 px-1 py-1 text-sm text-gray-100 hover:text-secondary">
            Outras formas de preencher
            {value !== "abas" && current && (
              <span className="text-secondary">· {current.title}</span>
            )}
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="px-0 pt-2">
            <FillModeSwitcher value={value} onChange={onChange} />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function FillModeSwitcher({
  value,
  onChange,
}: {
  value: FillModeId;
  onChange: (mode: FillModeId) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-xs font-semibold tracking-[0.2em] text-secondary uppercase">
        Como você quer preencher? · experimental
      </p>
      <div
        role="radiogroup"
        aria-label="Modo de preenchimento"
        className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6"
      >
        {FILL_MODES.map((mode) => {
          const isSelected = mode.id === value;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(mode.id)}
              className={`flex flex-col items-start gap-1 rounded-2xl px-4 py-3 text-left ring-1 transition active:scale-[0.98] motion-reduce:active:scale-100 ${
                isSelected
                  ? "bg-primary text-white ring-primary"
                  : "bg-white text-primary ring-light-gray hover:ring-secondary/50"
              }`}
            >
              <span className="text-sm font-semibold">{mode.title}</span>
              <span
                className={`text-xs leading-snug ${
                  isSelected ? "text-white/70" : "text-gray-100"
                }`}
              >
                {mode.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Desenha o modo escolhido (as abas ficam com a página). */
export function FillModeView({
  mode,
  ...forms
}: FillModeProps & { mode: Exclude<FillModeId, "abas"> }) {
  switch (mode) {
    case "peticao":
      return <PetitionMode {...forms} />;
    case "colar":
      return <PasteMode {...forms} />;
    case "voz":
      return <VoiceMode {...forms} />;
    case "carteirinha":
      return <IdCardMode {...forms} />;
    case "linha":
      return <LifelineMode {...forms} />;
  }
}
