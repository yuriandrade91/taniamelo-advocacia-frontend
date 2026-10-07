"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import {
  ChartBarIcon,
  DonutIcon,
  GaugeIcon,
  LayersIcon,
  TimelineIcon,
} from "@/components/ui/icons/glyphs";
import type { ReportViewProps } from "./types";

/**
 * As visões de Relatórios — o mesmo dado, cinco jeitos de ler. Todas começam
 * pelo financeiro (para quem pode vê-lo) e seguem para clientes e agenda.
 *
 * Cada visão é carregada só quando é aberta: a Visão geral traz o Chart.js, as
 * outras desenham com SVG próprio — ninguém paga o JS das quatro que não vê.
 *
 * Os `id`s são os do estudo de onde elas saíram e ficam assim de propósito:
 * são a chave guardada no navegador (`relatorios:modelo` e a ordem em
 * `relatorios:ordem`); trocá-los mandaria todo mundo de volta para a primeira
 * aba. A ordem desta lista é a padrão; o usuário reordena as abas.
 */
export type ReportView = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  Component: ComponentType<ReportViewProps>;
};

export const REPORT_VIEWS: ReportView[] = [
  {
    id: "atual",
    label: "Visão geral",
    icon: ChartBarIcon,
    Component: dynamic(() => import("./OverviewView").then((m) => m.OverviewView)),
  },
  {
    id: "executivo",
    label: "Indicadores",
    icon: GaugeIcon,
    Component: dynamic(() => import("./IndicatorsView").then((m) => m.IndicatorsView)),
  },
  {
    id: "funil",
    label: "Jornada do cliente",
    icon: LayersIcon,
    Component: dynamic(() => import("./JourneyView").then((m) => m.JourneyView)),
  },
  {
    id: "linha-do-tempo",
    label: "Mês a mês",
    icon: TimelineIcon,
    Component: dynamic(() => import("./MonthByMonthView").then((m) => m.MonthByMonthView)),
  },
  {
    id: "aneis",
    label: "Proporções",
    icon: DonutIcon,
    Component: dynamic(() => import("./ProportionsView").then((m) => m.ProportionsView)),
  },
];
