import Navbar from "@/components/Navbar/Navbar";
import type { ReactNode } from "react";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="bg-light-gray">
      <body className="w-[90%] mx-auto bg-light-gray">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
