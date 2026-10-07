"use client";

import type { ReactNode } from "react";
import { TONE, type Tone } from "@/components/ui/models/viz";

/**
 * Anéis concêntricos para as visões de Relatórios, no mesmo espírito de
 * `@/components/ui/models/viz`: SVG próprio, cores dos tokens, texto em HTML.
 * Fica aqui porque só a visão Proporções usa.
 */

// ── Anéis concêntricos ──

export type Ring = { label: string; value: number; tone: Tone; opacity?: number };

/**
 * Anéis um dentro do outro, cada um de 0 a 1 — estilo "anéis de atividade".
 * O de fora é o primeiro da lista.
 */
export function ConcentricRings({
  rings,
  size = 200,
  thickness = 10,
  gap = 4,
  track = "rgba(9,13,76,0.06)",
  children,
  className = "",
}: {
  rings: readonly Ring[];
  size?: number;
  thickness?: number;
  gap?: number;
  track?: string;
  children?: ReactNode;
  className?: string;
}) {
  const center = size / 2;
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        {rings.map((ring, i) => {
          const r = center - thickness / 2 - i * (thickness + gap);
          if (r <= thickness / 2) return null;
          const c = 2 * Math.PI * r;
          const v = Math.min(1, Math.max(0, ring.value));
          return (
            <g key={ring.label}>
              <circle cx={center} cy={center} r={r} fill="none" stroke={track} strokeWidth={thickness} />
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={TONE[ring.tone]}
                strokeOpacity={ring.opacity ?? 1}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={`${v * c} ${c}`}
                className="transition-all duration-700"
              >
                <title>{ring.label}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
      )}
    </div>
  );
}
