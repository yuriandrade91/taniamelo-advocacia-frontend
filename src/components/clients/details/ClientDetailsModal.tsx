"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Button, Modal } from "@heroui/react";
import { ActionButton, ActionGroup } from "@/components/ui/actions/ActionGroup";
import { LoadingCircle, RowSkeleton } from "@/components/ui/feedback/Loading";
import { PencilIcon, TrashIcon } from "@/components/ui/icons/actions";
import { CheckIcon, ClockIcon, CloseIcon, WalletIcon } from "@/components/ui/icons/glyphs";
import { formatValue } from "@/components/ui/form/schema";
import { usePermissoes } from "@/hooks/usePermissoes";
import { useAutoresDoEscritorio } from "@/hooks/useAutoresDoEscritorio";
import { GenderLabelByKey, type GenderKey } from "@/enums/gender/Gender";
import { deleteClient } from "@/services/clientService";
import { deleteFile, uploadDocuments, uploadSimulations } from "@/services/clientFileService";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { InssPasswordField } from "../inss/InssPasswordField";
import {
  ClientDisabilityPanel,
  type ClientDisabilityPanelHandle,
} from "../disability/ClientDisabilityPanel";
import { DISABILITY_BENEFIT } from "../form/genderPrompt";
import {
  AddressIcon,
  DisabilityIcon,
  FilesIcon,
  InterviewIcon,
  PersonIcon,
  ServiceIcon,
  WorkIcon,
} from "../form/tabs/sectionIcons";
import { AddressSection } from "../form/sections/AddressSection";
import { InterviewSection } from "../form/sections/InterviewSection";
import { PersonalDataSection } from "../form/sections/PersonalDataSection";
import { ProfessionalDataSection } from "../form/sections/ProfessionalDataSection";
import { ServiceSection } from "../form/sections/ServiceSection";
import { SituationHistorySection } from "../form/sections/SituationHistorySection";
import { FilesSection } from "../form/sections/files/FilesSection";
import FileUploadModal from "../form/sections/files/FileUploadModal";
import {
  isDocumentReady,
  type FileKind,
  type StagedDocument,
  type StagedSimulation,
} from "../form/sections/files/types";
import { buildDocumentsFormData, buildSimulationsFormData } from "../form/documentsFormData";
import {
  addressSchema,
  interviewSchema,
  personalSchema,
  professionalSchema,
  serviceSchema,
} from "../form/schemas";
import DeleteClientModal from "../DeleteClientModal";
import {
  CompiladoHero,
  CompiladoSection,
  CompiladoTabs,
  HeroTipButton,
  useSectionAnchors,
  type HeroNavItem,
} from "./CompiladoHero";
import { sectionFill, sheetProgress } from "./clientSheet";
import { useClientSheet } from "./useClientSheet";

/** Os pagamentos só carregam (código e dados) quando a seção é aberta. */
const ClientFinancePanel = dynamic(
  () => import("../finance/ClientFinancePanel").then((m) => m.ClientFinancePanel),
  { ssr: false, loading: () => <LinesSkeleton count={3} /> },
);

/**
 * A ficha do cliente: leitura e edição no mesmo modal, no mesmo lugar.
 *
 * O painel da esquerda (`CompiladoHero`) guarda a identidade, o preenchimento
 * e as ações; a coluna da direita traz as seções do **cadastro** — as mesmas
 * peças, os mesmos schemas, as mesmas máscaras e validações —, uma embaixo da
 * outra, com o painel ancorando a leitura. "Editar" não troca de tela: os
 * campos saem de `isReadOnly` onde já estavam.
 *
 * Estado, validação e gravação ficam em `useClientSheet`. Esta tela não conhece
 * service nenhum além de excluir, enviar e apagar arquivo.
 */

/** Altura útil: o `Modal.Dialog` corta o que passa, então quem rola é a coluna. */
const SHEET_HEIGHT = "max-h-[calc(100dvh-7rem)] sm:max-h-[calc(100dvh-9.5rem)]";

