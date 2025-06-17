"use client";

import Navbar from "@/components/Navbar/Navbar";
import { HeroUIProvider } from "@heroui/system";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HeroUIProvider>
      <html lang="pt-BR" >
        <body>
          <div className="h-screen max-w-[1440px] mx-auto bg-light-gray">
            <Navbar />
            {children}
          </div>
        </body>
      </html>
    </HeroUIProvider>
  );
}
