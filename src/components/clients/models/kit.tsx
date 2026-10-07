"use client";

import { initials, plural } from "@/lib/format";
import { ActionButton as BarButton } from "@/components/ui/actions/ActionGroup";
import type { Clients } from "@/interfaces/Clients.interface";
import {
  SITUATION_ENTRIES,
  getSituationKeyByLabel,
  type SituationKey,
} from "@/enums/situation/Situation";
import { DollarCircleIcon } from "@/components/ui/icons/StatusIcons";
import {
  AlertIcon,
  SparkleIcon,
  UsersIcon,
} from "@/components/ui/icons/glyphs";
import type { Tone } from "@/components/ui/models/viz";

/**
 * Peças da lista de Clientes, também usadas pelos modelos da ficha: a cor e
 * a ordem das etapas da esteira, os selos "Potencial" e "Isento" e os estados
 * de erro e vazio.
 */

/**
 * Formatação e classificação vêm da listagem (`clients/list/clientDisplay`):
 * a lista e a ficha mostram o mesmo dado do mesmo jeito.
 */
export {
  cpfOf,
  display,
  formatDate,
  isExempt,
  isLead,
  updatedOf,
} from "@/components/clients/list/clientDisplay";
export type Theme = "light" | "dark";

// ── Identidade ──

/** Chave estável da linha: `id` → `clientId` → CPF + posição. */
export const clientKey = (client: Clients, index: number): string =>
  client.id ?? client.clientId ?? `${client.cpf || "sem-cpf"}-${index}`;

export { initials, plural };

// ── Etapas da esteira ──

export type Stage = {
  key: SituationKey | "OUTRA";
  label: string;
  short: string;
  /** 1 a 6 na ordem da esteira; 0 quando a etapa não é conhecida. */
  step: number;
  tone: Tone;
};

const STAGE_META: Record<SituationKey, { short: string; tone: Tone }> = {
  FORMULARIO_PREENCHIDO: { short: "Formulário", tone: "sky" },
  ANALISE_DOCUMENTAL: { short: "Documentos", tone: "previsto" },
  PLANEJAMENTO_EM_EXECUCAO: { short: "Planejando", tone: "violet" },
  PLANEJAMENTO_CONCLUIDO: { short: "Planejado", tone: "primary" },
  BENEFICIO_FUTURO: { short: "Futuro", tone: "secondary" },
  BENEFICIO_CONCLUIDO: { short: "Concluído", tone: "success" },
};

/** As seis etapas, na ordem fixa da esteira. */
export const STAGES: readonly Stage[] = SITUATION_ENTRIES.map(
  ([key, label], index) => ({ key, label, step: index + 1, ...STAGE_META[key] }),
);

const UNKNOWN_STAGE: Stage = {
  key: "OUTRA",
  label: "Sem etapa",
  short: "Sem etapa",
  step: 0,
  tone: "gray",
};

/** A API devolve o rótulo; aceita também a chave, por tolerância. */
export function stageOf(situation?: string): Stage {
  if (!situation) return UNKNOWN_STAGE;
  const key =
    getSituationKeyByLabel(situation) ??
    STAGES.find((s) => s.key === situation)?.key;
  return (
    STAGES.find((s) => s.key === key) ?? {
      ...UNKNOWN_STAGE,
      label: situation,
      short: situation,
    }
  );
}

/** Classes literais extras por tom (as de `viz` cobrem bg, texto e suave). */
export const TONE_BORDER: Record<Tone, string> = {
  primary: "border-primary",
  secondary: "border-secondary",
  success: "border-success",
  danger: "border-danger",
  previsto: "border-previsto",
  gray: "border-gray-100",
  sky: "border-sky-500",
  violet: "border-violet-500",
  white: "border-white",
};

// ── Selos ──

export function LeadBadge({
  theme = "light",
  className = "",
}: {
  theme?: Theme;
  className?: string;
}) {
  return (
    <span
      title="Cliente potencial — ainda não fechou com o escritório"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
        theme === "dark"
          ? "bg-secondary/20 text-amber-200"
          : "bg-light-secondary text-secondary"
      } ${className}`}
    >
      <SparkleIcon className="h-3 w-3" />
      Potencial
    </span>
  );
}

export function ExemptBadge({
  theme = "light",
  className = "",
}: {
  theme?: Theme;
  className?: string;
}) {
  return (
    <span
      title="Cliente isento do serviço"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${
        theme === "dark"
          ? "bg-success/15 text-emerald-300"
          : "bg-success/15 text-[#238C26]"
      } ${className}`}
    >
      <DollarCircleIcon className="h-3 w-3" />
      Isento
    </span>
  );
}

export function ErrorState({
  message,
  theme = "light",
  className = "",
}: {
  message: string;
  theme?: Theme;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 px-6 py-14 text-center ${className}`}
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-2xl ${
          theme === "dark" ? "bg-danger/20 text-red-300" : "bg-danger/10 text-danger"
        }`}
      >
        <AlertIcon className="h-6 w-6" />
      </span>
      <p className={`font-medium ${theme === "dark" ? "text-white" : "text-primary"}`}>
        Não foi possível carregar os clientes
      </p>
      <p className={`max-w-md text-sm ${theme === "dark" ? "text-red-300" : "text-danger"}`}>
        {message}
      </p>
    </div>
  );
}

export function EmptyState({
  onCreate,
  theme = "light",
  className = "",
}: {
  onCreate: () => void;
  theme?: Theme;
  className?: string;
}) {
  const dark = theme === "dark";
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-14 text-center ${className}`}>
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl ${
          dark ? "bg-white/10 text-secondary" : "bg-light-secondary text-secondary"
        }`}
      >
        <UsersIcon className="h-7 w-7" />
      </span>
      <p className={`font-medium ${dark ? "text-white" : "text-primary"}`}>
        Nenhum cliente encontrado
      </p>
      <p className={`max-w-sm text-sm ${dark ? "text-white/60" : "text-gray-100"}`}>
        Ajuste a busca ou os filtros — ou cadastre alguém novo.
      </p>
      <BarButton tone={dark ? "onDark" : "primary"} className="mt-1" onClick={onCreate}>
        Novo cliente
      </BarButton>
    </div>
  );
}

