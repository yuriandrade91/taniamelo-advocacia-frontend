"use client";

import dynamic from "next/dynamic";
import type { ViewModel } from "@/components/ui/models/ViewModels";
import {
  BentoIcon,
  CalendarIcon,
  ChartBarIcon,
  FeedIcon,
  FocusIcon,
  KanbanIcon,
  ListIcon,
  MagazineIcon,
  OrbitIcon,
  SparkleIcon,
  TerminalIcon,
  WavesIcon,
} from "@/components/ui/icons/glyphs";
import {
  BrutalIcon,
  BubbleIcon,
  CommandKeyIcon,
  GlassIcon,
  HexIcon,
  PinIcon,
  PromptIcon,
  SoftIcon,
  StoriesIcon,
} from "./homeKit2";
import type { HomeModelProps } from "./shared";

/**
 * Registro dos modelos de visualização do Início — estudo para comparação na
 * tela real. "Atual" é a home de sempre e continua o padrão.
 */
export const HOME_MODELS: ViewModel<HomeModelProps>[] = [
  { id: "atual", label: "Atual", icon: ListIcon, Component: null },
  { id: "bom-dia", label: "Bom dia", icon: SparkleIcon, Component: dynamic(() => import("./BomDiaModel").then((m) => m.BomDiaModel)) },
  { id: "bento", label: "Bento", icon: BentoIcon, Component: dynamic(() => import("./BentoModel").then((m) => m.BentoModel)) },
  { id: "comando", label: "Central de comando", icon: TerminalIcon, Component: dynamic(() => import("./CommandModel").then((m) => m.CommandModel)) },
  { id: "prioridades", label: "Feed de prioridades", icon: FeedIcon, Component: dynamic(() => import("./FeedModel").then((m) => m.FeedModel)) },
  { id: "esteira", label: "Esteira em destaque", icon: KanbanIcon, Component: dynamic(() => import("./PipelineModel").then((m) => m.PipelineModel)) },
  { id: "agenda", label: "Agenda primeiro", icon: CalendarIcon, Component: dynamic(() => import("./AgendaFirstModel").then((m) => m.AgendaFirstModel)) },
  { id: "metricas", label: "Métricas", icon: ChartBarIcon, Component: dynamic(() => import("./MetricsModel").then((m) => m.MetricsModel)) },
  { id: "revista", label: "Revista", icon: MagazineIcon, Component: dynamic(() => import("./MagazineModel").then((m) => m.MagazineModel)) },
  { id: "holofote", label: "Holofote", icon: FocusIcon, Component: dynamic(() => import("./SpotlightModel").then((m) => m.SpotlightModel)) },
  { id: "calmo", label: "Calmo", icon: WavesIcon, Component: dynamic(() => import("./CalmModel").then((m) => m.CalmModel)) },
  { id: "paleta", label: "Paleta de comandos", icon: CommandKeyIcon, Component: dynamic(() => import("./PaletteModel").then((m) => m.PaletteModel)) },
  { id: "vidro", label: "Vidro", icon: GlassIcon, Component: dynamic(() => import("./GlassModel").then((m) => m.GlassModel)) },
  { id: "mural", label: "Mural", icon: PinIcon, Component: dynamic(() => import("./CorkboardModel").then((m) => m.CorkboardModel)) },
  { id: "stories", label: "Stories", icon: StoriesIcon, Component: dynamic(() => import("./StoriesModel").then((m) => m.StoriesModel)) },
  { id: "terminal", label: "Terminal", icon: PromptIcon, Component: dynamic(() => import("./TerminalModel").then((m) => m.TerminalModel)) },
  { id: "orbitas", label: "Órbitas", icon: OrbitIcon, Component: dynamic(() => import("./OrbitsModel").then((m) => m.OrbitsModel)) },
  { id: "brutalista", label: "Brutalista", icon: BrutalIcon, Component: dynamic(() => import("./BrutalistModel").then((m) => m.BrutalistModel)) },
  { id: "colmeia", label: "Colmeia", icon: HexIcon, Component: dynamic(() => import("./HoneycombModel").then((m) => m.HoneycombModel)) },
  { id: "conversa", label: "Conversa", icon: BubbleIcon, Component: dynamic(() => import("./ChatModel").then((m) => m.ChatModel)) },
  { id: "neumorfico", label: "Neumórfico", icon: SoftIcon, Component: dynamic(() => import("./NeumorphicModel").then((m) => m.NeumorphicModel)) },
];

export const DEFAULT_HOME_MODEL = "atual";
