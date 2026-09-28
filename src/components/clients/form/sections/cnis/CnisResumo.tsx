"use client";

import { formatTimeSpan } from "@/lib/cnis/periods";
import type { TempoResult } from "@/lib/cnis/tempoContribuicao";
import { formatDateBR } from "@/lib/format";
import type { CnisDocument } from "@/lib/cnis/types";

/**
 * O que o leitor entendeu do extrato.
 *
 * Existe para ser **conferido**, não admirado. Cada vínculo aparece com as
 * datas e a duração que entraram na conta, para bater linha a linha contra o
 * PDF. Um relatório que só mostra o total obriga a confiar no parser, e um
 * parser de PDF não merece confiança cega.
 */

export type CnisResumoProps = {
  document: CnisDocument;
  tempo: TempoResult;
};

const Card = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-black/5 bg-white px-4 py-3">
    <p className="text-xs text-gray-100">{label}</p>
    <p className="mt-1 text-lg font-medium text-primary">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-100/70">{hint}</p>}
  </div>
);

export function CnisResumo({ document, tempo }: CnisResumoProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          label="Tempo de contribuição"
          value={formatTimeSpan(tempo.tempo)}
          hint={`${tempo.tempo.totalDias} dias`}
        />
        <Card
          label="Carência"
          value={`${tempo.carencia} contribuições`}
          hint={tempo.carencia >= 180 ? "acima das 180 exigidas" : `faltam ${180 - tempo.carencia}`}
        />
        <Card
          label="Vínculos lidos"
          value={String(document.vinculos.length)}
          hint={
            tempo.diasConcomitantes > 0
              ? `${tempo.diasConcomitantes} dias concomitantes, contados uma vez`
              : "sem concomitância"
          }
        />
      </div>

      {tempo.carenciaPrecisaRevisao && (
        <p className="rounded-xl border border-black/5 bg-light-gray/40 px-4 py-3 text-xs text-gray-100">
          Há vínculo de contribuinte individual, facultativo ou segurado
          especial. Nesses, a carência conta o mês <strong>efetivamente
          recolhido</strong> — o número acima conta os meses do período e pode
          estar alto. Confira os recolhimentos.
        </p>
      )}

      {tempo.diasConcomitantes > 0 && (
        <p className="text-xs text-gray-100">
          A soma bruta dos vínculos daria {tempo.diasBrutos} dias. Os{" "}
          {tempo.diasConcomitantes} dias em que houve mais de um vínculo ao mesmo
          tempo contam uma vez só.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-black/5">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-light-gray/50 text-left text-xs text-gray-100">
            <tr>
              <th className="px-3 py-2 font-medium">Seq.</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Início</th>
              <th className="px-3 py-2 font-medium">Fim</th>
              <th className="px-3 py-2 text-right font-medium">Dias</th>
              <th className="px-3 py-2 font-medium">Indicadores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {tempo.periodos.map((periodo) => {
              const vinculo = document.vinculos.find((v) => v.seq === periodo.seq);
              return (
                <tr key={periodo.seq} className="text-primary">
                  <td className="px-3 py-2 text-gray-100">{periodo.seq}</td>
                  <td className="px-3 py-2">
                    <span className="block max-w-[220px] truncate" title={periodo.origem}>
                      {periodo.origem}
                    </span>
                    {vinculo?.tipoFiliado && (
                      <span className="text-xs text-gray-100">
                        {vinculo.tipoFiliado}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{formatDateBR(periodo.inicio)}</td>
                  <td className="px-3 py-2">
                    {periodo.emAberto ? (
                      // Dizer "em aberto" e não a data-base: a data foi
                      // escolhida por nós, não veio do documento.
                      <span className="text-secondary">
                        em aberto · até {formatDateBR(periodo.fim)}
                      </span>
                    ) : (
                      formatDateBR(periodo.fim)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {periodo.dias}
                  </td>
                  <td className="px-3 py-2">
                    {vinculo && vinculo.indicadores.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {vinculo.indicadores.map((indicador) => (
                          <span
                            key={indicador}
                            className="rounded-full bg-light-secondary px-2 py-0.5 text-[11px] text-secondary"
                          >
                            {indicador}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-100/50">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tempo.ignorados.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
          <p className="font-medium text-primary">
            {tempo.ignorados.length} vínculos ficaram de fora da contagem
          </p>
          <ul className="mt-1 list-disc pl-5 text-gray-100">
            {tempo.ignorados.map((ignorado) => (
              <li key={ignorado.seq}>
                {ignorado.seq} — {ignorado.origem}: {ignorado.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Indicador de pendência não é conclusão automática. O extrato marca;
        quem decide se o período conta é o advogado, com prova. Um sistema que
        somasse ou descartasse sozinho estaria decidindo tese jurídica.
      */}
      <p className="text-xs text-gray-100">
        Indicadores como <code>PREC-MENOR-MIN</code> ou <code>IREC-INDPEND</code>{" "}
        sinalizam pendência no recolhimento. Eles aparecem aqui, mas não alteram
        a contagem — a regularização depende de prova, não de cálculo.
      </p>
    </div>
  );
}
