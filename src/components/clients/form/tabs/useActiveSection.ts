"use client";

import { useState } from "react";
import type { SectionFocus } from "./types";

/**
 * A aba visível no cadastro.
 *
 * Segue o pedido de foco da página — erro de validação leva a pessoa até a
 * seção — sem efeito: o ajuste acontece no próprio render quando `seq` muda,
 * que é o padrão do React para estado derivado de prop.
 *
 * Se a aba ativa some (deficiência desmarcada), cai na primeira.
 */
export function useActiveSection(
  sections: readonly { id: string }[],
  focus: SectionFocus,
) {
  const [active, setActive] = useState(focus.keys[0]);
  const [seenSeq, setSeenSeq] = useState(focus.seq);

  if (seenSeq !== focus.seq) {
    setSeenSeq(focus.seq);
    setActive(focus.keys[0]);
  }

  const exists = sections.some((section) => section.id === active);
  return [exists ? active : sections[0]?.id, setActive] as const;
}
