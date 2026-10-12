import { Svg, type IconProps } from "@/components/ui/icons/Svg";

/**
 * Ícones do navbar. Server Components — só props para JSX.
 * Estavam declarados inline dentro do `Navbar.tsx`, que já cresceu demais.
 */

const BAR = "h-[18px] w-[18px]";

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

