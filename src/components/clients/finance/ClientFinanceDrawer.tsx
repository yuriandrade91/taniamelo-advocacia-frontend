"use client";

import Drawer from "@/components/ui/Drawer/Drawer";
import { initials } from "@/lib/format";
import { ClientFinancePanel, EYEBROW, Tile } from "./ClientFinancePanel";

/** O financeiro de um cliente, num painel lateral aberto pela linha da lista. */
export function ClientFinanceDrawer({
  client,
  onClose,
  onViewClient,
}: {
  client: { id: string; name: string };
  onClose: () => void;
  /** Abre a ficha do cliente (fecha este painel antes). */
  onViewClient?: () => void;
}) {
  return (
    <Drawer
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Financeiro"
      hideFooter
      dialogClassName="w-full sm:w-[640px]"
    >
      <div className="flex flex-col gap-4 pb-4">
        <ClientHeader name={client.name} onViewClient={onViewClient} />
        <ClientFinancePanel clientId={client.id} />
      </div>
    </Drawer>
  );
}

function ClientHeader({ name, onViewClient }: { name: string; onViewClient?: () => void }) {
  return (
    <Tile className="flex items-center gap-3 p-4">
      <span
        aria-hidden="true"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-semibold tracking-wide text-white select-none"
      >
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={EYEBROW}>Cliente</p>
        <p className="text-base font-medium break-words text-gray-100">{name || "Sem nome"}</p>
      </div>
      {onViewClient && (
        <button
          type="button"
          onClick={onViewClient}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-secondary ring-1 ring-light-gray transition hover:bg-white"
        >
          Ver ficha
        </button>
      )}
    </Tile>
  );
}
