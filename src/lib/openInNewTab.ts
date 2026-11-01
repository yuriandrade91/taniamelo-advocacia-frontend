/**
 * Abre um endereço externo (arquivo, sala de reunião) numa aba nova, sem dar à
 * página aberta acesso a esta (`noopener`) nem o endereço de origem
 * (`noreferrer`). Sem endereço, ou com um que não seja web (`javascript:`; o
 * valor vem da API), não faz nada.
 */
export function openInNewTab(url?: string | null): void {
  if (url && /^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
}
