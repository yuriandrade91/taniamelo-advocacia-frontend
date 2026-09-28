"use client";

import React, { useEffect, useRef } from "react";
import { CloseIcon, SearchIcon } from "./icons";

/**
 * Busca do navbar — cresce a partir da lupa e recolhe de volta nela.
 *
 * ── Por que transição de CSS e não animate.css ──
 * A versão anterior combinava keyframe (`slideInRight`) com troca de layout
 * (`shrink-0` ⇄ `flex-1`) e montagem/desmontagem condicional. Três relógios
 * diferentes para o mesmo gesto: o layout mudava num frame, o keyframe levava
 * 400ms e o desmonte vinha depois — daí o menu pular, o campo vir de fora da
 * tela e os ícones reaparecerem por cima da saída.
 *
 * Aqui o elemento **está sempre montado** e sobreposto (`absolute`), ancorado
 * pela direita em cima do grupo de ações. Só a largura transiciona, de "do
 * tamanho da lupa" até a largura aberta. Sem mudança de layout, sem desmonte:
 * a animação é reversível no meio do caminho e não há estados intermediários
 * para sincronizar.
 *
 * `right-0` + crescimento da largura = a borda direita fica parada sobre a
 * lupa e só a esquerda avança. É isso que dá a leitura de "abrir a partir
 * dela".
 */

/** Largura fechada: o mesmo diâmetro do botão da lupa. */
const COLLAPSED_WIDTH = "2.25rem";

/**
 * Aberta, ocupa a metade direita livre do header: metade do que sobra depois
 * do menu, menos uma folga para não encostar nele.
 *
 * O menu é centralizado, então o espaço livre de cada lado é
 * `(largura do header - largura do menu) / 2`. `--menu-width` é publicado pelo
 * `Navbar` via `ResizeObserver` — o CSS não tem como perguntar a largura de um
 * irmão, e usar valor fixo em `rem`/`vw` era o que fazia a busca invadir os
 * itens do menu.
 */
const GAP = "1.5rem";
const EXPANDED_WIDTH = `calc((100% - var(--menu-width, 0px)) / 2 - ${GAP})`;
const DURATION_MS = 320;

export type NavSearchProps = {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClose: () => void;
  placeholder?: string;
};

export default function NavSearch({
  isOpen,
  value,
  onChange,
  onSubmit,
  onClose,
  placeholder = "Buscar clientes, compromissos, documentos...",
}: NavSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      inputRef.current?.blur();
      return;
    }
    // Um frame depois: focar junto com o início da transição faz o browser
    // rolar até o elemento enquanto ele ainda tem 36px de largura.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const term = value.trim();
      if (term) onSubmit(term);
    }
  };

  return (
    <div
      role="search"
      aria-hidden={!isOpen}
      style={{
        width: isOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        transitionDuration: `${DURATION_MS}ms`,
      }}
      className={`absolute right-0 top-1/2 z-20 flex h-12 -translate-y-1/2 items-center gap-2 overflow-hidden rounded-full bg-primary transition-[width,opacity] ease-out ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* `shrink-0` em tudo: enquanto a largura cresce, nada pode ser espremido
          — senão o ícone e o botão "amassam" durante a transição. */}
      <span className="ml-3.5 shrink-0 text-white/60">
        <SearchIcon className="h-5 w-5" />
      </span>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Buscar"
        // `tabIndex -1` fechado: sem isso o campo continua no fluxo de Tab
        // mesmo invisível.
        tabIndex={isOpen ? 0 : -1}
        className="min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none"
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar busca"
        tabIndex={isOpen ? 0 : -1}
        className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white cursor-pointer"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
