"use client";

import { useState } from "react";
import { Button } from "@heroui/react";

import {
  DOCUMENT_TYPE_ENTRIES,
  type DocumentTypeKey,
} from "@/enums/documentType/DocumentType";
import { DOCUMENT_CATALOG, totalDeItens } from "./documentCatalog";

/**
 * A documentação do INSS inteira, por categoria.
 *
 * ## Por que recolhido por padrão
 *
 * São dez categorias e mais de cinquenta documentos. Aberto, empurra a lista
 * de arquivos do cliente — que é o conteúdo principal da seção — para baixo da
 * dobra. Fechado, é uma linha; e quem precisa da referência sabe que ela está
 * ali.
 *
 * ## Por que existe, se o upload já mostra a lista da categoria
 *
 * São dois momentos diferentes. No upload, a pergunta é "o que falta nesta
 * categoria?" e a resposta é curta. Aqui, é "o que existe ao todo?" — a
 * pergunta de quem está montando o pedido, ou orientando o cliente por
 * telefone antes de ter qualquer arquivo em mãos.
 *
 * ## O que esta lista não faz
 *
 * Não marca o que já foi entregue. Marcar exigiria saber **qual** documento
 * cada arquivo é, e o backend só guarda a categoria — um check aqui seria
 * chute. Enquanto o modelo não tiver esse campo, isto é referência, e diz que
 * é.
 */

/** Ordem do enum, menos `OUTROS`, que não tem lista. */
const CATEGORIAS = DOCUMENT_TYPE_ENTRIES.filter(
  ([key]) => DOCUMENT_CATALOG[key as DocumentTypeKey] !== undefined,
);

export function DocumentCatalogPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const total = CATEGORIAS.reduce(
    (sum, [key]) => sum + totalDeItens(key as DocumentTypeKey),
    0,
  );

  return (
    <section className="rounded-xl border border-black/5 bg-light-gray/30">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-primary">
            Documentação do INSS por categoria
          </h3>
          <p className="mt-0.5 text-xs text-gray-100">
            {CATEGORIAS.length} categorias, {total} documentos. Referência para
            montar o pedido — não indica o que já foi entregue.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onPress={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          {isOpen ? "Recolher" : "Ver lista"}
        </Button>
      </header>

      {isOpen && (
        <div className="grid grid-cols-1 gap-3 border-t border-black/5 px-4 py-4 md:grid-cols-2">
          {CATEGORIAS.map(([key, label], index) => {
            const section = DOCUMENT_CATALOG[key as DocumentTypeKey];
            if (!section) return null;
            return (
              <article
                key={key}
                className="rounded-lg border border-black/5 bg-white px-3 py-3"
              >
                <h4 className="text-sm font-medium text-secondary">
                  {/* O número é o da lista oficial: é assim que a equipe se
                      refere a elas na conversa ("manda o 6"). */}
                  {index + 1}. {label}
                </h4>
                {section.finalidade && (
                  <p className="mt-0.5 text-xs text-gray-100">
                    {section.finalidade}
                  </p>
                )}

                {section.grupos.map((grupo, grupoIndex) => (
                  <div
                    key={grupo.grupo ?? grupoIndex}
                    className={grupoIndex > 0 ? "mt-2" : "mt-2"}
                  >
                    {grupo.grupo && (
                      <p className="text-xs font-medium text-primary">
                        {grupo.grupo}
                      </p>
                    )}
                    <ul className="mt-1 list-disc pl-4 text-xs text-gray-100 marker:text-secondary/50">
                      {grupo.itens.map((item) => (
                        <li key={item} className="py-0.5">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {section.requisitos && (
                  <p className="mt-2 rounded-md bg-light-secondary/60 px-2 py-1.5 text-xs text-primary">
                    <span className="font-medium">Precisa demonstrar:</span>{" "}
                    {section.requisitos.join(" · ")}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
