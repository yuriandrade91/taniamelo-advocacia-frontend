"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  canChangeOfficeLogo,
  canDestroy,
  canListUsers,
  canSeeFinance,
  canSeeInssPassword,
} from "@/lib/permissions";

type Permissions = {
  canDestroy: boolean;
  canSeeInssPassword: boolean;
  canListUsers: boolean;
  /** Só ADMIN — advogado também não vê. Ver `canSeeFinance` em permissions. */
  canSeeFinance: boolean;
  /** Só ADMIN. Ver `canChangeOfficeLogo` em permissions. */
  canChangeOfficeLogo: boolean;
};

/** As permissões como texto ("10101"): snapshot estável para comparar por valor. */
const readKey = () =>
  [canDestroy(), canSeeInssPassword(), canListUsers(), canSeeFinance(), canChangeOfficeLogo()]
    .map(Number)
    .join("");

/** Outra aba que entra ou sai muda a sessão: o evento `storage` avisa. */
const subscribe = (onChange: () => void) => {
  globalThis.addEventListener("storage", onChange);
  return () => globalThis.removeEventListener("storage", onChange);
};

/**
 * Permissões do usuário da sessão, para a UI decidir o que mostrar.
 *
 * A origem é o `localStorage`, que não existe no servidor: o HTML pré-gerado
 * sai com tudo `false` (`getServerSnapshot`) e a hidratação lê a sessão logo
 * em seguida. Em navegação dentro do app a leitura é imediata — a tela já
 * nasce sabendo, sem um render com tudo `false` que dispararia chamadas duas
 * vezes.
 */
export function usePermissions(): Permissions {
  const key = useSyncExternalStore(subscribe, readKey, () => "00000");
  return useMemo(() => {
    const [canDestroy, canSeeInssPassword, canListUsers, canSeeFinance, canChangeOfficeLogo] = [...key].map((c) => c === "1");
    return {
      canDestroy,
      canSeeInssPassword,
      canListUsers,
      canSeeFinance,
      canChangeOfficeLogo,
    };
  }, [key]);
}
