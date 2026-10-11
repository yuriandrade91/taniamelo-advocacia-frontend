"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Tabs } from "@heroui/react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { notificationCenter } from "@/services/notificationService";
import { revealTop } from "./revealTop";
import { SectionCard } from "./SectionCard";
import { ReviewIcon } from "./sectionIcons";
import { CountBadge, TabBar, TabItem } from "@/components/ui/tabs/SegmentedTabs";
import type { ClientFormSection, SectionFocus } from "./types";
import { useActiveSection } from "./useActiveSection";
import { Svg } from "@/components/ui/icons/Svg";

/** Entrada suave do painel — Web Animations, sem keyframe no CSS global. */
function Enter({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current?.animate(
      [
        { opacity: 0, transform: "translateY(6px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, []);
  return <div ref={ref}>{children}</div>;
}

/**
 * O que a aba diz do estado da seção, à direita do nome: quantos
 * obrigatórios faltam, um ✓ quando está completa, ou nada (opcional ainda
 * intocada). O texto vai para o leitor de tela pelo `sr-only` da aba.
 */
function TabState({ section }: { section: ClientFormSection }) {
  if (section.missing) {
    return <CountBadge tone="pending" count={section.missing} />;
  }
  if (section.status === "ready" || section.status === "saved") {
    return (
      <span
        aria-hidden="true"
        className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success group-data-[selected=true]:bg-white/20 group-data-[selected=true]:text-white"
      >
        <Svg viewBox="0 0 16 16" strokeWidth={2.25} className="h-3 w-3">
          <path d="M3.5 8.5 6.5 11.5 12.5 5" />
        </Svg>
      </span>
    );
  }
  return null;
}

/**
 * O cadastro de cliente em abas.
 *
 * A barra de abas acompanha a rolagem, translúcida, e cada aba mostra o
 * ícone da seção e quanto falta nela. Uma seção por vez; o rodapé de cada
 * uma leva à anterior e à próxima. A última aba é a **Revisão**: todos os
 * campos do formulário, para conferir antes de salvar.
 *
 * Avançar exige os obrigatórios das abas que ficam para trás: "Próxima" ou um
 * clique numa aba adiante passa pelo `validate` de cada seção no caminho, e a
 * primeira que falhar segura a pessoa ali, com os erros à mostra. Voltar é
 * sempre livre, e o pedido da página (`focus`) não passa pela trava — é ela
 * quem leva às pendências.
 *
 * O painel inativo é desmontado pelo React Aria — não há problema porque o
 * estado de cada seção mora na página, não no componente da seção.
 *
 * Escolhido entre doze alternativas ao accordion — ver
 * `docs/adr/0002-client-form-layout.md`.
 */
const NO_FOCUS: SectionFocus = { keys: [], seq: 0 };

export function ClientFormTabs({
  sections,
  focus = NO_FOCUS,
  review,
  onActiveChange,
}: {
  sections: readonly ClientFormSection[];
  /** Pedido da página para mostrar uma aba (erro de validação, "Revisar"). */
  focus?: SectionFocus;
  /** A aba final de conferência — o cadastro tem; a ficha, não. */
  review?: { id: string; title: string; content: ReactNode };
  /** A aba visível mudou — o rodapé da página muda na Revisão. */
  onActiveChange?: (id: string | undefined) => void;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const tabs = review ? [...sections, { id: review.id }] : sections;
  const [active, setActive] = useActiveSection(tabs, focus);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // Pedido de foco vindo da página: a aba já trocou (`useActiveSection`);
  // falta trazer o topo para a tela, já que o pedido sai do rodapé.
  useEffect(() => {
    if (focus.seq > 0) revealTop(topRef.current);
  }, [focus]);

  const goTo = (key: string) => {
    setActive(key);
    revealTop(topRef.current);
  };

  /** Ir para `key`, desde que as seções no caminho estejam completas. */
  const advanceTo = (key: string) => {
    const from = tabs.findIndex((tab) => tab.id === active);
    const to = tabs.findIndex((tab) => tab.id === key);
    for (let i = Math.max(0, from); i < to; i += 1) {
      const section = sections[i];
      if (section && section.validate && !section.validate()) {
        notificationCenter.warning("Preencha os obrigatórios para continuar.", {
          description: `Faltam campos em ${section.title}.`,
        });
        if (section.id !== active) goTo(section.id);
        return;
      }
    }
    goTo(key);
  };

  return (
    <div ref={topRef} className="scroll-mt-4">
      <Tabs
        selectedKey={active}
        onSelectionChange={(key) => advanceTo(String(key))}
        className="gap-4"
      >
        <TabBar
          label="Seções do cadastro"
          className="sticky top-3 z-20 bg-white/90! backdrop-blur-md"
        >
          {sections.map((section) => (
            <TabItem key={section.id} id={section.id}>
              <span className="text-secondary/80 group-data-[selected=true]:text-white/90">
                {section.icon}
              </span>
              {section.title}
              <span className="sr-only">
                {" "}
                ({section.statusLabel}
                {section.missing === 1
                  ? " · falta 1 obrigatório"
                  : section.missing
                    ? ` · faltam ${section.missing} obrigatórios`
                    : ""}
                )
              </span>
              <TabState section={section} />
            </TabItem>
          ))}
          {review && (
            <TabItem
              id={review.id}
              className="text-secondary"
              indicatorClassName="rounded-xl bg-secondary shadow-none"
            >
              <ReviewIcon />
              {review.title}
            </TabItem>
          )}
        </TabBar>

        {sections.map((section, i) => {
          const previous = sections[i - 1];
          const next = sections[i + 1];
          const forward = next ?? review;
          return (
            <Tabs.Panel key={section.id} id={section.id} className="p-0">
              <Enter>
                <SectionCard
                  section={section}
                  footer={
                    <>
                      <span className="text-xs text-gray-100 tabular-nums">
                        {i + 1} de {sections.length}
                      </span>
                      <ActionGroup shape="pill">
                        {previous && (
                          <ActionButton
                            tone="neutral"
                            onClick={() => goTo(previous.id)}
                          >
                            ← Anterior
                          </ActionButton>
                        )}
                        {forward && (
                          <ActionButton
                            tone="secondary"
                            onClick={() => advanceTo(forward.id)}
                          >
                            {next ? `Próxima: ${next.title}` : forward.title} →
                          </ActionButton>
                        )}
                      </ActionGroup>
                    </>
                  }
                />
              </Enter>
            </Tabs.Panel>
          );
        })}

        {review && (
          <Tabs.Panel id={review.id} className="p-0">
            <Enter>{review.content}</Enter>
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
}
