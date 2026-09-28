import React from "react";
import { Chip } from "@heroui/react";

// Mapeamento de status para cor do Chip

type ChipColor = string;

const situationMap: Record<string, { color: ChipColor }> = {
    "Formulário preenchido": {
        color: "bg-blue-500 text-white",
    },
    "Análise documental": {
        color: "bg-yellow-400 text-yellow-900",
    },
    "Planejamento em execução": {
        color: "bg-[#63c0f6] text-white",
    },
    "Planejamento concluído": {
        color: "bg-green-500 text-white",
    },
    "Benefício futuro": {
        color: "bg-[#E7E3DE] text-secondary",
    },
    "Benefício concluído": {
        color: "bg-[#6AE76E33] text-[#238C26]",
    },
};

export function SituationChips({ situations }: { situations: string[] }) {
  if (!Array.isArray(situations)) return null;
  return (
    <div className="flex gap-4 flex-wrap">
      {situations.map((situation) => {
        const entry = situationMap[situation] ?? { color: "bg-gray-100 text-white" };
        return (
          <Chip key={situation} className={`${entry.color}`}>
            {situation}
          </Chip>
        );
      })}
    </div>
  );
}
