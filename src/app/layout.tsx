import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Escritório de Tânia Melo",
  description: "Sistema de gestão de clientes — Tânia Melo Advocacia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `class` + `data-theme` são exigidos pelo tema do HeroUI v3.
    // A fonte Jost e as cores vêm dos tokens em globals.css (@theme).
    <html lang="pt-BR" className="light" data-theme="light">
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
