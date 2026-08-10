"use client";

import { Toast } from "@heroui/react";

/**
 * Providers de UI do lado do cliente.
 *
 * O HeroUI v3 é `client-only`: importá-lo direto no root layout (Server
 * Component) quebra o build. Este wrapper isola a fronteira client/server e
 * mantém o `layout.tsx` como Server Component.
 *
 * Obs.: o v3 NÃO tem `HeroUIProvider` — só o provider de toasts é necessário.
 */
export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Toast.Provider placement="top end" />
      {children}
    </>
  );
}
