"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Field } from "@/components/ui/form/Field";
import { usePermissoes } from "@/hooks/usePermissoes";
import { revealInssPassword } from "@/services/clientService";

/**
 * A senha do "meu INSS" na ficha do cliente.
 *
 * Ela não vem mais junto da ficha. Voltava em toda abertura de `GET
 * /clients/{id}` — e ia junto para log de acesso, cache de navegador e print de
 * tela de quem só queria conferir um telefone. Agora sai por uma rota própria,
 * restrita a advogado/admin, e **cada leitura fica registrada** com quem
 * consultou e quando.
 *
 * Daí o botão: a chamada acontece quando alguém pede, não quando a tela monta.
 * Se buscássemos ao abrir a aba, toda visita viraria uma linha de auditoria e a
 * trilha deixaria de responder "quem foi buscar a senha da dona Maria em
 * março?", que é a pergunta pela qual ela existe.
 *
 * Revelada, reesconde sozinha depois de {@link SEGUNDOS_VISIVEL}s: senha aberta
 * numa aba esquecida é a mesma exposição que tirá-la do GET evitou.
 *
 * Em edição o campo começa VAZIO e o que for digitado é a senha nova. Deixar em
 * branco mantém a que está gravada — é o contrato do backend, e é o que impede
 * que editar o telefone de um cliente apague o acesso dele ao INSS.
 */

export const SEGUNDOS_VISIVEL = 20;

const MASCARA = "••••••••";

type Props = {
  clientId: string;
  /** Em edição o campo vira entrada de senha nova; fora dela, leitura sob demanda. */
  isEditing: boolean;
  /** Senha nova digitada. String vazia significa "não mexeu". */
  novaSenha: string;
  onNovaSenhaChange: (valor: string) => void;
  className?: string;
};

export function InssPasswordField({
  clientId,
  isEditing,
  novaSenha,
  onNovaSenhaChange,
  className,
}: Props) {
  const { podeVerSenhaDoInss } = usePermissoes();
  const [revelada, setRevelada] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const esconder = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRevelada(null);
  }, []);

  // Desmontar com a senha na tela (fechar o modal, trocar de cliente) não pode
  // deixar o timer vivo nem o valor em memória.
  useEffect(() => esconder, [esconder, clientId]);

  // Entrar em edição esconde: o campo passa a ser "senha nova", e o valor antigo
  // ali dentro viraria uma regravação da mesma senha sem ninguém pedir.
  useEffect(() => {
    if (isEditing) esconder();
  }, [isEditing, esconder]);

  async function revelar() {
    setErro("");
    setCarregando(true);
    try {
      const senha = await revealInssPassword(clientId);
      setRevelada(senha);
      timer.current = setTimeout(esconder, SEGUNDOS_VISIVEL * 1000);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setErro(
        status === 403
          ? "Só advogado ou admin pode ver a senha."
          : status === 404
            ? "Cliente não encontrado."
            : "Não foi possível consultar a senha.",
      );
    } finally {
      setCarregando(false);
    }
  }

  if (isEditing) {
    return (
      <Field
        label='Senha "meu inss"'
        type="text"
        value={novaSenha}
        onChange={(event) => onNovaSenhaChange(event.target.value)}
        placeholder="Deixe em branco para manter a atual"
        className={className}
      />
    );
  }

  return (
    <div className={className} data-testid="inss-password-field">
      {/*
        O botão fica AO LADO do campo, não embaixo. Embaixo ele encostava na
        borda do accordion e o cabeçalho da seção seguinte cobria o clique — um
        controle que só funciona se a pessoa rolar a tela até a posição certa.
      */}
      <div className="flex items-end gap-2">
        <Field
          label='Senha "meu inss"'
          isReadOnly
          type="text"
          value={revelada ?? MASCARA}
          onChange={() => {}}
          isInvalid={!!erro}
          errorMessage={erro}
          className="flex-1"
        />
        {podeVerSenhaDoInss && (
          <button
            type="button"
            onClick={revelada ? esconder : revelar}
            disabled={carregando}
            data-testid="inss-password-toggle"
            className="mb-2 shrink-0 whitespace-nowrap text-xs text-secondary underline underline-offset-2 disabled:opacity-60"
          >
            {carregando
              ? "Consultando…"
              : revelada
                ? "Esconder"
                : "Revelar senha"}
          </button>
        )}
      </div>
      {revelada && (
        // Dizer que vai sumir sozinha evita o susto de "sumiu, perdi?" e avisa
        // que o valor não fica na tela para quem passar depois.
        <p className="mt-1 text-xs text-secondary/70">
          Some sozinha em {SEGUNDOS_VISIVEL}s. Esta consulta ficou registrada.
        </p>
      )}
    </div>
  );
}
