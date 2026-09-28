"use client";

import type { ReactNode } from "react";

/**
 * Cabeçalho de página: cartão azul, título e filete dourado.
 *
 * ## Por que virou componente
 *
 * O padrão nasceu no cadastro de cliente, escrito direto na página. Repetir as
 * mesmas linhas em cada tela é como o projeto ganha quatro tons de azul
 * levemente diferentes e um filete com 1px a mais num lugar só — divergências
 * que ninguém nota isoladas e que somadas fazem o produto parecer montado por
 * gente diferente.
 *
 * ## Os controles ficam dentro, à direita
 *
 * `actions` recebe o que a página tem de principal: botão de criar, seletor de
 * mês, indicador de progresso. Fica no mesmo cartão do título porque é ali que
 * se olha ao chegar na tela.
 *
 * **Nada com `text-primary` sobrevive aqui** — é o próprio azul do cartão. Por
 * isso os controles precisam de tratamento escuro: o `MonthPicker` tem
 * `tone="dark"`, e botões usam a classe global `on-primary-button`
 * (`globals.css`), o contorno branco que as barras de filtro já usavam sobre
 * azul. Um `Button` padrão colocado aqui some.
 *
 * ## O que continua fora
 *
 * Paginação. Ela pertence à lista que numera: no topo, longe da tabela, o
 * usuário clica "próxima" num canto e o conteúdo muda no outro, sem o
 * indicador por perto para conferir onde parou.
 */

export type PageHeaderProps = {
  title: string;
  /** Texto de apoio. Aceita `ReactNode` porque alguns levam link. */
  description?: ReactNode;
  /** Controles da página, à direita do título. */
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="rounded-2xl bg-primary px-6 py-5 text-white">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-medium">{title}</h1>
          {/* O filete dourado é a única marca da identidade aqui — largura
              fixa, para não acompanhar o tamanho do título e virar régua. */}
          <span className="mt-1 block h-0.5 w-16 bg-secondary" />

          {description && (
            <p className="mt-3 text-sm text-white/70">{description}</p>
          )}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
