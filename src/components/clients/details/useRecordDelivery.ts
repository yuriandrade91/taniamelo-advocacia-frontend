"use client";

import { useState } from "react";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { printBlob, saveBlob } from "@/lib/blobFile";
import { messageOf } from "@/lib/errorMessage";
import { downloadClientRecord } from "@/services/clientRecordService";

/** A ficha em PDF entregue ao navegador; baixar e imprimir só diferem no que fazem com ela. */
export function useRecordDelivery(clientId: string, name: string, onError: (message: string) => void) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const deliver = async (send: typeof saveBlob, setBusy: (busy: boolean) => void, failure: string) => {
    setBusy(true);
    onError("");
    try {
      await send(() => downloadClientRecord(clientId), `Ficha - ${name}.pdf`);
    } catch (reason) {
      onError(messageOf(reason, failure));
    } finally {
      setBusy(false);
    }
  };

  return {
    isDownloading,
    isPrinting,
    download: () => deliver(saveBlob, setIsDownloading, fallbackMessages.CLIENTS.DOWNLOAD_FAILED),
    print: () => deliver(printBlob, setIsPrinting, fallbackMessages.CLIENTS.PRINT_FAILED),
  };
}
