import { DollarCircleIcon } from "@/components/ui/icons/StatusIcons";
import { SparkleIcon } from "@/components/ui/icons/glyphs";

/**
 * Os selos de um cliente ao lado do nome: "Potencial" (preencheu o formulário,
 * ainda não fechou com o escritório) e "Isento" (o caso não entra no
 * faturamento). Quem decide se cada um aparece é `isLead`/`isExempt`
 * (`clientDisplay`).
 */

const BADGE =
  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase";

export function LeadBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Cliente potencial — ainda não fechou com o escritório"
      className={`${BADGE} bg-light-secondary text-secondary ${className}`}
    >
      <SparkleIcon className="h-3 w-3" />
      Potencial
    </span>
  );
}

export function ExemptBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Cliente isento do serviço"
      className={`${BADGE} bg-success/15 text-success-strong ${className}`}
    >
      <DollarCircleIcon className="h-3 w-3" />
      Isento
    </span>
  );
}
