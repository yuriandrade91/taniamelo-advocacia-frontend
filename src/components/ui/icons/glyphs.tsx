import { Svg, type IconProps } from "@/components/ui/icons/Svg";

/**
 * Ícones de traço de uso geral (abas de Relatórios, selos, estados vazios).
 * Inline, traço em `currentColor` — a cor vem da classe de texto de quem usa.
 */

export const TimelineIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v18" /><circle cx="12" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><path d="M14 7h6M4 17h6" /></Svg>
);

export const ChartBarIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 21h18" /><rect x="5" y="11" width="3" height="7" rx="1" /><rect x="10.5" y="6" width="3" height="12" rx="1" /><rect x="16" y="9" width="3" height="9" rx="1" /></Svg>
);

export const DonutIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 4v4.5" /></Svg>
);
export const GaugeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 17a8 8 0 1 1 16 0" /><path d="m12 13 4-4" /><circle cx="12" cy="17" r="1" /></Svg>
);
export const LayersIcon = (p: IconProps) => (
  <Svg {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></Svg>
);


export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m12 8 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5Z" /></Svg>
);

export const WalletIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h12v4" /><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 13.5h.01" /></Svg>
);
export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}><path d="M7 17 17 7M9 7h8v8" /></Svg>
);
export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}><path d="M17 7 7 17M15 17H7V9" /></Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const AlertIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></Svg>
);
export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>
);
export const BanIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const EyeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const EyeOffIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 10.5 8 10.5 8a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6C3.4 8.6 1.5 12 1.5 12s3.5 8 10.5 8a10.9 10.9 0 0 0 5.4-1.4M9.9 14.1a3 3 0 0 0 4.2-4.2" /><path d="M2 2l20 20" /></Svg>
);
export const CopyIcon = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="m4.5 12.5 5 5 10-11" /></Svg>
);
export const ReceiptIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z" /><path d="M9 8h6M9 12h6" /></Svg>
);

/** Gráfico sem dado: o eixo e as barras tracejadas. */
export const EmptyChartIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={1.6}><path d="M3 21h18" /><path d="M6 17v-3M11 17V9M16 17v-5" strokeDasharray="2 2.5" /></Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}><path d="m6 9 6 6 6-6" /></Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>
);
