import { STAGES, stageOf } from "./stages";

/** O selo da etapa: concluída, desconhecida ou em andamento. */
function pillTone(done: boolean, unknown: boolean): string {
  if (done) return "bg-success/15 text-success-strong";
  return unknown ? "bg-page text-gray-100" : "bg-white text-primary ring-1 ring-black/10";
}

/** Cada segmento do trilho: cumprido, atual ou por vir. */
function segmentTone(passed: boolean, current: boolean): string {
  if (passed) return "bg-success";
  return current ? "bg-secondary" : "bg-light-gray/70";
}

/**
 * Situação: selo + trilho, numa escala só da marca.
 *
 * Em vez de uma cor por etapa (que não dizia nada sobre o andamento), o
 * trilho conta a história da esteira: o que já foi cumprido fica em verde
 * (concluído, como no cartão de mudar etapa), a etapa atual em dourado — o
 * único destaque — e o que falta em cinza. "Benefício concluído" fecha o
 * trilho inteiro em verde.
 */
export function StageMeter({ situation }: Readonly<{ situation?: string }>) {
  const stage = stageOf(situation);
  const done = stage.step === STAGES.length;
  const unknown = stage.step === 0;
  return (
    <div>
      <span
        title={stage.label}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium whitespace-nowrap ${pillTone(
          done,
          unknown,
        )}`}
      >
        {done ? (
          <span aria-hidden="true">✓</span>
        ) : (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${unknown ? "bg-gray-100/50" : "bg-secondary"}`} />
        )}
        <span className="truncate">{stage.label}</span>
      </span>
      <span className="sr-only">
        Etapa {stage.step} de {STAGES.length}: {stage.label}
      </span>
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {STAGES.map((s) => (
          <span
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${segmentTone(
              done || s.step < stage.step,
              s.step === stage.step,
            )}`}
          />
        ))}
      </div>
    </div>
  );
}
