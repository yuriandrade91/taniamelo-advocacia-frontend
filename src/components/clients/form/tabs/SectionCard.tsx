import type { ReactNode } from "react";
import { STATUS_STYLES } from "../FormSection";
import type { ClientFormSection } from "./types";

/**
 * O conteúdo de uma aba: cabeçalho em creme (`bg-floral`, floralwhite) com o
 * ícone num quadro tingido, título, a frase do que a seção pede e o selo de
 * estado; depois os campos, com respiro; e o rodapé de navegação entre abas,
 * em branco como o corpo.
 */
export function SectionCard({
  section,
  footer,
}: {
  section: ClientFormSection;
  footer?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white">
      <div className="flex items-start gap-4 border-b border-light-gray/70 bg-floral px-6 py-5 sm:px-8">
        {section.icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-light-secondary text-secondary">
            {section.icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {/* Título e selo na mesma linha; a frase embaixo, na largura toda —
              no celular, com o selo ao lado, ela virava uma coluna estreita. */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">
              {section.title}
            </h2>
            <span
              className={`mt-0.5 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[section.status]}`}
            >
              {section.statusLabel}
            </span>
          </div>
          {section.description && (
            <p className="mt-0.5 text-sm text-gray-100">
              {section.description}
            </p>
          )}
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-7">{section.content}</div>

      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-light-gray/70 px-6 py-4 sm:px-8">
          {footer}
        </div>
      )}
    </div>
  );
}
