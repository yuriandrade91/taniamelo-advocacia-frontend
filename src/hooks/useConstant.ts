"use client";

import { useRef } from "react";

/**
 * Um valor criado na montagem e fixo até a desmontagem: o cache da tela, o
 * "hoje" que não muda no meio dela, o estado inicial de um formulário.
 *
 * Não é `useState` sem setter: estado que nunca muda não é estado, e quem lê
 * `const [x] = useState(...)` procura em vão onde ele é trocado. Não é
 * `useMemo`: o React se reserva o direito de descartar o memo e recriar —
 * para um cache, isso seria perder o que ele guardou.
 */
export function useConstant<T>(create: () => T): T {
  const box = useRef<{ value: T } | null>(null);
  box.current ??= { value: create() };
  return box.current.value;
}
