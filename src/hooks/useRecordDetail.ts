"use client";

import { useEffect, useRef, useState } from "react";

/**
 * O registro que um painel de detalhes mostra: busca ao abrir, relê depois de
 * salvar e sabe dizer que não conseguiu.
 *
 * Os painéis da Carteira e de Pagamentos abriam o mesmo bloco de código — o
 * efeito com a trava `active` contra a resposta que chega depois de trocar de
 * registro, o `failed` quando a busca volta vazia, e a releitura após gravar
 * (o servidor recalcula status e atraso, então o que a tela mostra tem que ser
 * o que ficou gravado, não o que foi digitado).
 *
 * A dependência é a **chave**, não a função: `load` fecha sobre o alvo e nasce
 * de novo a cada render do pai, o que religaria a busca sem que nada tivesse
 * mudado. Quem chama monta a chave com o que de fato identifica o registro.
 */
export function useRecordDetail<T>(key: string, load: () => Promise<T | null>) {
  const [detail, setDetail] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  /** Os ouvintes abaixo chamam sempre a versão atual do `load`. */
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });

  useEffect(() => {
    let active = true;

    latest
      .current()
      .then((next) => {
        if (!active) return;
        if (next) setDetail(next);
        else setFailed(true);
      })
      .catch(() => {
        // O axiosService já mostrou o toast; aqui só a tela diz que falhou.
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [key]);

  /** Relê o registro gravado. Falha não apaga o que está na tela. */
  const reload = async () => {
    const fresh = await latest.current().catch(() => null);
    if (fresh) setDetail(fresh);
  };

  return { detail, failed, reload };
}