type SheetSection = {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  /** À direita do nome: "6/7", "3 registros". */
  badge?: string;
  /** Tudo preenchido — o ✓ verde no painel, no lugar da contagem. */
  isComplete?: boolean;
  /**
   * Não se aplica ao caso. A seção sai da navegação e da pilha, mas continua
   * **montada** fora de vista: é o painel de deficiência que conta os períodos
   * gravados, e é a ref dele que o Salvar chama.
   */
  isHidden?: boolean;
  content: ReactNode;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientId?: number | string;
  /** Avisado depois de salvar ou excluir: a lista pode ter mudado. */
  onConfirm?: () => void;
  editOnOpen?: boolean;
};

export default function ClientDetailsModal({
  isOpen,
  onClose,
  clientName,
  clientId: rawId,
  onConfirm,
  editOnOpen = false,
}: Props) {
  const clientId = rawId === undefined ? undefined : String(rawId);
  const { podeDestruir, podeVerFinanceiro } = usePermissoes();
  const autores = useAutoresDoEscritorio();
  const sheet = useClientSheet(clientId, isOpen);
  const { service, personal, professional, address, interview } = sheet.forms;
  const record = sheet.record;

  /** `editOnOpen` vale para cada abertura: a ficha é remontada pela página a cada alvo. */
  const [isEditing, setIsEditing] = useState(editOnOpen);
  const [showDelete, setShowDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [uploadKind, setUploadKind] = useState<FileKind | null>(null);
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [stagedSimulations, setStagedSimulations] = useState<StagedSimulation[]>([]);
  const [disabilityCount, setDisabilityCount] = useState(0);
  /**
   * Pagamentos já foi visitada. Trava num `ref`, e não em estado: a visita é
   * descoberta durante a renderização (a rolagem acendeu a seção no painel), e
   * o que ela precisa é não voltar atrás — não um novo render.
   */
  const financeSeen = useRef(false);
  const disabilityRef = useRef<ClientDisabilityPanelHandle>(null);

  const sections = { service: service.values, personal: personal.values, professional: professional.values };
  const progress = sheetProgress(sections);
  const benefitLabel = formatValue(serviceSchema.benefit, service.values.benefit);
  const showDisability = service.values.benefit === DISABILITY_BENEFIT || disabilityCount > 0;
  const busy = sheet.isSaving || isBusy;

  // A ancoragem vem antes das seções porque é ela quem diz qual está em foco —
  // e é esse foco que acende os Pagamentos pela primeira vez. A chave só muda
  // quando a lista de seções muda: a carga termina ou a deficiência passa a
  // valer.
  const { scrollerRef, active, goTo } = useSectionAnchors(
    "atendimento",
    `${sheet.isLoading}|${showDisability}`,
  );
  if (active === "pagamentos") financeSeen.current = true;

  const close = () => {
    sheet.cancel();
    setIsEditing(false);
    onClose();
  };

  const save = async () => {
    const saved = await sheet.save({
      validateExtra: () => disabilityRef.current?.validate() ?? true,
      afterSave: async () => {
        await disabilityRef.current?.save();
      },
    });
    if (!saved) return;
    setIsEditing(false);
    onConfirm?.();
  };

  const cancelEdit = () => {
    sheet.cancel();
    setIsEditing(false);
  };

  const remove = async () => {
    if (!clientId) return;
    setIsBusy(true);
    try {
      await deleteClient(clientId);
      setShowDelete(false);
      onClose();
      onConfirm?.();
    } catch (reason) {
      sheet.setError((reason as Error)?.message || fallbackMessages.CLIENTS.DELETE_FAILED);
    } finally {
      setIsBusy(false);
    }
  };

  /** Arquivos sobem na hora: o cliente já existe, e esperar o Salvar só criaria a chance de fechar sem enviar. */
  const uploadStaged = async () => {
    if (!clientId) return;
    if (!stagedDocuments.every(isDocumentReady)) {
      sheet.setError("Escolha o tipo de cada documento antes de enviar.");
      return;
    }
    setIsBusy(true);
    try {
      if (stagedDocuments.length) {
        await uploadDocuments(clientId, buildDocumentsFormData(stagedDocuments));
        setStagedDocuments([]);
      }
      if (stagedSimulations.length) {
        await uploadSimulations(
          clientId,
          buildSimulationsFormData(
            stagedSimulations.map((item) => ({
              ...item,
              vinculos: item.vinculos ? Number(item.vinculos) : undefined,
            })),
          ),
        );
        setStagedSimulations([]);
      }
      await sheet.refreshFiles();
    } catch {
      sheet.setError(fallbackMessages.CLIENTS.UPDATE_FAILED);
    } finally {
      setIsBusy(false);
    }
  };

  const removeFile = async (_kind: FileKind, fileId: string) => {
    if (!clientId) return;
    try {
      await deleteFile(clientId, fileId);
      await sheet.refreshFiles();
    } catch {
      sheet.setError(fallbackMessages.CLIENTS.UPDATE_FAILED);
    }
  };

  const fill = (
    schema: Parameters<typeof sectionFill>[0],
    values: Parameters<typeof sectionFill>[1],
    skip?: readonly string[],
  ) => {
    const { filled, total } = sectionFill(schema, values, skip);
    return { badge: `${filled}/${total}`, isComplete: filled === total };
  };

  const fileCount = (record?.documents.length ?? 0) + (record?.simulations.length ?? 0);
  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;

  const sheetSections: SheetSection[] = [
    {
      id: "atendimento",
      title: "Atendimento",
      description: "Benefício pretendido e situação do caso.",
      icon: <ServiceIcon />,
      ...fill(serviceSchema, service.values),
      content: <ServiceSection form={service} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    {
      id: "dados-pessoais",
      title: "Dados pessoais",
      description: "Quem é o cliente e como falar com ele.",
      icon: <PersonIcon />,
      ...fill(personalSchema, personal.values),
      content: <PersonalDataSection form={personal} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    {
      id: "dados-profissionais",
      title: "Dados profissionais",
      description: "Vida contributiva e o acesso ao Meu INSS.",
      icon: <WorkIcon />,
      // A senha fica de fora da conta: ela nunca volta do servidor (rota
      // auditada), então contá-la deixaria a seção eternamente incompleta.
      ...fill(professionalSchema, professional.values, ["inssPassword"]),
      content: (
        <ProfessionalDataSection
          form={professional}
          isReadOnly={!isEditing}
          isLoading={sheet.isLoading}
          inssPassword={
            <InssPasswordField
              clientId={clientId ?? ""}
              isEditing={isEditing}
              novaSenha={professional.values.inssPassword}
              onNovaSenhaChange={(value) => professional.setField("inssPassword", value)}
            />
          }
        />
      ),
    },
    {
      id: "deficiencia",
      title: "Deficiência",
      description: "Grau e tempo em cada grau — mudam o tempo exigido na aposentadoria da pessoa com deficiência.",
      icon: <DisabilityIcon />,
      isHidden: !showDisability,
      badge: disabilityCount > 0 ? plural(disabilityCount, "período", "períodos") : undefined,
      content: clientId ? (
        <ClientDisabilityPanel
          ref={isEditing ? disabilityRef : undefined}
          clientId={clientId}
          gender={GenderLabelByKey[personal.values.gender as GenderKey] ?? personal.values.gender}
          isEditing={isEditing}
          canDeleteSaved={podeDestruir}
          onSavedCountChange={setDisabilityCount}
        />
      ) : null,
    },
    {
      id: "endereco",
      title: "Endereço",
      description: "O endereço principal do cliente.",
      icon: <AddressIcon />,
      ...fill(addressSchema, address.values, ["cepLookup"]),
      content: <AddressSection form={address} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    {
      id: "entrevista",
      title: "Entrevista",
      description: "O relato do atendimento: histórico, pendências e documentos a trazer.",
      icon: <InterviewIcon />,
      ...(record && record.interviewCount > 1
        ? { badge: `${record.interviewCount} registros` }
        : fill(interviewSchema, interview.values)),
      content: <InterviewSection form={interview} isReadOnly={!isEditing} isLoading={sheet.isLoading} />,
    },
    {
      id: "arquivos",
      title: "Arquivos",
      description: "Documentos e simulações do caso.",
      icon: <FilesIcon />,
      badge: fileCount ? plural(fileCount, "arquivo", "arquivos") : "Sem arquivos",
      content: sheet.isLoading ? (
        <LinesSkeleton count={2} />
      ) : (
        <div className="flex flex-col gap-3">
          <FilesSection
            documents={record?.documents ?? []}
            simulations={record?.simulations ?? []}
            stagedDocuments={stagedDocuments}
            stagedSimulations={stagedSimulations}
            onAddFiles={setUploadKind}
            onRemoveStagedDocument={(index) => setStagedDocuments((items) => items.filter((_, i) => i !== index))}
            onRemoveStagedSimulation={(index) => setStagedSimulations((items) => items.filter((_, i) => i !== index))}
            onDelete={isEditing ? removeFile : undefined}
          />
          {(stagedDocuments.length > 0 || stagedSimulations.length > 0) && (
            <div className="flex justify-end">
              <Button type="button" variant="primary" onPress={() => void uploadStaged()} isDisabled={busy}>
                Enviar arquivos
              </Button>
            </div>
          )}
        </div>
      ),
    },
    // Dinheiro é de quem vê o financeiro (D3): para os demais a seção nem existe.
    ...(podeVerFinanceiro && clientId
      ? [
          {
            id: "pagamentos",
            title: "Pagamentos",
            description: "Benefício que o INSS paga ao cliente e honorários do escritório.",
            icon: <WalletIcon className="h-5 w-5" />,
            badge: "Só leitura",
            content: financeSeen.current ? <ClientFinancePanel clientId={clientId} /> : <LinesSkeleton count={3} />,
          } satisfies SheetSection,
        ]
      : []),
    {
      id: "andamento",
      title: "Andamento do benefício",
      description: "Da mudança de situação mais recente para a mais antiga.",
      icon: <ClockIcon className="h-5 w-5" />,
      badge: record?.history.length ? plural(record.history.length, "mudança", "mudanças") : undefined,
      content: sheet.isLoading ? (
        <LinesSkeleton count={4} />
      ) : (
        <SituationHistorySection
          items={record?.history ?? []}
          hasError={record?.historyFailed ?? false}
          autores={autores}
        />
      ),
    },
  ];

  const visible = sheetSections.filter((section) => !section.isHidden);
  const hidden = sheetSections.filter((section) => section.isHidden);
  const items: HeroNavItem[] = visible.map((section) => ({
    id: section.id,
    label: section.title,
    icon: section.icon,
    badge: section.badge,
    isComplete: section.isComplete,
  }));

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && close()}>
      <Modal.Backdrop
        variant="blur"
        className="data-[entering]:duration-400 data-[entering]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[exiting]:duration-200 data-[exiting]:ease-[cubic-bezier(0.7,0,0.84,0)]"
      >
        <Modal.Container
          size="cover"
          className="data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[entering]:duration-400 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95 data-[exiting]:duration-200"
        >
          <Modal.Dialog className="min-h-[80vh] max-w-[1440px] bg-[#F4F4F5]">
            {/* `data-readonly`: em leitura, o campo travado continua legível
                (`ui/form/formFields.css`). */}
            <div
              data-readonly={isEditing ? undefined : ""}
              className={`flex ${SHEET_HEIGHT} flex-col gap-4 py-4 md:flex-row`}
            >
              <CompiladoHero
                name={personal.values.fullName || clientName}
                benefit={benefitLabel}
                progress={progress}
                isLoading={sheet.isLoading}
                items={items}
                activeId={active}
                onSelect={goTo}
                error={
                  sheet.error ? (
                    <p role="alert" className="rounded-xl bg-danger/25 px-4 py-3 text-sm text-white">
                      {sheet.error}
                    </p>
                  ) : null
                }
                actions={<SheetActions
                  isEditing={isEditing}
                  isSaving={busy}
                  isLoading={sheet.isLoading}
                  canDelete={podeDestruir}
                  onEdit={() => setIsEditing(true)}
                  onDelete={() => setShowDelete(true)}
                  onCancel={cancelEdit}
                  onSave={() => void save()}
                  onClose={close}
                />}
              />

              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <CompiladoTabs items={items} activeId={active} onSelect={goTo} />

                {/*
                  Quem rola não é quem empilha. Com o `overflow-y-auto` no
                  próprio `flex-col`, cada cartão vira item flex de um
                  contêiner de altura fixa — e item flex encolhe: os cartões
                  achatavam até sobrar só a faixa do cabeçalho.
                */}
                <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-4 pb-6">
                    {visible.map((section) => (
                      <CompiladoSection
                        key={section.id}
                        id={section.id}
                        label={section.title}
                        blurb={section.description}
                        icon={section.icon}
                        badge={section.badge}
                      >
                        {section.content}
                      </CompiladoSection>
                    ))}
                  </div>
                </div>
              </div>

              {/* Montadas e fora de vista — ver `isHidden`. */}
              {hidden.map((section) => (
                <div key={section.id} hidden>
                  {section.content}
                </div>
              ))}
            </div>

            <FileUploadModal
              isOpen={uploadKind !== null}
              initialKind={uploadKind ?? "documents"}
              onClose={() => setUploadKind(null)}
              onConfirm={({ documents, simulations }) => {
                setStagedDocuments((items) => [...items, ...documents]);
                setStagedSimulations((items) => [...items, ...simulations]);
              }}
            />
            <DeleteClientModal
              isOpen={showDelete}
              onClose={() => setShowDelete(false)}
              clientName={clientName}
              onConfirm={() => void remove()}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/** Linhas de dado carregando (arquivos, histórico, pagamentos). */
function LinesSkeleton({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <RowSkeleton />
        </li>
      ))}
    </ul>
  );
}

/**
 * As ações no pé do painel: Editar, Excluir e Fechar na leitura; Cancelar e
 * Salvar na edição. Excluir e Fechar são só ícone, com dica — o nome delas não
 * disputa espaço com a ação principal, que é a larga.
 */
function SheetActions({
  isEditing,
  isSaving,
  isLoading,
  canDelete,
  onEdit,
  onDelete,
  onCancel,
  onSave,
  onClose,
}: {
  isEditing: boolean;
  isSaving: boolean;
  /** Sem os dados ainda, não há o que salvar. */
  isLoading: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <ActionGroup shape="pill" surface="dark">
      {isEditing ? (
        <>
          <ActionButton tone="onDark" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </ActionButton>
          <ActionButton
            tone="onDark"
            grow
            className="font-semibold"
            onClick={onSave}
            disabled={isSaving || isLoading}
            aria-busy={isSaving || undefined}
            icon={isSaving ? <LoadingCircle size={16} /> : <CheckIcon className="h-4 w-4" />}
          >
            {isSaving ? "Salvando…" : "Salvar"}
          </ActionButton>
        </>
      ) : (
        <ActionButton
          tone="onDark"
          grow
          className="font-semibold"
          onClick={onEdit}
          icon={<PencilIcon className="h-4 w-4" />}
        >
          Editar cadastro
        </ActionButton>
      )}
      {/* Excluir é de advogado/admin: o backend recusa os demais com 403. */}
      {canDelete && (
        <HeroTipButton label="Excluir cliente" onPress={onDelete} isDisabled={isSaving}>
          <TrashIcon className="h-4 w-4" />
        </HeroTipButton>
      )}
      <HeroTipButton label="Fechar ficha" onPress={onClose} isDisabled={isSaving}>
        <CloseIcon className="h-5 w-5" />
      </HeroTipButton>
    </ActionGroup>
  );
}
