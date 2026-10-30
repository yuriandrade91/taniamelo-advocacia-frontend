"use client";

import { HBarList, type Tone } from "@/components/charts/svgCharts";
import { REQUEST_STAGE_TONE, type RequestStageTone } from "@/components/clients/stage/requestStages";
import { plural } from "@/lib/format";
import type { RequestStageCount, SituationCount } from "./reportSeries";
import { SeriesGate } from "./views/ReportBlocks";

/**
 * Onde os clientes estão hoje, nas duas esteiras: a do escritório (situação
 * do benefício) e a do INSS (etapa do requerimento).
 *
 * Fica acima da visão aberta, e por isso vem primeiro em todas elas: é a
 * pergunta de todo dia ("quantos estão em exigência?"), e cada visão desenha
 * o resto do seu jeito. Uma barra por etapa, na ordem de leitura de cada
 * esteira — no INSS, o deferimento por último, e cada etapa na cor do seu
 * andamento (a mesma do selo da lista).
 */

const INSS_TONE: Record<RequestStageTone, Tone> = {
  waiting: "secondary",
  action: "previsto",
  granted: "success",
  denied: "danger",
};

export function ClientStagesSection({
  situations,
  requestStages,
  isLoading,
}: Readonly<{
  situations: SituationCount[];
  requestStages: RequestStageCount[];
  isLoading: boolean;
}>) {
  return (
    <section aria-label="Clientes por etapa" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium text-primary">Clientes por etapa</h2>
        <span className="text-xs text-gray-100">situação do benefício · situação no INSS · hoje</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StageCard
          title="Situação do benefício"
          where="na esteira"
          empty="Nenhum cliente cadastrado."
          isLoading={isLoading}
          items={situations.map((s) => ({ label: s.label, value: s.count, tone: "primary" as const }))}
        />
        <StageCard
          title="Situação no INSS"
          where="com requerimento no INSS"
          empty="Nenhum cliente com requerimento no INSS."
          isLoading={isLoading}
          items={requestStages.map((s) => ({ label: s.label, value: s.count, tone: INSS_TONE[REQUEST_STAGE_TONE[s.key]] }))}
        />
      </div>
    </section>
  );
}

function StageCard({
  title,
  where,
  empty,
  isLoading,
  items,
}: Readonly<{
  title: string;
  where: string;
  empty: string;
  isLoading: boolean;
  items: { label: string; value: number; tone: Tone }[];
}>) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <article className="rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-primary">{title}</h3>
        {!isLoading && (
          <span className="text-[11px] text-gray-100">
            {plural(total, "cliente", "clientes")} {where}
          </span>
        )}
      </header>
      <SeriesGate loading={isLoading} hasData={total > 0} empty={empty} loadingClassName="h-48">
        {() => <HBarList items={items} />}
      </SeriesGate>
    </article>
  );
}
