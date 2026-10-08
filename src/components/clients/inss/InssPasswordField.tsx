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

export const VISIBLE_SECONDS = 20;

const MASCARA = "••••••••";

type Props = {
  clientId: string;
  /** Em edição o campo vira entrada de senha nova; fora dela, leitura sob demanda. */
  isEditing: boolean;
  /** Senha nova digitada. String vazia significa "não mexeu". */
  newPassword: string;
  onNewPasswordChange: (valor: string) => void;
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
  const [revelada, setRevelada] = useState<string | null>(null);
  /** Instante em que a senha se esconde — a contagem lê daqui. */
  const [prazo, setPrazo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRevelada(null);
    setPrazo(0);
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
    setErro("");
    setCarregando(true);
    try {
      const password = await revealInssPassword(clientId);
      setRevelada(password);
      // Quem esconde é este `setTimeout`, não a contagem na tela: se o
      // intervalo do contador for estrangulado numa aba em segundo plano, a
      // senha sai da tela na hora certa do mesmo jeito.
      setPrazo(Date.now() + VISIBLE_SECONDS * 1000);
      timer.current = setTimeout(hide, VISIBLE_SECONDS * 1000);
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
        value={newPassword}
        onChange={(event) => onNewPasswordChange(event.target.value)}
        placeholder="Deixe em branco para manter a atual"
        className={className}
      />
    );
  }

  return (
    <div className={className} data-testid="inss-password-field">
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
        value={revelada ?? MASCARA}
        onChange={() => {}}
        isInvalid={!!erro}
        errorMessage={erro}
        trailing={
          canSeeInssPassword ? (
            <>
              {revelada && (
                <button
                  type="button"
                  onClick={() => void copyPassword(revelada)}
                  aria-label="Copiar senha"
                  data-testid="inss-password-copy"
                  className={FIELD_ICON_BUTTON_CLASS}
                >
                  <CopyIcon />
                </button>
              )}
              <button
                type="button"
                onClick={revelada ? hide : reveal}
                disabled={carregando}
                aria-label={revelada ? "Esconder senha" : "Revelar senha"}
                data-testid="inss-password-toggle"
                className={FIELD_ICON_BUTTON_CLASS}
              >
                {carregando ? (
                  <LoadingCircle size={16} label="Consultando a senha" />
                ) : revelada ? (
                  <EyeOffIcon />
                ) : (
                  <EyeIcon />
                )}
              </button>
            </>
          ) : undefined
        }
      />
      {revelada && prazo > 0 && (
        // Dizer que vai sumir sozinha evita o susto de "sumiu, perdi?" e avisa
        // que o valor não fica na tela para quem passar depois.
        <SomeEm key={prazo} prazo={prazo} />
      )}
    </div>
  );
}

/** Quantos segundos inteiros faltam até `prazo` — nunca negativo. */
const secondsUntil = (prazo: number) =>
  Math.ceil(Math.max(0, prazo - Date.now()) / 1000);

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

function SomeEm({ prazo }: { prazo: number }) {
  const [segundos, setSegundos] = useState(() => secondsUntil(prazo));

  // Sem acerto inicial aqui: quem monta passa `key={prazo}`, então um prazo
  // novo é um componente novo e o valor inicial já vem do próprio prazo.
  useEffect(() => {
    const id = setInterval(() => setSegundos(secondsUntil(prazo)), TICK_MS);
    return () => clearInterval(id);
  }, [prazo]);

  return (
    <p className="mt-1 text-xs text-secondary/70">
      Some sozinha em <span className="tabular-nums">{segundos}</span>s. Esta
      consulta ficou registrada.
    </p>
  );
}
