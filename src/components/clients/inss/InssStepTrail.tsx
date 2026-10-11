"use client";

import { StatusBadge, Pill, type BadgeTone } from "@/components/ui/feedback/Badges";
import CopyableValue from "@/components/ui/table/CopyableValue";
import { Timeline, TimelineItem, TimelineMeta } from "@/components/ui/list/Timeline";
import { formatDateBR, plural } from "@/lib/format";
import type { InssStepResponse } from "@/services/clientInssStepService";
import {
  INSS_STAGES,
  INSS_TONE,
  inssStatusOf,
  inssStepKeyOf,
  stepCounts,
  type InssTone,
} from "./inssSteps";

/**
 * O andamento no INSS, para ler: onde o processo está, a esteira das seis
 * etapas e a linha do tempo dos eventos — no desenho do "Andamento do
 * benefício", que é a esteira irmã desta.
 *
 * A esteira marca as etapas pelas quais o processo **já passou** (✓) e
 * destaca a atual na cor dela; não há "próxima", porque o INSS não segue uma
 * ordem fixa (ver `inssSteps.ts`).
 */

const STATUS_TONE: Record<InssTone, BadgeTone> = {
  waiting: "neutral",
  action: "warning",
  granted: "success",
  denied: "danger",
};

/** Cor do nó na esteira e da bolinha na linha do tempo — pela etapa. */
const NODE: Record<InssTone, string> = {
  waiting: "bg-secondary text-white",
  action: "bg-previsto text-white",
  granted: "bg-success text-white",
  denied: "bg-danger text-white",
};

const DOT: Record<InssTone, string> = {
  waiting: "bg-secondary ring-secondary/20",
  action: "bg-previsto ring-previsto/20",
  granted: "bg-success ring-success/20",
  denied: "bg-danger ring-danger/20",
};

const toneOf = (step: string): InssTone => {
  const key = inssStepKeyOf(step);
  return key ? INSS_TONE[key] : "waiting";
};

export function InssStepTrail({
  items,
  today,
  authors = {},
}: {
  /** Do mais recente para o mais antigo (`latestFirst`). */
  items: readonly InssStepResponse[];
  today: string;
  /** Índice `id do usuário -> nome`, de `useOfficeAuthors`. */
  authors?: Record<string, string>;
}) {
  const status = inssStatusOf(items, today);
  const counts = stepCounts(items);

  return (
    <div className="flex flex-col gap-5">
      {status && (
        <div className="flex flex-col gap-4 rounded-2xl bg-page p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusBadge label={status.label} tone={STATUS_TONE[status.tone]} />
            <p className="text-sm text-primary">{status.phrase}</p>
            <p className="text-xs text-gray-100">
              desde {formatDateBR(status.since)}
              {status.openDays !== null &&
                ` · aberta há ${plural(status.openDays, "dia", "dias")}`}
            </p>
          </div>

          <ol aria-label="Etapas do INSS" className="grid grid-cols-3 gap-y-3 sm:grid-cols-6">
            {INSS_STAGES.map((stage) => {
              const count = counts[stage.key] ?? 0;
              const isCurrent = status.key === stage.key;
              const state = isCurrent ? "atual" : count > 0 ? "já aconteceu" : "não aconteceu";
              return (
                <li
                  key={stage.key}
                  aria-label={`${stage.label} (${state})`}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <span className="relative grid h-7 w-7 place-items-center">
                    {isCurrent && status.tone !== "granted" && status.tone !== "denied" && (
                      <span
                        className={`absolute inset-0 rounded-full opacity-40 motion-safe:animate-halo ${NODE[status.tone]}`}
                      />
                    )}
                    <span
                      className={`relative grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${
                        isCurrent
                          ? NODE[status.tone]
                          : count > 0
                            ? "bg-light-green text-success-strong"
                            : "bg-white text-gray-100 ring-1 ring-light-gray"
                      }`}
                    >
                      {count > 0 && !isCurrent ? "✓" : stage.step}
                    </span>
                  </span>
                  <span
                    className={`text-[11px] leading-tight ${
                      isCurrent ? "font-semibold text-primary" : count > 0 ? "text-primary" : "text-gray-100"
                    }`}
                  >
                    {stage.label}
                    {count > 1 && <span className="text-gray-100"> ×{count}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <Timeline label="Eventos no INSS">
        {items.map((entry, index) => {
          const isCurrent = index === 0;
          return (
            <TimelineItem
              key={entry.id}
              dotClassName={DOT[toneOf(entry.step)]}
              isCurrent={isCurrent}
              isLast={index === items.length - 1}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`min-w-0 text-sm text-primary ${isCurrent ? "font-semibold" : "font-medium"}`}
                >
                  {entry.step}
                </span>
                {isCurrent && (
                  <Pill tone="solid" weight="semibold">
                    atual
                  </Pill>
                )}
              </div>
              {entry.protocol && (
                <p className="text-xs text-gray-100">
                  Protocolo <CopyableValue label="protocolo" value={entry.protocol} />
                </p>
              )}
              {entry.notes && (
                <p className="text-sm whitespace-pre-line text-gray-100">{entry.notes}</p>
              )}
              <TimelineMeta
                date={formatDateBR(entry.occurredOn)}
                author={authors[entry.createdByUserId ?? ""]}
              />
            </TimelineItem>
          );
        })}
      </Timeline>
    </div>
  );
}
