import { vi } from "vitest";

/**
 * O roteador do Next nos testes de componente: espiões no lugar da navegação
 * e um endereço que o teste escolhe (`setLocation`).
 */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

const location = { pathname: "/home", search: new URLSearchParams(), params: {} as Record<string, string> };

export function setLocation(pathname: string, search = "", params: Record<string, string> = {}) {
  location.pathname = pathname;
  location.search = new URLSearchParams(search);
  location.params = params;
}

export const navigationModule = {
  useRouter: () => router,
  usePathname: () => location.pathname,
  useSearchParams: () => location.search,
  useParams: () => location.params,
  redirect: vi.fn(),
  notFound: vi.fn(),
};

export function resetNext() {
  for (const spy of Object.values(router)) spy.mockClear();
  setLocation("/home");
}
