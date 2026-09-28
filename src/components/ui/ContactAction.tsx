/**
 * Botão de contato em um toque — WhatsApp, ligação, e-mail.
 *
 * Promovido de `PendingLeadsModal.tsx`, que foi o primeiro lugar a precisar
 * disto; o popover de "cliente potencial" da listagem de clientes é o
 * segundo. Só renderiza quando o link pôde ser montado (telefone incompleto,
 * e-mail sem arroba) — em vez de virar um link quebrado.
 */
export function ContactAction({
  href,
  label,
  tone,
  children,
}: {
  href: string | null;
  label: string;
  tone: "success" | "primary" | "neutral";
  children: React.ReactNode;
}) {
  if (!href) return null;
  const toneClass =
    tone === "success"
      ? "text-success hover:bg-success/10"
      : tone === "primary"
        ? "text-primary hover:bg-primary/10"
        : "text-gray-100 hover:bg-gray-100/10";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${toneClass}`}
    >
      {children}
    </a>
  );
}
