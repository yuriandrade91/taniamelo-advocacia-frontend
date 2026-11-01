import type { ReactNode } from "react";

/** A tela inteira no lugar de uma página que não abriu: o erro e a página inexistente. */
export function PageMessage({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  /** O que a pessoa pode fazer em seguida. */
  children: ReactNode;
}>) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold text-primary">{title}</h1>
      <p className="max-w-md text-sm text-gray-100">{description}</p>
      <div className="mt-3">{children}</div>
    </main>
  );
}
