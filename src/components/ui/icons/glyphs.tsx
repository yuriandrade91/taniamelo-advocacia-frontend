import { Svg, type IconProps } from "@/components/ui/icons/Svg";

/**
 * Ícones dos seletores de modelo (e de uso geral nos modelos).
 * Inline, traço em `currentColor` — a cor vem da classe de texto de quem usa.
 */

export const ListIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></Svg>
);
export const BentoIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="8" height="10" rx="2" /><rect x="13" y="3" width="8" height="6" rx="2" /><rect x="13" y="11" width="8" height="10" rx="2" /><rect x="3" y="15" width="8" height="6" rx="2" /></Svg>
);
export const TimelineIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v18" /><circle cx="12" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><path d="M14 7h6M4 17h6" /></Svg>
);
export const KanbanIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="3" width="5" height="18" rx="1.5" /><rect x="10" y="3" width="5" height="12" rx="1.5" /><rect x="17" y="3" width="4" height="8" rx="1.5" /></Svg>
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
export const PulseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 12h4l2-6 4 12 2-6h6" /></Svg>
);

export const WavesIcon = (p: IconProps) => (
  <Svg {...p}><path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></Svg>
);
export const TerminalIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3M13 15h4" /></Svg>
);

export const SparkleIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m12 8 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5Z" /></Svg>
);
export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>
);
export const FeedIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="6" cy="7" r="2" /><path d="M10 6h10M10 9h6" /><circle cx="6" cy="17" r="2" /><path d="M10 16h10M10 19h6" /></Svg>
);
export const FocusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const MagazineIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h6M7 12h10M7 16h10" /><rect x="15" y="7" width="3" height="2" rx=".5" /></Svg>
);
export const OrbitIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="2.5" /><ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="4" ry="9" /></Svg>
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
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
export const UsersIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 20a7 7 0 0 0-2.5-5.4" /></Svg>
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
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const DocumentIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></Svg>
);
export const ReceiptIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z" /><path d="M9 8h6M9 12h6" /></Svg>
);
