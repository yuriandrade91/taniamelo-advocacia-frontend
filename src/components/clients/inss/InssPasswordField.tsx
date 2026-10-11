"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import {
  copyPassword,
  Field,
  FIELD_ICON_BUTTON_CLASS,
} from "@/components/ui/form/Field";
import { CopyIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icons/glyphs";
import { usePermissions } from "@/hooks/usePermissions";
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
 * Revelada, reesconde sozinha depois de {@link VISIBLE_SECONDS}s: senha aberta
 * numa aba esquecida é a mesma exposição que tirá-la do GET evitou. A contagem
 * aparece andando, e não parada em "20s": o número congelado parecia enfeite,
 * e quem ia copiar a senha não tinha como saber se tinha quinze segundos ou
 * um. Com ela andando, o copiar ao lado deixa de ser corrida contra o
 * desconhecido.
 *
 * O copiar só existe com a senha à vista. Copiar atrás da máscara poria no
 * clipboard um valor que ninguém conferiu — e é justamente a conferência que
 * leva alguém a revelar a senha.
 *
 * Em edição o campo começa VAZIO e o que for digitado é a senha nova. Deixar em
 * branco mantém a que está gravada — é o contrato do backend, e é o que impede
 * que editar o telefone de um cliente apague o acesso dele ao INSS.
 */

const VISIBLE_SECONDS = 20;

const MASCARA = "••••••••";

type Props = {
  clientId: string;
  /** Em edição o campo vira entrada de senha nova; fora dela, leitura sob demanda. */
  isEditing: boolean;
  /** Senha nova digitada. String vazia significa "não mexeu". */
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  className?: string;
};

export function InssPasswordField({
  clientId,
  isEditing,
  newPassword,
  onNewPasswordChange,
  className,
}: Props) {
  const { canSeeInssPassword } = usePermissions();
  const [isRevealed, setIsRevealed] = useState<string | null>(null);
  /** Instante em que a senha se esconde — a contagem lê daqui. */
  const [hideAt, setHideAt] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setIsRevealed(null);
    setHideAt(0);
  }, []);

  // Desmontar com a senha na tela (fechar o modal, trocar de cliente) não pode
  // deixar o timer vivo nem o valor em memória.
  useEffect(() => hide, [hide, clientId]);

  // Entrar em edição esconde: o campo passa a ser "senha nova", e o valor antigo
  // ali dentro viraria uma regravação da mesma senha sem ninguém pedir.
  useEffect(() => {
    if (isEditing) hide();
  }, [isEditing, hide]);

  async function reveal() {
    setError("");
    setIsLoading(true);
    try {
      const password = await revealInssPassword(clientId);
      setIsRevealed(password);
      // Quem esconde é este `setTimeout`, não a contagem na tela: se o
      // intervalo do contador for estrangulado numa aba em segundo plano, a
      // senha sai da tela na hora certa do mesmo jeito.
      setHideAt(Date.now() + VISIBLE_SECONDS * 1000);
      timer.current = setTimeout(hide, VISIBLE_SECONDS * 1000);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 403
          ? "Só advogado ou admin pode ver a senha."
          : status === 404
            ? "Cliente não encontrado."
            : "Não foi possível consultar a senha.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isEditing) {
    return (
      <Field
        label='Senha "meu inss"'
        type="text"
        value={newPassword}
        onChange={(event) => onNewPasswordChange(event.target.value)}
        placeholder="Deixe em branco para manter a atual"
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {/*
        Os botões ficam DENTRO do campo, à direita. Embaixo, o antigo link
        "Revelar senha" encostava na borda do accordion e o cabeçalho da seção
        seguinte cobria o clique — um controle que só funcionava se a pessoa
        rolasse a tela até a posição certa. Dentro do campo eles acompanham o
        campo onde ele estiver, e são os mesmos dois ícones do `PasswordField`.
      */}
      <Field
        label='Senha "meu inss"'
        isReadOnly
        type="text"
        value={isRevealed ?? MASCARA}
        onChange={() => {}}
        isInvalid={!!error}
        errorMessage={error}
        trailing={
          canSeeInssPassword ? (
            <>
              {isRevealed && (
                <button
                  type="button"
                  onClick={() => void copyPassword(isRevealed)}
                  aria-label="Copiar senha"
                  className={FIELD_ICON_BUTTON_CLASS}
                >
                  <CopyIcon />
                </button>
              )}
              <button
                type="button"
                onClick={isRevealed ? hide : reveal}
                disabled={isLoading}
                aria-label={isRevealed ? "Esconder senha" : "Revelar senha"}
                className={FIELD_ICON_BUTTON_CLASS}
              >
                {isLoading ? (
                  <LoadingCircle size={16} label="Consultando a senha" />
                ) : isRevealed ? (
                  <EyeOffIcon />
                ) : (
                  <EyeIcon />
                )}
              </button>
            </>
          ) : undefined
        }
      />
      {isRevealed && hideAt > 0 && (
        // Dizer que vai sumir sozinha evita o susto de "sumiu, perdi?" e avisa
        // que o valor não fica na tela para quem passar depois.
        <HidesIn key={hideAt} hideAt={hideAt} />
      )}
    </div>
  );
}

/** Quantos segundos inteiros faltam até `prazo` — nunca negativo. */
const secondsUntil = (hideAt: number) =>
  Math.ceil(Math.max(0, hideAt - Date.now()) / 1000);

/**
 * O aviso de que a senha se esconde, com a contagem andando.
 *
 * É só apresentação (ver `revelar`), e o `prazo` é um instante absoluto, não
 * uma duração: remontar no meio retoma de onde estava em vez de reiniciar a
 * contagem.
 *
 * O tique é mais curto que um segundo porque o número vem de um
 * arredondamento para cima: a um tique por segundo, a conta e o relógio saem
 * de fase e o contador fica visivelmente parado num número e depois pula dois.
 */
const TICK_MS = 250;

function HidesIn({ hideAt: hideAt }: { hideAt: number }) {
  const [segundos, setSegundos] = useState(() => secondsUntil(hideAt));

  // Sem acerto inicial aqui: quem monta passa `key={prazo}`, então um prazo
  // novo é um componente novo e o valor inicial já vem do próprio prazo.
  useEffect(() => {
    const id = setInterval(() => setSegundos(secondsUntil(hideAt)), TICK_MS);
    return () => clearInterval(id);
  }, [hideAt]);

  return (
    <p className="mt-1 text-xs text-secondary/70">
      Some sozinha em <span className="tabular-nums">{segundos}</span>s. Esta
      consulta ficou registrada.
    </p>
  );
}
