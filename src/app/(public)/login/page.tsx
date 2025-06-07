"use client";
import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
// import { ClosedEye, OpenedEye } from "./assets/icons/icons";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [usernameVisited, setUsernameVisited] = useState(false);
  const [passwordVisited, setPasswordVisited] = useState(false);

  const validateUsername = (value: string) => value !== "";
  const validatePassword = (value: string) => value.length >= 8;

  const isUsernameInvalid = useMemo(() => {
    if (!usernameVisited) return false;
    return !validateUsername(username);
  }, [username, usernameVisited]);

  const isPasswordInvalid = useMemo(() => {
    if (!passwordVisited) return false;
    return !validatePassword(password);
  }, [password, passwordVisited]);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const isButtonDisabled =
    !validateUsername(username) || !validatePassword(password);

  return (
    <main className="h-screen flex flex-col lg:flex-row">
      <div className="relative lg:w-1/2 bg-primary flex items-center justify-center p-4 lg:p-0">
        <div className="absolute top-0 left-0 h-60 p-3 bg-secondary"></div>
        <Image
          src="../svg/logo-gold.svg"
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
        <div className="w-full lg:w-1/2 flex flex-col gap-5 align-middle">
          <Input
            className="w-full"
            isClearable
            type="text"
            variant="faded"
            label="Usuário"
            size="lg"
            radius="sm"
            color={isUsernameInvalid ? "danger" : "primary"}
            value={username}
            isInvalid={isUsernameInvalid}
            errorMessage="Por favor, insira um nome de usuário"
            onValueChange={setUsername}
            onBlur={() => setUsernameVisited(true)}
          />
          <Input
            className="w-full"
            type={isVisible ? "text" : "password"}
            variant="faded"
            label="Senha"
            size="lg"
            radius="sm"
            color={isPasswordInvalid ? "danger" : "primary"}
            value={password}
            isInvalid={isPasswordInvalid}
            errorMessage="A senha deve ter no mínimo 8 caracteres"
            onValueChange={setPassword}
            onBlur={() => setPasswordVisited(true)}
            endContent={
              <button
                className="focus:outline-none"
                type="button"
                onClick={toggleVisibility}
              >
                {/* {isVisible ? <ClosedEye size={20} /> : <OpenedEye size={20} />} */}
              </button>
            }
          />
          <Button
            size="lg"
            color="primary"
            radius="sm"
            className="w-full cursor-pointer"
            isDisabled={isButtonDisabled}
          >
            Entrar
          </Button>
        </div>
        <div className="absolute w-60 p-3 bg-secondary top-0 right-0"></div>
        <div className="absolute w-60 p-3 bg-primary top-6 right-24"></div>
      </div>
    </main>
  );
}
