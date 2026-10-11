"use client";
import React, { useState, useMemo, useEffect, Suspense } from "react";
import Image from "next/image";
import {
  Button,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { login as authLogin, tryRestoreSession, isAuthenticated } from "@/services/authService";
import {
  notificationCenter,
  getApiErrorMessage,
} from "@/services/notificationService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import svgPaths from "@/constants/svg/paths";
import { privateRoutes } from "@/constants/paths/routes";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { tooManyAttemptsMessage } from "@/lib/retryAfter";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons/glyphs";

function LoginForm() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  // Erros do backend (ex.: credenciais inválidas) — repassados ao `Form` via
  // `validationErrors`, que os exibe direto nos campos e os limpa ao editar.
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Destino após autenticar: `?next=` (definido pelo `RouteGuard`) ou a home.
   * Só aceita caminhos internos, para evitar open redirect.
   */
  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return privateRoutes.home;
  }, [searchParams]);

  /**
   * Chegou aqui porque a sessão venceu no meio do uso (`expireSession`): a
   * tela diz isso uma vez, em vez de a pessoa achar que o sistema a expulsou
   * sem motivo — e no lugar dos toasts de erro que a tela anterior daria.
   */
  const isExpired = searchParams.get("expired") === "1";

  // O backend exige apenas que os campos não sejam vazios (@NotBlank).
  const validateLogin = (value: string) => value.trim() !== "";
  const validatePassword = (value: string) => value !== "";

  const toggleVisibility = () => setIsVisible(!isVisible);

  /**
   * Limpa o erro vindo do servidor assim que a pessoa mexe em qualquer campo.
   *
   * Sem isto o formulário TRAVA depois do primeiro erro: o `Form` do React Aria
   * só descarta um `validationError` do campo cujo valor mudou, e quem errou a
   * senha corrige a senha — não o usuário. O erro do campo "login" continua de
   * pé, o formulário segue inválido e o clique em "Entrar" não submete mais
   * nada. A tela parece morta, e a pessoa conclui que o sistema caiu.
   *
   * Encontrado pelo teste da rajada: seis senhas erradas seguidas produziam uma
   * requisição só.
   */
  const clearServerError = () => {
    setFormErrors((current) => (Object.keys(current).length ? {} : current));
  };

  const isButtonDisabled = !validateLogin(login) || !validatePassword(password);

  /**
   * Quem já está autenticado não deve ver o formulário de login.
   *
   * Isto era papel do `proxy.ts`, que rodava no servidor e mandava de volta
   * para a home antes de a tela existir. Com o site estático o proxy não
   * roda, e sem esta checagem quem tem sessão válida e digita `/login`
   * recebe o formulário — e, ao entrar, autentica de novo sem precisar.
   */
  useEffect(() => {
    if (isAuthenticated()) router.replace(redirectTo);
  }, [router, redirectTo]);

  /**
   * Se o access token expirou mas o refresh token (httpOnly, 14 dias) ainda é
   * válido, restaura a sessão sem pedir credenciais novamente.
   */
  useEffect(() => {
    let active = true;
    // Roda em background: o formulário fica utilizável imediatamente.
    tryRestoreSession()
      .then((restored) => {
        if (active && restored) router.replace(redirectTo);
      })
      .catch(() => {
        /* sem sessão para restaurar — segue no login */
      });
    return () => {
      active = false;
    };
  }, [router, redirectTo]);

  const handleLogin = async () => {
    if (isButtonDisabled || loading) return;
    setLoading(true);
    setFormErrors({});
    try {
      // O authService grava o cookie do access token (com validade) e persiste
      // o tenant da sessão para o header X-Tenant-Id das próximas requisições.
      // `login` aceita e-mail OU username.
      const envelope = await authLogin({ login: login.trim(), password });
      if (envelope?.data?.token) {
        // `replace` para o botão "voltar" não retornar à tela de login.
        router.replace(redirectTo);
        return;
      }
      notificationCenter.danger(fallbackMessages.AUTH.LOGIN_FAILED);
    } catch (err: unknown) {
      const error = err as AxiosError<ApiEnvelope<unknown>>;
      const status = error.response?.status;
      // A API manda o motivo real em `errors[].message` (ex.: "Credenciais
      // inválidas"); os textos abaixo só entram em cena se ela não mandar nada.
      const apiMessage = getApiErrorMessage(error.response?.data);

      if (status === 401) {
        // Erro atribuível aos campos — vai para `validationErrors` do `Form`,
        // não para o toast (padrão de erro de servidor da doc do HeroUI).
        const message = apiMessage ?? fallbackMessages.AUTH.INVALID_CREDENTIALS;
        setFormErrors({ login: message, password: message });
      } else if (status === 429) {
        // O backend freia depois de algumas senhas erradas — por IP, por login
        // e travando a conta. Mostrar "credenciais inválidas" aqui mandaria a
        // pessoa tentar mais uma vez, que é o que aprofunda o bloqueio. O
        // `Retry-After` diz quando volta; sem ele, texto genérico.
        //
        // A mensagem é a mesma para conta bloqueada e conta inexistente, de
        // propósito: diferenciar entregaria a lista de quem tem login aqui.
        const message = tooManyAttemptsMessage(
          error.response?.headers?.["retry-after"],
        );
        setFormErrors({ login: message, password: message });
      } else if (status === 403) {
        notificationCenter.danger(
          apiMessage ?? fallbackMessages.AUTH.ACCESS_DENIED,
        );
      } else if (status === 404 || status === 400) {
        // Tenant inexistente/!ativo cai aqui (header X-Tenant-Id inválido).
        notificationCenter.danger(
          apiMessage ??
            error.response?.data?.message ??
            fallbackMessages.AUTH.TENANT_NOT_FOUND,
        );
      } else {
        notificationCenter.danger(
          apiMessage ??
            error.response?.data?.message ??
            fallbackMessages.AUTH.SERVER_ERROR,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleLogin();
  };

  return (
    <main className="h-screen flex flex-col lg:flex-row bg-white">
      <div className="relative lg:w-1/2 bg-primary flex items-center justify-center p-4 lg:p-0">
        <div className="absolute top-0 left-0 h-60 p-3 bg-secondary"></div>
        <Image
          src={svgPaths.LOGOS.GOLD}
          alt="Logo"
          height={200}
          width={200}
          className="lg:h-96 lg:w-96"
        />
        <div className="absolute h-60 p-3 bg-secondary right-[-10]"></div>
        <div className="absolute w-60 p-3 bg-primary bottom-6 right-[-100]"></div>
        <div className="absolute w-96 p-3 bg-secondary bottom-0 right-[-200]"></div>
      </div>
      <div className="h-full w-full lg:w-1/2 bg-white flex flex-col justify-center items-center gap-10 p-4 lg:p-0">
        <div className="absolute bottom-0 right-0 h-60 p-3 bg-primary"></div>
        <Form
          onSubmit={handleSubmit}
          validationErrors={formErrors}
          className="w-full lg:w-1/2 flex flex-col gap-5 align-middle"
        >
          {isExpired && (
            <p role="status" className="w-full rounded-2xl bg-light-secondary px-4 py-3 text-sm text-primary">
              Sua sessão expirou. Entre de novo para continuar de onde parou.
            </p>
          )}
          <TextField
            className="w-full"
            name="login"
            type="text"
            value={login}
            onChange={(value) => {
              clearServerError();
              setLogin(value);
            }}
            validate={(value) =>
              validateLogin(value) ? null : "Informe seu usuário"
            }
          >
            <Label className="sr-only">Usuário</Label>
            <Input
              placeholder="Usuário"
              variant="secondary"
              className="w-full text-gray-100 p-3 form-border-style"
              autoComplete="username"
              autoFocus
            />
            <FieldError />
          </TextField>

          <TextField
            className="w-full"
            name="password"
            type={isVisible ? "text" : "password"}
            value={password}
            onChange={(value) => {
              clearServerError();
              setPassword(value);
            }}
            validate={(value) =>
              validatePassword(value) ? null : "Informe sua senha"
            }
          >
            <Label className="sr-only">Senha</Label>
            <InputGroup className={`form-border-style`}>
              <InputGroup.Input
                placeholder="Senha"
                className="w-full text-gray-100 p-3"
                autoComplete="current-password"
              />
              <InputGroup.Suffix>
                <Button
                  variant="ghost"
                  onClick={toggleVisibility}
                  aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
                >
                  {isVisible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
            <FieldError />
          </TextField>
          {/* `type="submit"` já dispara o `onSubmit` do form — um `onPress` aqui
              chamaria `handleLogin` duas vezes por clique. */}
          <Button
            type="submit"
            variant="primary"
            className="w-full cursor-pointer p-6"
            isDisabled={isButtonDisabled || loading}
          >
            {loading ? (
              <>
                <Spinner color="current" className="mr-2" />
                <span className="text-white">Entrando...</span>
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </Form>
        <div className="absolute w-60 p-3 bg-secondary top-0 right-0"></div>
        <div className="absolute w-60 p-3 bg-primary top-6 right-24"></div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
