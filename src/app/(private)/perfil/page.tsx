"use client";

import { useCallback, useEffect, useState } from "react";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { Button, Skeleton } from "@heroui/react";

import { Card, SectionTitle } from "@/components/ui/layout/Card";
import { Field, PasswordField } from "@/components/ui/form/Field";
import { getRoleLabel } from "@/enums/role/Role";
import { PageHeader } from "@/components/ui/layout/PageHeader";
import { notificationCenter } from "@/services/notificationService";
import { patchSessionUser } from "@/lib/sessionUser";
import {
  changeMyPassword,
  updateMyProfile,
  myProfile,
} from "@/services/userService";
import {
  EMPTY_PASSWORD_VALUES,
  fieldError,
  firstMessage,
  profileChanged,
  profileValuesFrom,
  toPasswordRequest,
  toProfileRequest,
  validatePassword,
  validateProfile,
  type PasswordErrors,
  type PasswordValues,
  type ProfileErrors,
  type ProfileValues,
} from "@/components/profile/profileForm";
import type { MyProfile } from "@/interfaces/user/User.interface";

/**
 * Meus dados.
 *
 * Existe porque o item "Meus dados" do menu era um botão que fechava o menu e
 * mais nada, enquanto `GET/PUT /users/me` e `PATCH /users/me/password` já
 * respondiam. O nome que aparece no menu vinha do login e não tinha como ser
 * corrigido sem alguém mexer no banco.
 *
 * ## Duas ações, dois cartões, dois botões
 *
 * Trocar o nome e trocar a senha são decisões diferentes, com riscos
 * diferentes. Num formulário só, com um "Salvar" só, corrigir um e-mail
 * digitado errado passaria pelas três caixas de senha — e sair no meio
 * deixaria a dúvida sobre o que foi salvo.
 *
 * ## Sem guarda de papel
 *
 * A rota é aberta a qualquer papel de propósito: é a própria pessoa. Não há
 * como pedir o "me" de outra — o servidor lê o usuário do token, não da URL.
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [values, setValues] = useState<ProfileValues>(() =>
    profileValuesFrom(null),
  );
  /** Erros do validador (por campo, assim que mexido) e os que o servidor devolve (e-mail já usado). */
  const profileCheck = useFieldErrors(validateProfile(values));
  const [serverErrors, setServerErrors] = useState<ProfileErrors>({});
  const errorOf = (field: keyof ProfileValues) => serverErrors[field] ?? profileCheck.errorOf(field);
  const [isSaving, setIsSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordValues>(EMPTY_PASSWORD_VALUES);
  const passwordCheck = useFieldErrors(validatePassword(passwordForm));
  const [passwordServerErrors, setPasswordServerErrors] = useState<PasswordErrors>({});
  const passwordErrorOf = (field: keyof PasswordValues) => passwordServerErrors[field] ?? passwordCheck.errorOf(field);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await myProfile();
      setProfile(data ?? null);
      setValues(profileValuesFrom(data ?? null));
      setLoadFailed(false);
    } catch {
      // O axiosService já mostrou o erro.
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setField = (field: keyof ProfileValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    profileCheck.touch(field);
    setServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  const saveData = async () => {
    if (!profileCheck.revealAll()) return;

    setIsSaving(true);
    try {
      const { data } = await updateMyProfile(toProfileRequest(values));
      setProfile(data ?? null);
      setValues(profileValuesFrom(data ?? null));
      // Sem isto o menu segue com o nome antigo até a próxima sessão, e a tela
      // parece não ter salvado.
      if (data) {
        patchSessionUser({ fullName: data.fullName, email: data.email });
      }
    } catch (error) {
      // E-mail já usado por outra pessoa é erro de campo, não de tela.
      const ofField = fieldError(error, "email");
      if (ofField) setServerErrors({ email: ofField });
    } finally {
      setIsSaving(false);
    }
  };

  const setPasswordField = (field: keyof PasswordValues, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    passwordCheck.touch(field);
    setPasswordServerErrors((current) => ({ ...current, [field]: undefined }));
  };

  const changePassword = async () => {
    if (!passwordCheck.revealAll()) return;

    setIsChangingPassword(true);
    try {
      await changeMyPassword(toPasswordRequest(passwordForm));
      setPasswordForm(EMPTY_PASSWORD_VALUES);
      passwordCheck.reset();
    } catch (error) {
      const current = fieldError(error, "currentPassword");
      const newValue = fieldError(error, "newPassword");
      if (current || newValue) {
        setPasswordServerErrors({
          currentPassword: current ?? undefined,
          newPassword: newValue ?? undefined,
        });
      } else {
        notificationCenter.danger(
          firstMessage(error) ?? "Não foi possível alterar a senha.",
        );
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-16">
      <PageHeader
        title="Meus dados"
        description="Seu cadastro no escritório e a senha de acesso."
      />

      {loadFailed && (
        <div
          role="status"
          className="rounded-2xl border border-danger/40 bg-danger/5 px-5 py-4 text-sm text-primary"
        >
          <p className="font-medium">Não foi possível load seus dados</p>
          <p className="mt-1 text-gray-100">
            Os campos estão vazios por falta de resposta, não porque o cadastro
            está em branco — salvar agora gravaria vazio por cima.{" "}
            <button
              type="button"
              onClick={() => void load()}
              className="font-medium text-secondary underline underline-offset-2"
            >
              Tentar de novo
            </button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle as="h2">Cadastro</SectionTitle>

          {isLoading ? (
            <div className="mt-4 flex flex-col gap-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <Field
                label="Nome completo"
                value={values.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                isRequired
                isInvalid={Boolean(errorOf("fullName"))}
                errorMessage={errorOf("fullName")}
                isDisabled={loadFailed}
              />
              <Field
                label="E-mail"
                type="email"
                value={values.email}
                onChange={(e) => setField("email", e.target.value)}
                isRequired
                isInvalid={Boolean(errorOf("email"))}
                errorMessage={errorOf("email")}
                isDisabled={loadFailed}
              />

              {/* Somente leitura, e visíveis: o usuário é o login e o papel é
                  o que explica por que certos menus não aparecem. Escondê-los
                  só faria a pessoa procurar onde se muda. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Usuário"
                  value={profile?.username ?? ""}
                  onChange={() => {}}
                  isReadOnly
                  isDisabled
                />
                <Field
                  label="Perfil de acesso"
                  value={profile?.role ? getRoleLabel(profile.role) : ""}
                  onChange={() => {}}
                  isReadOnly
                  isDisabled
                />
              </div>
              <p className="text-xs text-gray-100/70">
                Usuário e perfil de acesso são definidos pela administração do
                escritório.
              </p>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onPress={() => void saveData()}
                  // Sem mudança não há o que salvar; um sucesso à toa ensina a
                  // clicar por reflexo para conferir se salvou.
                  isDisabled={
                    isSaving || loadFailed || !profileChanged(values, profile)
                  }
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle as="h2">Senha</SectionTitle>
          <p className="mt-1 text-sm text-gray-100">
            Pedimos a senha atual mesmo com você já logado: é o que separa quem
            está na sessão de quem sabe a senha.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <PasswordField
              label="Senha atual"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordField("currentPassword", e.target.value)}
              isRequired
              isInvalid={Boolean(passwordErrorOf("currentPassword"))}
              errorMessage={passwordErrorOf("currentPassword")}
            />
            <PasswordField
              label="Nova senha"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordField("newPassword", e.target.value)}
              isRequired
              isInvalid={Boolean(passwordErrorOf("newPassword"))}
              errorMessage={passwordErrorOf("newPassword")}
            />
            <PasswordField
              label="Repita a nova senha"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordField("confirmPassword", e.target.value)}
              isRequired
              isInvalid={Boolean(passwordErrorOf("confirmPassword"))}
              errorMessage={passwordErrorOf("confirmPassword")}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                onPress={() => void changePassword()}
                isDisabled={isChangingPassword}
              >
                {isChangingPassword ? "Alterando..." : "Alterar senha"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
