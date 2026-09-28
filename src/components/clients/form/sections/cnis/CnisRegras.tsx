"use client";

import type { RegraResult } from "@/lib/cnis/rules";
import type { RmiResult } from "@/lib/cnis/rmi";
import { formatBRL } from "@/lib/format";

/**
 * As cinco portas da EC 103, lado a lado.
 *
 * ## Por que mostrar as reprovadas
 *
 * Uma tela que só listasse as regras já atingidas responderia "pode se
 * aposentar?" — mas a pergunta do cliente é "quando, e por qual?". O que falta
 * em cada regra é a informação que orienta a decisão: esperar oito meses pelo
 * pedágio de 100% pode valer mais que se aposentar hoje pelos pontos, porque
 * são 100% da média contra 60% + 2%.
 *
 * Por isso cada cartão traz também **como a renda é apurada**. Comparar regras
 * só por data leva o cliente a escolher a pior.
 *
 * ## Inaplicável ≠ reprovado
 *
 * O pedágio de 50% tem uma janela fechada: quem não estava a menos de dois anos
 * do mínimo em 13/11/2019 nunca vai se enquadrar, por mais que contribua. Isso
 * aparece como "não se aplica", com o motivo — e não como uma barra faltando
 * muito, que sugeriria falsamente que é questão de tempo.
 */

export type CnisRegrasProps = {
  regras: RegraResult[];
  direitoAdquirido: boolean;
  /** RMI por regra, quando a tabela de atualização permite calcular. */
  rendaPorRegra?: Record<string, RmiResult>;
};

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        ok ? "bg-light-green text-success" : "bg-light-gray text-gray-100"
      }`}
    >
      {ok ? "✓" : "–"}
    </span>
  );
}

export function CnisRegras({
  regras,
  direitoAdquirido,
  rendaPorRegra,
}: CnisRegrasProps) {
  return (
    <div className="flex flex-col gap-4">
      {direitoAdquirido && (
        <div className="rounded-xl border border-success/30 bg-light-green px-4 py-3 text-sm">
          <p className="font-medium text-success">Direito adquirido</p>
          <p className="mt-1 text-primary">
            O tempo mínimo já estava completo em 13/11/2019. As regras de
            transição abaixo são alternativas — a regra antiga continua
            disponível e costuma ser a melhor.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {regras.map((regra) => {
          const renda = rendaPorRegra?.[regra.id];
          return (
            <article
              key={regra.id}
              className={`rounded-xl border px-4 py-3 ${
                regra.elegivel
                  ? "border-success/40 bg-light-green/40"
                  : regra.aplicavel
                    ? "border-black/5 bg-white"
                    : "border-black/5 bg-light-gray/30"
              }`}
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium text-primary">{regra.nome}</h4>
                  <p className="text-xs text-gray-100">{regra.fundamento}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    regra.elegivel
                      ? "bg-light-green text-success"
                      : regra.aplicavel
                        ? "bg-light-secondary text-secondary"
                        : "bg-light-gray text-gray-100"
                  }`}
                >
                  {regra.elegivel
                    ? "Já tem direito"
                    : regra.aplicavel
                      ? "Falta"
                      : "Não se aplica"}
                </span>
              </header>

              {!regra.aplicavel && regra.motivoInaplicavel ? (
                <p className="mt-2 text-sm text-gray-100">
                  {regra.motivoInaplicavel}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {regra.requisitos.map((requisito) => (
                    <li key={requisito.label} className="flex items-start gap-2 text-sm">
                      <Check ok={requisito.atendido} />
                      <span className="min-w-0 flex-1">
                        <span className="text-primary">{requisito.label}</span>
                        <span className="block text-xs text-gray-100">
                          exige {requisito.exigido} · tem {requisito.atual}
                          {requisito.falta && (
                            <span className="text-secondary">
                              {" "}· faltam {requisito.falta}
                            </span>
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <footer className="mt-3 border-t border-black/5 pt-2">
                <p className="text-xs text-gray-100">{regra.notaRenda}</p>
                {renda && (
                  <p className="mt-1 text-sm text-primary">
                    {renda.dependeDeFatorPrevidenciario ? (
                      <>
                        Média de {formatBRL(renda.media)} — o valor final ainda
                        depende do fator previdenciário.
                      </>
                    ) : (
                      <>
                        RMI estimada:{" "}
                        <strong className="font-medium">
                          {formatBRL(renda.rmi)}
                        </strong>
                        <span className="text-xs text-gray-100">
                          {" "}({Math.round(renda.coeficiente * 100)}% da média
                          {renda.limitadaPeloTeto && ", limitada ao teto"}
                          {renda.elevadaAoPiso && ", elevada ao mínimo"})
                        </span>
                      </>
                    )}
                  </p>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
