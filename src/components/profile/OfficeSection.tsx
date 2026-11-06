"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@heroui/react";

import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { OfficeLogo } from "@/components/ui/brand/OfficeLogo";
import { Notice } from "@/components/ui/feedback/Notice";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog";
import { useOfficeLogo } from "@/hooks/useOfficeLogo";
import { usePermissions } from "@/hooks/usePermissions";
import type { Office } from "@/interfaces/tenant/Tenant.interface";
import { currentOffice, removeOfficeLogo, uploadOfficeLogo } from "@/services/tenantService";
import { LOGO_ACCEPT, OFFICE_FIELDS, logoFileError, officeValue, sendLabel } from "./officeInfo";

/**
 * O escritório em "Meus dados": quem ele é para o sistema e a logo que
 * aparece em toda tela.
 *
 * Todos veem — é o escritório onde a pessoa trabalha, e a logo é a que ela já
 * vê no cabeçalho. Só ADMIN troca: para os outros papéis os botões não
 * aparecem (o backend recusaria de qualquer jeito).
 *
 * A prévia mostra a logo nos dois fundos em que ela aparece, o claro do
 * cabeçalho e o escuro do site: uma logo escura com fundo transparente some
 * no site, e é aqui que dá para ver isso antes de todo mundo ver.
 */
export function OfficeSection() {
  const { canChangeOfficeLogo } = usePermissions();
  const { logoUrl, remember } = useOfficeLogo();
  const [office, setOffice] = useState<Office | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    currentOffice()
      .then(
        (envelope) => {
          if (alive) setOffice(envelope?.data ?? null);
        },
        // O axiosService já mostrou o erro.
        () => {
          if (alive) setLoadFailed(true);
        },
      )
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const valueOf = (key: (typeof OFFICE_FIELDS)[number]["key"]) => (office ? officeValue(office, key) : "—");

  const send = async (file: File) => {
    const problem = logoFileError(file);
    setFileError(problem);
    if (problem) return;

    setIsSending(true);
    try {
      const { data } = await uploadOfficeLogo(file);
      if (data) {
        setOffice(data);
        remember(data.logoUrl ?? null);
      }
    } catch {
      // A central já mostrou o motivo que o servidor deu.
    } finally {
      setIsSending(false);
    }
  };

  const reset = async () => {
    setIsSending(true);
    try {
      await removeOfficeLogo();
      remember(null);
    } catch {
      // Idem: o aviso já saiu, e a logo continua a que estava.
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <SectionTitle as="h2">Escritório</SectionTitle>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loadFailed ? (
          <Notice tone="danger">Não foi possível carregar os dados do escritório.</Notice>
        ) : (
          <dl className="grid grid-cols-1 content-start gap-x-6 gap-y-3 sm:grid-cols-2">
            {OFFICE_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="text-xs text-gray-100/70">{label}</dt>
                <dd className="text-sm text-primary">
                  {isLoading ? <Skeleton className="h-5 w-40 rounded-md" /> : valueOf(key)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <figure className="flex flex-col gap-2">
              <div className="flex h-28 items-center justify-center rounded-xl bg-page p-4 ring-1 ring-light-gray">
                <OfficeLogo tone="blue" alt="Logo sobre fundo claro" width={160} height={80} className="max-h-20 w-auto" />
              </div>
              <figcaption className="text-xs text-gray-100/70">No cabeçalho</figcaption>
            </figure>
            <figure className="flex flex-col gap-2">
              <div className="flex h-28 items-center justify-center rounded-xl bg-primary p-4">
                <OfficeLogo tone="gold" alt="Logo sobre fundo escuro" width={160} height={80} className="max-h-20 w-auto" />
              </div>
              <figcaption className="text-xs text-gray-100/70">No site</figcaption>
            </figure>
          </div>

          <p className="text-xs text-gray-100/70">
            {logoUrl ? "Logo enviada pelo escritório." : "Marca padrão do sistema."} PNG, JPEG ou WebP de
            até 2 MB; prefira fundo transparente, porque a mesma imagem aparece nos dois fundos.
          </p>

          {canChangeOfficeLogo ? (
            <ActionGroup className="self-start">
              <ActionButton tone="primary" disabled={isSending} onClick={() => inputRef.current?.click()}>
                {sendLabel(isSending, Boolean(logoUrl))}
              </ActionButton>
              {logoUrl && (
                <ActionButton tone="neutral" disabled={isSending} onClick={() => setIsConfirmingReset(true)}>
                  Voltar à marca padrão
                </ActionButton>
              )}
            </ActionGroup>
          ) : (
            <p className="text-xs text-gray-100/70">Só a administração do escritório troca a logo.</p>
          )}
          {fileError && (
            <p role="alert" className="text-xs text-danger">
              {fileError}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            aria-label="Escolher a logo"
            accept={LOGO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void send(file);
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmingReset}
        onClose={() => setIsConfirmingReset(false)}
        onConfirm={() => void reset()}
        heading="Voltar à marca padrão?"
        description="A logo enviada sai de todas as telas, para todos do escritório, e o arquivo é apagado. Para usá-la de novo, basta enviar outra vez."
        confirmLabel="Voltar à marca padrão"
        cancelLabel="Manter a logo"
      />
    </Card>
  );
}
