"use client";

import type { DocumentTypeKey } from "@/enums/documentType/DocumentType";
import { DOCUMENT_CATALOG } from "./documentCatalog";

/**
 * Os documentos que uma categoria do INSS espera.
 *
 * Aparece **depois** de a categoria ser escolhida, e não antes: mostrar as dez
 * listas de uma vez é uma parede de texto que ninguém lê. Depois da escolha,
 * são cinco ou seis linhas que respondem exatamente à pergunta do momento —
 * "o que mais eu preciso pedir para o cliente nessa categoria?".
 *
 * Os `requisitos` vêm em destaque separado porque não são documentos: são o
 * que o documento precisa **demonstrar**. PPP sem agente nocivo e laudo médico
 * sem prazo de incapacidade são anexados todo dia e indeferidos depois — e a
 * hora de saber disso é antes de anexar, não no indeferimento.
 */

export type DocumentChecklistProps = {
  documentType: DocumentTypeKey | "";
  className?: string;
};

export function DocumentChecklist({
  documentType,
  className = "",
}: DocumentChecklistProps) {
  if (!documentType) return null;
  const section = DOCUMENT_CATALOG[documentType];
  // `OUTROS` não tem lista, e é assim mesmo: a categoria existe justamente
  // para o que não se encaixa. Um bloco vazio ali só ocuparia espaço.
  if (!section) return null;

  return (
    <div
      className={`rounded-lg border border-black/5 bg-light-gray/40 px-3 py-2 text-xs ${className}`}
    >
      {section.finalidade && (
        <p className="text-gray-100">{section.finalidade}</p>
      )}

      {section.grupos.map((grupo, index) => (
        <div key={grupo.grupo ?? index} className={index > 0 ? "mt-2" : ""}>
          {grupo.grupo && (
            <p className="font-medium text-secondary">{grupo.grupo}</p>
          )}
          <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-gray-100">
            {grupo.itens.map((item) => (
              <li
                key={item}
                className="rounded-full bg-white px-2 py-0.5 text-[11px]"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {section.requisitos && (
        <p className="mt-2 border-t border-black/5 pt-2 text-gray-100">
          <span className="font-medium text-primary">Precisa demonstrar:</span>{" "}
          {section.requisitos.join(" · ")}
        </p>
      )}
    </div>
  );
}
