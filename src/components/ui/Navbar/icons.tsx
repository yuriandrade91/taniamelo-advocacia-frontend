import { Svg, type IconProps } from "@/components/ui/icons/Svg";

/**
 * Ícones do navbar. Server Components — só props para JSX.
 * Estavam declarados inline dentro do `Navbar.tsx`, que já cresceu demais.
 */

const BAR = "h-[18px] w-[18px]";

export const SearchIcon = ({ className = BAR }: IconProps) => (
  <Svg className={className} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const BellIcon = ({ className = BAR }: IconProps) => (
  <Svg className={className}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const CheckAllIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="m2 13 4 4L14 7" />
    <path d="m12 15 2 2 8-10" />
  </Svg>
);

export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);

/** Tipos de notificação — cada um com seu ícone. */
export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </Svg>
);

export const CalendarBellIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </Svg>
);

export const FileIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 3v5h5" />
    <path d="M19 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9l6 6v11a1 1 0 0 1-1 1Z" />
  </Svg>
);
