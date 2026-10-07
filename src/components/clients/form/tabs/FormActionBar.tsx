"use client";

import type { ReactNode } from "react";
import { ActionGroup } from "@/components/ui/actions/ActionGroup";
import type { MissingField, ReviewSectionKey } from "../review";

/** As pendências agrupadas pela seção, na ordem do formulário. */
const bySection = (missing: readonly MissingField[]) =>
  missing.reduce<
    { key: ReviewSectionKey; section: string; labels: string[] }[]
  >((groups, field) => {
    const last = groups[groups.length - 1];
    if (last?.key === field.key) last.labels.push(field.label);
    else
      groups.push({
        key: field.key,
        section: field.section,
        labels: [field.label],
      });
    return groups;
  }, []);

/** Anel de progresso, com a porcentagem (ou ✓) no meio. */
function MissingRing({
  progress,
  missing,
}: {
  progress: number;
  missing: number;
}) {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  const isReady = missing === 0;
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 36 36"
        aria-hidden="true"
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          className="stroke-light-gray"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress / 100)}
          className={`transition-[stroke-dashoffset] duration-500 ${
            isReady ? "stroke-success" : "stroke-secondary"
          }`}
        />
      </svg>
      <span
        aria-hidden="true"
        className={`text-[10px] font-bold tabular-nums ${
          isReady ? "text-success" : "text-primary"
        }`}
      >
        {isReady ? "✓" : `${Math.round(progress)}%`}
      </span>
    </span>
  );
}

/**
 * Barra de ações do cadastro, flutuando no rodapé da tela.
 *
 * `sticky` e não `fixed`: acompanha a rolagem enquanto o formulário está na
 * tela e pousa no fim dele, sem cobrir nada.
 *
 * Na linha de cima, o anel com quantos faltam e, à direita, as ações em
 * cápsula, no modelo de botões do painel da Carteira (`ActionGroup`). Logo
 * abaixo do percentual, **tudo** o que falta, à vista, numa pequena tabela:
 * uma linha por aba, o nome da aba numa coluna alinhada e os campos em
 * cápsulas vermelhas ao lado — nada escondido, nada para rolar, sem disputar
 * largura com os botões e sem aba "sobrando" sozinha numa linha (pedidos do
 * usuário). Cada cápsula leva até a aba.
 *
 * Na aba Revisão só ficam as ações: a própria Revisão já mostra cada
 * pendência em vermelho, repetir aqui seria dizer a mesma coisa duas vezes.
 */
export function FormActionBar({
  missing,
  progress,
  isReviewing,
  onGoTo,
  children,
}: {
  /** Obrigatórios vazios no formulário inteiro, na ordem do formulário. */
  missing: readonly MissingField[];
  /** 0–100, o mesmo do anel do cabeçalho. */
  progress: number;
  /** A aba Revisão está aberta. */
  isReviewing: boolean;
  /** Leva à aba da seção do campo. */
  onGoTo: (key: ReviewSectionKey) => void;
  /** Os botões. */
  children: ReactNode;
}) {
  const isReady = missing.length === 0;
  const showList = !isReviewing && !isReady;

  return (
    <div
      className={`sticky bottom-3 z-20 mt-2 flex flex-col gap-3 bg-white/90 p-2.5 border border-light-gray backdrop-blur-md sm:bottom-4 ${
        showList ? "rounded-3xl sm:p-3" : "rounded-3xl sm:rounded-full"
      }`}
    >
      <div
        // No celular a linha "se desfaz" (`contents`): os botões descem para
        // o fim da barra, depois das pendências, onde o polegar alcança.
        className={`max-sm:contents sm:flex sm:flex-row sm:items-center sm:gap-4 ${
          isReviewing ? "sm:justify-end" : "sm:justify-between"
        }`}
      >
        {!isReviewing && (
          <div className="flex items-center gap-3 sm:pl-1">
            <MissingRing progress={progress} missing={missing.length} />
            <p role="status" className="text-sm leading-tight">
              {isReady ? (
                <span className="font-semibold text-success">
                  Pronto para salvar
                </span>
              ) : (
                <>
                  <span className="font-semibold text-danger tabular-nums">
                    {missing.length}
                  </span>{" "}
                  <span className="font-semibold text-primary">
                    obrigatório{missing.length === 1 ? "" : "s"}
                  </span>{" "}
                  <span className="text-gray-100">faltando</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* O mesmo grupo de botões da barra do painel da Carteira. */}
        <ActionGroup
          shape="pill"
          className="w-full shrink-0 max-sm:order-last max-sm:[&>button]:px-2.5 sm:w-auto sm:min-w-[22rem]"
        >
          {children}
        </ActionGroup>
      </div>

      {showList && (
        // Tabela de duas colunas: o nome da aba alinhado à esquerda, os
        // campos ao lado. No celular, o nome fica em cima dos campos.
        <dl
          aria-label="Campos obrigatórios sem resposta"
          className="grid grid-cols-1 gap-y-2.5 rounded-2xl bg-page/70 px-4 py-3 sm:grid-cols-[max-content_minmax(0,1fr)] sm:items-center sm:gap-x-6"
        >
          {bySection(missing).map((group) => (
            <div key={group.key} className="contents">
              <dt className="text-[10px] font-semibold tracking-wider whitespace-nowrap text-gray-100/80 uppercase">
                {group.section}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {group.labels.map((label, index) => (
                  <button
                    key={`${label}-${index}`}
                    type="button"
                    onClick={() => onGoTo(group.key)}
                    className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium whitespace-nowrap text-danger ring-1 ring-danger/25 transition hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:outline-none active:scale-[0.97] motion-reduce:active:scale-100"
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-danger"
                    />
                    {label}
                    {/* Sem aria-label: ele faria o botão "ser" o campo para
                        quem procura pelo rótulo (getByLabel, leitor de tela). */}
                    <span className="sr-only"> — ir para {group.section}</span>
                  </button>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
