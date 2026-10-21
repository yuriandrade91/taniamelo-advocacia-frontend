import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { vi } from "vitest";
import Providers from "@/app/providers";

/**
 * Desenha a tela dentro dos providers do app (os toasts aparecem, como no
 * navegador) e devolve o `user` da user-event. Com `fakeTimers`, o relógio é
 * do teste: janelas de desfazer e debounces andam com `vi.advanceTimersByTime`.
 */
export function renderApp(ui: ReactElement, { fakeTimers = false } = {}) {
  if (fakeTimers) vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup(fakeTimers ? { advanceTimers: vi.advanceTimersByTime } : {});
  const result = render(<Providers>{ui}</Providers>);
  return { user, ...result };
}
