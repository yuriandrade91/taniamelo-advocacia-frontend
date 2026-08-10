"use client";
import React, { useState, useMemo, useEffect, Suspense } from "react";
import Image from "next/image";
import {
  Button,
  FieldError,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import {
  login as authLogin,
  tryRestoreSession,
} from "@/services/authService";
import { useRouter, useSearchParams } from "next/navigation";
import { privateRoutes } from "@/constants/paths/routes";
// import { ClosedEye, OpenedEye } from "./assets/icons/icons";

function LoginForm() {
  const [login, setlogin] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [loginVisited, setloginVisited] = useState(false);
  const [passwordVisited, setPasswordVisited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Destino após autenticar: `?next=` (definido pela guarda em `proxy.ts`) ou
   * a home. Só aceita caminhos internos, para evitar open redirect.
   */
  const redirectTo = useMemo(() => {
    const next = searchParams.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    return privateRoutes.home;
  }, [searchParams]);

  // O backend exige apenas que os campos não sejam vazios (@NotBlank).
  const validatelogin = (value: string) => value.trim() !== "";
  const validatePassword = (value: string) => value !== "";

  const isloginInvalid = useMemo(() => {
    if (!loginVisited) return false;
    return !validatelogin(login);
  }, [login, loginVisited]);

  const isPasswordInvalid = useMemo(() => {
    if (!passwordVisited) return false;
    return !validatePassword(password);
  }, [password, passwordVisited]);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const isButtonDisabled = !validatelogin(login) || !validatePassword(password);

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
    setAuthError("");
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
      setAuthError("Não foi possível entrar. Tente novamente.");
    } catch (err: unknown) {
      const e = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = e?.response?.status;
      if (status === 401) {
        setAuthError("Usuário ou senha inválidos.");
      } else if (status === 403) {
        setAuthError("Acesso não permitido para este usuário.");
      } else if (status === 404 || status === 400) {
        // Tenant inexistente/!ativo cai aqui (header X-Tenant-Id inválido).
        setAuthError(
          e?.response?.data?.message ??
            "Não foi possível identificar o escritório. Verifique a configuração.",
        );
      } else {
        setAuthError(
          e?.response?.data?.message ??
            "Erro ao conectar-se ao servidor. Tente novamente.",
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
    <main className="h-screen flex flex-col lg:flex-row">
      <div className="relative lg:w-1/2 bg-primary flex items-center justify-center p-4 lg:p-0">
        <div className="absolute top-0 left-0 h-60 p-3 bg-secondary"></div>
        <Image
          src="../svg/gold-logo.svg"
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
        <form
          onSubmit={handleSubmit}
          className="w-full lg:w-1/2 flex flex-col gap-5 align-middle"
        >
          {/* v3: `Input` é primitivo; label/erro vêm do compound TextField.
              `size`/`radius`/`color` saíram — usa-se Tailwind. */}
          <TextField
            className="w-full"
            name="login"
            type="text"
            isInvalid={isloginInvalid}
          >
            <Label className="text-primary">Usuário ou e-mail</Label>
            <Input
              className="w-full text-primary"
              autoComplete="username"
              autoFocus
              value={login}
              onChange={(e) => {
                setlogin(e.target.value);
                if (authError) setAuthError("");
              }}
              onBlur={() => setloginVisited(true)}
            />
            {isloginInvalid && (
              <FieldError>Informe seu usuário ou e-mail</FieldError>
            )}
          </TextField>

          <TextField
            className="w-full"
            name="password"
            type={isVisible ? "text" : "password"}
            isInvalid={isPasswordInvalid}
          >
            <Label className="text-primary">Senha</Label>
            <InputGroup>
              <InputGroup.Input
                className="w-full text-primary"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError("");
                }}
                onBlur={() => setPasswordVisited(true)}
              />
              <InputGroup.Suffix>
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={toggleVisibility}
                  aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
                >
                  {/* {isVisible ? <ClosedEye size={20} /> : <OpenedEye size={20} />} */}
                </button>
              </InputGroup.Suffix>
            </InputGroup>
            {isPasswordInvalid && <FieldError>Informe sua senha</FieldError>}
          </TextField>
          {authError && (
            <div
              role="alert"
              aria-live="polite"
              className="w-full rounded-sm bg-danger/10 border border-danger px-4 py-3 text-sm text-danger"
            >
              {authError}
            </div>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full cursor-pointer"
            isDisabled={isButtonDisabled || loading}
            onPress={handleLogin}
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
        </form>
        <div className="absolute w-60 p-3 bg-secondary top-0 right-0"></div>
        <div className="absolute w-60 p-3 bg-primary top-6 right-24"></div>
      </div>
    </main>
  );
}

/**
 * `useSearchParams` (usado para o `?next=`) exige um boundary de Suspense em
 * componentes client — sem ele o build do Next falha na pré-renderização.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
