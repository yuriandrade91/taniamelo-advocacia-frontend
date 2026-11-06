"use client";

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/constants/endpoints/paths";
import { useStoredValue } from "@/hooks/useStoredValue";
import { officeLogoChecks as checks, officeLogoKey as storageKey, rememberOfficeLogo } from "@/lib/officeLogo";
import { getTenantSlug } from "@/lib/tenant";
import { resolveTenant } from "@/services/tenantService";

export type OfficeLogoState = {
  /**
   * O caminho da logo do escritório na API, `null` para a marca padrão, ou
   * `undefined` enquanto ainda não se sabe (HTML pré-gerado, primeira visita).
   */
  logoUrl: string | null | undefined;
  /** Grava a logo que o servidor acabou de devolver; `null` volta à padrão. */
  remember: (logoUrl: string | null) => void;
};

/**
 * A logo do escritório, para todo lugar que mostra a marca.
 *
 * O login e o refresh já trazem o caminho (`lib/session` o grava), e ele fica
 * lembrado: recarregar a página mostra a logo do escritório sem esperar o
 * `resolve`. O `resolve` confere uma vez por carga e corrige o lembrado se a
 * logo mudou em outro computador. Se ele falhar e não houver
 * nada lembrado, vale a marca padrão — a tela não fica sem marca.
 */
export function useOfficeLogo(): OfficeLogoState {
  const slug = getTenantSlug();
  const [stored, store] = useStoredValue(storageKey(slug));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let alive = true;
    checks
      .load(slug, () => resolveTenant(slug).then((tenant) => tenant?.logoUrl ?? ""))
      .then(
        (logoUrl) => {
          if (alive) store(logoUrl);
        },
        () => undefined,
      )
      .finally(() => {
        if (alive) setSettled(true);
      });
    return () => {
      alive = false;
    };
  }, [slug, store]);

  const remember = (logoUrl: string | null) => rememberOfficeLogo(slug, logoUrl);

  if (stored !== null) return { logoUrl: stored || null, remember };
  return { logoUrl: settled ? null : undefined, remember };
}

/** O endereço da imagem para um `<img>`: a API serve a logo sem token nem cabeçalho. */
export const officeLogoSrc = (logoUrl: string): string => `${API_BASE_URL}${logoUrl}`;
