/**
 * Abre um endereço externo (arquivo, sala de reunião) numa aba nova, sem dar à
 * página aberta acesso a esta (`noopener`) nem o endereço de origem
 * (`noreferrer`). Sem endereço, não faz nada.
 */
export function openInNewTab(url?: string | null): void {
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
