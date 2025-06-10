"use client";
import Image from "next/image";

export default function Navbar() {
  const menuItems = [
    { label: "Home", href: "#home" },
    { label: "Clientes", href: "/clientes" },
    { label: "Documentos", href: "#documentos" },
    { label: "Pagamentos", href: "#pagamentos" },
    { label: "Carteira", href: "#carteira" },
    { label: "Calendario", href: "#calendario" },
  ];

  return (
    <div className="w-full flex justify-center bg-light-gray">
      <header className="h-20 w-full mt-4 flex items-center justify-between px-4 md:px-8 bg-primary text-white  rounded-[8px] mx-auto">
        <div className="flex items-center gap-4 min-w-[80px]">
          <Image
            src="../svg/white-logo.svg"
            alt="Logo"
            height={120}
            width={120}
          />

          <div className="h-14 w-[2px] bg-secondary"></div>
        </div>
        <nav className="flex-1 min-w-[120px]">
          <ul className="flex flex-wrap justify-center gap-x-1 gap-y-0.5 md:gap-x-4 md:gap-y-0 items-center">
            {menuItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={`block px-4 py-2 text-sm md:text-base rounded-[8px] transition-colors duration-150 hover:bg-white/15 focus:bg-white/15 active:bg-white/15`}
                  tabIndex={0}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="w-8 h-8 md:w-14 md:h-14 rounded-full bg-white/20 flex items-center justify-center text-primary font-bold text-base md:text-lg min-w-[32px] md:min-w-[40px]">
          <span className="text-white font-light">TM</span>
        </div>
      </header>
    </div>
  );
}
