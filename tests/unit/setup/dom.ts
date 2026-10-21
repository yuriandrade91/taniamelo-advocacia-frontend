/**
 * Preparo do projeto `dom`: os matchers da jest-dom (`toBeInTheDocument`,
 * `toHaveAccessibleName`…) e o que o jsdom não traz e os componentes usam.
 *
 * Cada polyfill aqui é o mínimo para o componente montar — não simula o
 * comportamento (não há layout no jsdom). O que depende de medida real fica
 * no e2e.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { resetApi } from "../support/fakeApi";
import { resetNext } from "../support/next";
import { clearSession } from "@/lib/session";

// A borda HTTP e o roteador do Next são de mentira em cada teste de
// componente; o resto (serviços, hooks, telas) roda de verdade.
vi.mock("@/services/axiosService", async () => ({ default: (await import("../support/fakeApi")).api }));
vi.mock("next/navigation", async () => (await import("../support/next")).navigationModule);

// O mesmo motivo do `testTimeout` do projeto: sob carga, a tela demora a responder.
configure({ asyncUtilTimeout: 15_000 });

beforeEach(() => {
  resetApi();
  resetNext();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  // Telas gravam escolhas na URL (`?modo=`); o próximo teste começa do zero.
  history.replaceState(null, "", "/");
  // Também esvazia os caches de sessão: o próximo teste não herda dados.
  clearSession();
});

if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;

/**
 * Sem layout, nada "aparece" na tela do jsdom. O observador de mentira avisa
 * que cada elemento observado entrou na área visível — o caso comum de quem
 * rola até ele —, e `intersections.leave` simula a saída.
 */
type Watcher = { callback: IntersectionObserverCallback; targets: Set<Element>; observer: IntersectionObserver };
const watchers = new Set<Watcher>();
const notify = (watcher: Watcher, target: Element, isIntersecting: boolean) =>
  watcher.callback([{ target, isIntersecting } as IntersectionObserverEntry], watcher.observer);

class FakeIntersectionObserver {
  private readonly watcher: Watcher;
  constructor(callback: IntersectionObserverCallback) {
    this.watcher = { callback, targets: new Set(), observer: this as unknown as IntersectionObserver };
    watchers.add(this.watcher);
  }
  observe(target: Element) {
    this.watcher.targets.add(target);
    queueMicrotask(() => {
      if (this.watcher.targets.has(target)) notify(this.watcher, target, true);
    });
  }
  unobserve(target: Element) {
    this.watcher.targets.delete(target);
  }
  disconnect() {
    this.watcher.targets.clear();
    watchers.delete(this.watcher);
  }
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;

/** Faz um elemento observado sair da área visível. */
(globalThis as unknown as { intersections: { leave: (target: Element) => void } }).intersections = {
  leave: (target) => {
    for (const watcher of watchers) if (watcher.targets.has(target)) notify(watcher, target, false);
  },
};

Element.prototype.scrollIntoView ??= vi.fn();
Element.prototype.scrollTo ??= vi.fn() as unknown as typeof Element.prototype.scrollTo;
globalThis.scrollTo = vi.fn();

// <dialog>: o jsdom tem o elemento, mas não `showModal`/`close`.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.show ??= function show(this: HTMLDialogElement) {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute("open");
  this.dispatchEvent(new Event("close"));
};

// Os gráficos (chart.js) pedem um contexto 2D que o jsdom não desenha.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

// Web Animations: o jsdom não anima; a animação "termina" na hora.
Element.prototype.animate ??= function animate() {
  return {
    finished: Promise.resolve(),
    cancel: () => {},
    finish: () => {},
    play: () => {},
    pause: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    onfinish: null,
  } as unknown as Animation;
};
Element.prototype.getAnimations ??= () => [];

// Arquivo baixado vira `blob:` no navegador; aqui basta um endereço qualquer.
URL.createObjectURL ??= vi.fn(() => "blob:teste");
URL.revokeObjectURL ??= vi.fn();

// Abrir aba nova: o jsdom não implementa; o teste só precisa que não quebre.
globalThis.open = vi.fn(() => null);

// `Blob.text()` não existe no jsdom; o navegador tem. O `FileReader` é o
// único leitor que o jsdom oferece (NOSONAR abaixo: é justamente o polyfill).
Blob.prototype.text ??= function text(this: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject(new Error("Não foi possível ler o Blob.")));
    reader.readAsText(this); // NOSONAR
  });
};

// O editor rico (ProseMirror) mede seleção e coordenadas; sem layout, tudo é zero.
const emptyRect = () => ({ x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect;
const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getClientRects ??= emptyRects;
Range.prototype.getBoundingClientRect ??= emptyRect;
document.elementFromPoint ??= () => null;
