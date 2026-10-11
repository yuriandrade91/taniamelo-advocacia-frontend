import { Svg, type IconProps } from "@/components/ui/icons/Svg";

/**
 * Ícones da agenda — tipo de compromisso, modalidade e ações.
 *
 * Inline e em `currentColor`, no mesmo padrão de `ui/icons/actions.tsx`: quem
 * usa decide a cor pela classe de texto.
 */


// ── Tipos de compromisso ──

export const GavelIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10" />
    <path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8" />
  </Svg>
);

export const StethoscopeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 2v2M5 2v2" />
    <path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
    <path d="M8 15a6 6 0 0 0 12 0v-3" />
    <circle cx="20" cy="10" r="2" />
  </Svg>
);

export const HourglassIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 22h14M5 2h14" />
    <path d="M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22" />
    <path d="M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2" />
  </Svg>
);

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const ChatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    <path d="M8 9h8M8 13h5" />
  </Svg>
);

export const CalendarDotIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <circle cx="12" cy="16" r="1.5" fill="currentColor" />
  </Svg>
);

// ── Modalidade e metadados ──

export const VideoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </Svg>
);

// ── Ações ──

/** Seta circular — reagendar um compromisso cancelado. */
export const RescheduleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 1 3 6.7" />
    <path d="M3 16v-4h4" />
  </Svg>
);

