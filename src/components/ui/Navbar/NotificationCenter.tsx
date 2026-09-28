"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAnimatedPresence } from "@/hooks/useAnimatedPresence";
import {
  AlertIcon,
  BellIcon,
  CalendarBellIcon,
  CheckAllIcon,
  FileIcon,
} from "./icons";

/**
 * Central de notificações do navbar.
 *
 * ⚠️ Requer um ancestral posicionado (`relative`) — no navbar, o grupo de
 * ações. O painel ancora nele, e não neste botão, para abrir alinhado com o
 * menu do perfil pela mesma borda direita.
 *
 * O painel desce por `animate__slideInDown` e sobe por `animate__slideOutUp`
 * (o `useAnimatedPresence` mantém o nó montado durante a saída).
 *
 * ⚠️ TODO(backend): não existe endpoint de notificações. O componente é
 * controlado por props — quem monta passa `items` — para que a troca de dados
 * de exemplo por dados reais não exija tocar nesta árvore.
 */

export type NotificationKind = "appointment" | "document" | "payment";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  /** ISO-8601 — o agrupamento por dia é derivado daqui. */
  createdAt: string;
  isRead?: boolean;
  href?: string;
};

export type NotificationCenterProps = {
  items: NotificationItem[];
  onMarkAllRead?: () => void;
  onSelect?: (id: string) => void;
  className?: string;
};

const KIND_STYLE: Record<
  NotificationKind,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  appointment: { icon: CalendarBellIcon, tone: "bg-primary/10 text-primary" },
  document: { icon: FileIcon, tone: "bg-secondary/15 text-secondary" },
  payment: { icon: AlertIcon, tone: "bg-danger/10 text-danger" },
};

/** "Agora", "há 12 min", "há 3 h", "ontem", "12/02". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const diffMinutes = Math.round((Date.now() - then) / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  if (diffHours < 48) return "ontem";

  return new Date(then).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Rótulo do grupo: as notificações são separadas por dia. */
function dayBucket(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Anteriores";

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (date.getTime() >= startOfToday.getTime()) return "Hoje";

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date.getTime() >= startOfYesterday.getTime()) return "Ontem";

  return "Anteriores";
}

const GROUP_ORDER = ["Hoje", "Ontem", "Anteriores"] as const;

export default function NotificationCenter({
  items,
  onMarkAllRead,
  onSelect,
  className = "",
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Painel ancorado abaixo do sino: desce ao abrir e sobe ao fechar — o
  // movimento acompanha a origem do clique, diferente do lateral que usávamos.
  const panel = useAnimatedPresence(isOpen, {
    enter: "animate__slideInDown",
    exit: "animate__slideOutUp",
    durationMs: 320,
  });

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  /** Agrupa por dia preservando a ordem cronológica decrescente. */
  const groups = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const byBucket = new Map<string, NotificationItem[]>();
    sorted.forEach((item) => {
      const bucket = dayBucket(item.createdAt);
      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), item]);
    });

    return GROUP_ORDER.filter((bucket) => byBucket.has(bucket)).map(
      (bucket) => ({ bucket, items: byBucket.get(bucket) ?? [] }),
    );
  }, [items]);

  // Fecha ao clicar fora ou apertar Esc — comportamento esperado de popover.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    /*
      Sem `relative`: o painel é `absolute` e deve ancorar no **grupo de ações**
      do navbar (que é quem tem `relative`), não neste botão. É isso que faz a
      central e o perfil abrirem alinhados pela mesma borda direita.
    */
    <div ref={containerRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={
          unreadCount > 0
            ? `Notificações (${unreadCount} não lidas)`
            : "Notificações"
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white cursor-pointer"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-primary">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {panel.shouldRender && (
        /*
          Contêiner que recorta, ancorado logo abaixo do sino.

          `slideInDown` começa em `translateY(-100%)` — 100% da altura do
          PAINEL. Sem recorte, um painel de ~380px surgiria lá de cima, bem
          antes do ícone. Com `overflow-hidden` aqui, a parte ainda acima fica
          escondida e o painel se revela a partir da borda superior deste
          contêiner, que é exatamente onde o ícone está.

          A sombra fica aqui (no filho, o próprio recorte a comeria) — mas
          então este contêiner PRECISA sumir junto: sem o fade, ele ficava
          parado e opaco durante os 320ms da saída, deixando uma caixa vazia
          com sombra na tela depois que o conteúdo já tinha subido.
        */
        <div
          style={panel.style}
          className={`absolute right-0 z-30 mt-3 w-[360px] overflow-hidden rounded-2xl shadow-xl animate__animated ${
            panel.isLeaving ? "animate__fadeOut" : "animate__fadeIn"
          }`}
        >
          <div
            ref={panel.ref}
            style={panel.style}
            role="dialog"
            aria-label="Central de notificações"
            className={`overflow-hidden rounded-2xl border border-black/5 bg-white ${panel.className}`}
          >
          <header className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-primary">Notificações</p>
              <p className="text-xs text-gray-100/60">
                {unreadCount === 0
                  ? "Tudo em dia"
                  : `${unreadCount} não lida${unreadCount === 1 ? "" : "s"}`}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-secondary hover:bg-light-secondary cursor-pointer"
              >
                <CheckAllIcon className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </header>

          <div className="max-h-[380px] overflow-y-auto">
            {groups.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-gray-100/60">
                Nenhuma notificação por aqui.
              </p>
            )}

            {groups.map(({ bucket, items: bucketItems }) => (
              <section key={bucket}>
                <h3 className="sticky top-0 bg-white/95 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-100/50 backdrop-blur">
                  {bucket}
                </h3>

                <ul>
                  {bucketItems.map((item) => {
                    const { icon: Icon, tone } = KIND_STYLE[item.kind];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onSelect?.(item.id)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-light-gray/40 ${
                            item.isRead ? "" : "bg-secondary/[0.04]"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                          >
                            <Icon />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="min-w-0 flex-1 truncate text-sm text-primary">
                                {item.title}
                              </span>
                              <span className="shrink-0 text-[11px] text-gray-100/50">
                                {relativeTime(item.createdAt)}
                              </span>
                            </span>
                            {item.description && (
                              <span className="mt-0.5 block truncate text-xs text-gray-100/70">
                                {item.description}
                              </span>
                            )}
                          </span>

                          {!item.isRead && (
                            <span
                              aria-hidden="true"
                              className="mt-2 h-2 w-2 shrink-0 rounded-full bg-secondary"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
