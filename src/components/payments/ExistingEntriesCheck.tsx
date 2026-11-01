"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
import { BucketChip } from "@/components/wallet/WalletEntryList";
import { formatBRL, formatDateBR, plural } from "@/lib/format";
import { listOfficePayments } from "@/services/officePaymentService";
import { listOfficeRevenues } from "@/services/officeRevenueService";
import { bucketOf } from "./paymentBuckets";

/**
 * "Este cliente já tem lançamentos": a checagem de quem lança de novo.
 *
 * Ao vincular o cliente num lançamento **novo** — valor a receber do INSS
 * (Pagamentos) ou honorário (entrada da Carteira) —, busca os que ele já tem
 * daquele lado. Havendo algum, mostra os mais recentes e pergunta antes de
 * seguir: o caso comum é alguém lançar de novo o acordo que um colega já
 * lançou. "Trocar cliente" solta o vínculo; "Lançar mesmo assim" segue.
 *
 * Falha na busca não trava o lançamento: sem a resposta, não há o que avisar.
 */

/** Quantos lançamentos o aviso mostra — o total vem por extenso. */
const PREVIEW = 5;

type Kind = "benefit" | "fees";

type Entry = {
  id: string;
  description: string;
  amount?: number;
  dueDate: string;
  paidDate?: string;
  status?: string;
  overdue?: boolean;
};

const LOAD: Record<Kind, (clientId: string) => Promise<{ items: Entry[]; total: number }>> = {
  benefit: (clientId) =>
    listOfficePayments({ clientId, pageNumber: 1, pageSize: PREVIEW }).then((envelope) => ({
      items: envelope?.data ?? [],
      total: envelope?.pagination?.totalRecords ?? envelope?.data?.length ?? 0,
    })),
  fees: (clientId) =>
    listOfficeRevenues({ clientId, pageNumber: 1, pageSize: PREVIEW }).then((envelope) => ({
      items: envelope?.data ?? [],
      total: envelope?.pagination?.totalRecords ?? envelope?.data?.length ?? 0,
    })),
};

const NOUN: Record<Kind, [string, string]> = {
  benefit: ["valor a receber lançado", "valores a receber lançados"],
  fees: ["honorário lançado", "honorários lançados"],
};

export function ExistingEntriesCheck({
  kind,
  clientId,
  clientName,
  onChangeClient,
}: Readonly<{
  kind: Kind;
  /** O cliente vinculado agora; vazio enquanto não há vínculo. */
  clientId: string;
  clientName: string;
  /** "Trocar cliente": quem chama solta o vínculo. */
  onChangeClient: () => void;
}>) {
  const [found, setFound] = useState<{ items: Entry[]; total: number } | null>(null);
  /** O último cliente conferido: o mesmo vínculo não pergunta duas vezes. */
  const checked = useRef("");
  /** O `ConfirmDialog` fecha depois de confirmar: só o cancelar troca o cliente. */
  const kept = useRef(false);

  useEffect(() => {
    if (!clientId || clientId === checked.current) return;
    checked.current = clientId;
    let active = true;
    LOAD[kind](clientId)
      .then((result) => {
        if (active && result.total > 0) setFound(result);
      })
      .catch(() => {
        // Sem a resposta, não há o que avisar: o lançamento segue.
      });
    return () => {
      active = false;
    };
  }, [clientId, kind]);

  const [one, many] = NOUN[kind];
  return (
    <ConfirmDialog
      isOpen={found !== null}
      heading="Este cliente já tem lançamentos"
      confirmLabel="Lançar mesmo assim"
      cancelLabel="Trocar cliente"
      description={
        found && (
          <>
            <span className="font-medium text-primary">{clientName}</span> já tem{" "}
            {plural(found.total, one, many)}. Confira se não é o mesmo antes de lançar de novo.
          </>
        )
      }
      onConfirm={() => {
        kept.current = true;
      }}
      onClose={() => {
        if (!kept.current) {
          checked.current = "";
          onChangeClient();
        }
        kept.current = false;
        setFound(null);
      }}
    >
      {found && (
        <ul aria-label="Lançamentos do cliente" className="mt-3 flex flex-col gap-2">
          {found.items.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 rounded-xl bg-page px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-primary">{entry.description}</span>
                <span className="block text-xs text-gray-100">vence {formatDateBR(entry.dueDate)}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-gray-100 tabular-nums">
                {entry.amount === undefined ? "—" : formatBRL(entry.amount)}
              </span>
              <BucketChip kind="income" bucket={bucketOf(entry)} />
            </li>
          ))}
          {found.total > found.items.length && (
            <li className="px-1 text-xs text-gray-100">
              e mais {found.total - found.items.length}.
            </li>
          )}
        </ul>
      )}
    </ConfirmDialog>
  );
}
