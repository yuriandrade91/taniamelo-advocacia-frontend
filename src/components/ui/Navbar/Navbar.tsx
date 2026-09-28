"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import svgPaths from "@/constants/svg/paths";
import NavMenuItem from "./NavMenuItem";
import NavSearch from "./NavSearch";
import NotificationCenter, {
  type NotificationItem,
} from "./NotificationCenter";
import UserMenu from "./UserMenu";
import { SearchIcon } from "./icons";
import { usePermissoes } from "@/hooks/usePermissoes";

/**
 * Barra superior da área autenticada.
 *
 * Header `relative` com logo à esquerda, ações à direita e, por cima, dois
 * elementos absolutos: o menu (centralizado) e a busca (ancorada à direita).
 *
 * ── Menu centralizado ──
 * `absolute left-1/2 -translate-x-1/2`. Como item de flex ele nunca ficaria no
 * centro real: a logo ocupa espaço à esquerda sem contrapeso à direita, o que
 * empurrava o menu meia-logo para o lado.
 *
 * ── Busca ──
 * Sempre montada, abre e fecha por transição de largura — não por keyframe com
 * montagem condicional, que misturava três relógios (layout, animação e
 * desmonte) e produzia pulos e sobreposição. Sem mudança de layout, nada
 * remonta e o gesto é reversível no meio do caminho.
 *
 * A largura aberta sai de `--menu-width` (medido aqui, publicado no header):
 * é a única peça que o CSS não consegue obter sozinho para saber onde o menu
 * termina.
 */

/**
 * `somenteAdmin` marca as telas de dinheiro (D3). O backend já recusa o
 * financeiro do cliente a quem não é ADMIN — advogado inclusive —, e deixar o
 * item no menu é convidar para uma tela que só vai dizer não.
 *
 * Esconder não é a autorização: a rota continua existindo, e quem digitar o
 * endereço cai na mesma guarda dentro da página.
 */
const MENU_ITEMS = [
  { label: "Início", href: "/home" },
  { label: "Clientes", href: "/clientes" },
  { label: "Agenda", href: "/agenda" },
  // { label: "Documentos", href: "#documentos" },
  { label: "Pagamentos", href: "/pagamentos", somenteAdmin: true },
  { label: "Carteira", href: "/carteira", somenteAdmin: true },
];

/**
 * TODO(backend): não há endpoint de notificações. Dados de exemplo até existir
 * — o `NotificationCenter` é controlado por props justamente para que a troca
 * seja só nesta constante.
 */
const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    kind: "appointment",
    title: "Entrevista com Yuri Andrade",
    description: "Hoje, às 14h30",
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: "2",
    kind: "document",
    title: "RG de Davis Souza está vencido",
    description: "Documentação pendente",
    createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  },
  {
    id: "3",
    kind: "payment",
    title: "Pagamento de Anderson Reis em atraso",
    description: "Vencido em 28/12/2024",
    createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString(),
    isRead: true,
  },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { podeVerFinanceiro } = usePermissoes();
  /**
   * Enquanto as permissões não chegam do storage, `podeVerFinanceiro` é
   * `false` e os itens de dinheiro ficam de fora. Para um ADMIN isso é um
   * instante sem dois itens, em vez de dois itens que aparecem e somem — o
   * segundo é bem mais estranho de ver.
   */
  const itensVisiveis = MENU_ITEMS.filter(
    (item) => !item.somenteAdmin || podeVerFinanceiro,
  );

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  /**
   * Largura do menu, publicada como `--menu-width` para a busca calcular até
   * onde pode crescer. Medida com `ResizeObserver` porque ela muda com a fonte,
   * o zoom e o comprimento dos rótulos — não é constante que dê para fixar.
   */
  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [menuWidth, setMenuWidth] = useState(0);

  useEffect(() => {
    const node = menuRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setMenuWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchTerm("");
  };

  const handleSearchSubmit = (term: string) => {
    router.push(`/clientes?searchTerm=${encodeURIComponent(term)}`);
    closeSearch();
  };

  const markAllNotificationsRead = () =>
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true })),
    );

  return (
    <header
      ref={headerRef}
      style={{ ["--menu-width" as string]: `${menuWidth}px` }}
      className="relative mb-6 flex h-16 items-center gap-4 font-medium"
    >
      {/* ── Logo ── */}
      <Link
        href="/home"
        className="flex shrink-0 items-center"
        aria-label="Início"
      >
        <Image
          src={svgPaths.LOGOS.BLUE}
          alt="Tânia Melo Advocacia Previdenciária"
          height={96}
          width={96}
          priority
          className="h-20 w-auto"
        />
      </Link>

      {/*
        ── Menu ──
        `absolute` centralizado no header: só assim ele fica no centro de
        verdade. Como item de flex ele herdava metade da largura da logo de
        deslocamento para a direita — a logo ocupa espaço à esquerda e não há
        contrapeso equivalente à direita.
      */}
      <nav className="absolute left-1/2 hidden -translate-x-1/2 md:block">
        <ul
          ref={menuRef}
          className="flex items-center gap-1 rounded-full bg-primary"
        >
          {itensVisiveis.map((item) => (
            <li key={item.href}>
              <NavMenuItem
                href={item.href}
                label={item.label}
                isActive={
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                }
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Ações, encostadas à direita ── */}
      {/*
        `relative` aqui é contrato: é este elemento que serve de bloco de
        contenção para os painéis da central de notificações e do perfil. Sem
        ele, cada painel ancoraria no próprio botão — e a central, por estar à
        esquerda do avatar, abria desalinhada do perfil.
      */}
      <div className="relative ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-primary p-1.5">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Buscar"
          aria-expanded={isSearchOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white cursor-pointer"
        >
          <SearchIcon />
        </button>

        <NotificationCenter
          items={notifications}
          onMarkAllRead={markAllNotificationsRead}
        />

        <UserMenu />
      </div>

      {/*
        ── Busca ──
        Filha direta do header para que `100%` nas contas de largura seja a
        largura do header. Aberta, ocupa a metade direita livre:
        `(100% - largura do menu) / 2`, menos uma folga.

        `--menu-width` é medido em JS porque o CSS não tem como perguntar a
        largura de um irmão. É a única informação que falta para o cálculo.
      */}
      <NavSearch
        isOpen={isSearchOpen}
        value={searchTerm}
        onChange={setSearchTerm}
        onSubmit={handleSearchSubmit}
        onClose={closeSearch}
      />
    </header>
  );
}
