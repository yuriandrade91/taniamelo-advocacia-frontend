"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/ui/layout/PageHeader";
import { ProgressRing } from "@/components/clients/form/ProgressRing";
import { ClientFormTabs } from "@/components/clients/form/tabs/ClientFormTabs";
import {
  FillModeDisclosure,
  FillModeView,
  useFillModeChoice,
} from "@/components/clients/form/modes/FillModes";
import { ReviewPanel } from "@/components/clients/form/tabs/ReviewPanel";
import { FormActionBar } from "@/components/clients/form/tabs/FormActionBar";
import { ActionButton, ChipButton } from "@/components/ui/actions/ActionGroup";
import { TrashIcon } from "@/components/ui/icons/actions";
import {
  AddressIcon,
  DisabilityIcon,
  FilesIcon,
  InterviewIcon,
  PersonIcon,
  ServiceIcon,
  WorkIcon,
} from "@/components/clients/form/tabs/sectionIcons";
import type {
  ClientFormSection,
  SectionFocus,
} from "@/components/clients/form/tabs/types";
import {
  buildClientReview,
  missingFields,
  totalMissing,
  type ReviewSectionKey,
} from "@/components/clients/form/review";
import {
  DISABILITY_BENEFIT,
  shouldAskGender,
} from "@/components/clients/form/genderPrompt";
import { DisabilitySection } from "@/components/clients/form/sections/DisabilitySection";
import {
  hasAnyDisabilityInput,
  hasDisabilityInput,
  newDisabilityPeriod,
  toDisabilityPeriodRequest,
  validateDisabilityPeriods,
  type DisabilityPeriodDraft,
} from "@/components/clients/form/disabilityPeriods";
import {
  createDisabilityPeriod,
  deleteDisabilityPeriod,
  updateDisabilityPeriod as updateDisabilityPeriodRequest,
} from "@/services/clientDisabilityPeriodService";
import {
  REQUIRED_CREATE_KEYS,
  computeProgress,
} from "@/components/clients/form/progress";
import {
  AddressesSection,
  type AddressSlot,
} from "@/components/clients/form/sections/AddressesSection";
import { FilesUpload } from "@/components/clients/form/sections/files/upload/FilesUpload";
import {
  isDocumentComplete,
  isSimulationComplete,
  type StagedDocument,
  type StagedSimulation,
} from "@/components/clients/form/sections/files/types";
import { InterviewSection } from "@/components/clients/form/sections/InterviewSection";
import { PersonalDataSection } from "@/components/clients/form/sections/PersonalDataSection";
import { ProfessionalDataSection } from "@/components/clients/form/sections/ProfessionalDataSection";
import { ServiceSection } from "@/components/clients/form/sections/ServiceSection";
import {
  addressInitial,
  addressSchema,
  hasAddressInput,
  hasInterviewInput,
  interviewSchema,
  personalSchema,
  professionalSchema,
  serviceInitial,
  personalInitial,
  professionalInitial,
  serviceSchema,
  type AddressValues,
} from "@/components/clients/form/schemas";

import {
  buildDocumentsFormData,
  buildSimulationsFormData,
} from "@/components/clients/form/documentsFormData";
import {
  toAddressRequest,
  toCreateRequest,
  toInterviewRequest,
  toPatchRequest,
  toPersonalDataRequest,
  toProfessionalDataRequest,
} from "@/components/clients/form/payloads";
import {
  findPrimaryIndex,
  indexAfterRemoval,
  isValidPrimarySelection,
  nextSelectedIndex,
  casarIdsDeEndereco,
  removeSlotAt,
  withPrimaryAt,
} from "@/components/clients/form/primaryAddress";
import PrimaryAddressPicker from "@/components/clients/form/PrimaryAddressPicker";
import ConfirmDialog from "@/components/ui/modals/ConfirmDialog/ConfirmDialog";
import { useSectionForm } from "@/hooks/useSectionForm";
import { clearClientsCache } from "@/lib/clientsCache";
import {
  createAddress,
  createAddresses,
  deleteAddress,
  updateAddress,
} from "@/services/clientAddressService";
import {
  updatePersonalData,
  updateProfessionalData,
} from "@/services/clientDataService";
import {
  uploadDocuments,
  uploadSimulations,
} from "@/services/clientFileService";
import {
  createInterview,
  updateInterview,
} from "@/services/clientInterviewService";
import { usePermissoes } from "@/hooks/usePermissoes";
import { sectionHasInput } from "@/components/clients/form/unsaved";
import { createClient, patchClient } from "@/services/clientService";
import { notificationCenter } from "@/services/notificationService";

/** Modal: fora do pacote da página, como as outras (ver CLAUDE.md). */
const GenderPromptModal = dynamic(
  () =>
    import("@/components/clients/form/GenderPromptModal").then(
      (m) => m.GenderPromptModal,
    ),
  { ssr: false },
);

/**
 * Cadastro de cliente — página, não modal.
 *
 * ## Por que duas fases
 *
 * Só "Atendimento", "Dados pessoais" e "Dados profissionais" cabem no
 * `POST /clients`. Endereço, entrevista e documentos são **sub-recursos**
 * (`/clients/{id}/...`) e, por definição, precisam de um cliente que já exista
 * — o próprio `ClientCreateRequestDTO` documenta que endereço não entra no
 * payload.
 *
 * Então o fluxo é: preencher as três primeiras seções → "Salvar cliente" →
 * com o id em mãos, as três últimas destravam e cada uma grava por conta
 * própria. Nenhuma escrita parcial fica pendurada: ou o cliente existe, ou
 * nada foi enviado.
 *
 * ## Por que o estado mora aqui
 *
 * As seções são componentes de apresentação: recebem o formulário e desenham.
 * Quem conhece service, id e ordem de gravação é esta página. É o contrário do
 * que o `REVISAO_ARQUITETURA_2026` aponta em `AppointmentFormFields`, que abre
 * conexão HTTP de dentro de um componente de campo.
 */

/** A aba de revisão — fora de `SECTION_KEYS` porque não é seção do formulário. */
const REVIEW_KEY = "revisao";

const SECTION_KEYS = {
  service: "atendimento",
  personal: "dados-pessoais",
  address: "endereco",
  professional: "dados-profissionais",
  disability: "deficiencia",
  interview: "entrevista",
  documents: "documentos",
} as const;

/** Endereços além do primeiro nascem sem ser o principal. */
const SECONDARY_ADDRESS: AddressValues = { ...addressInitial, isPrimary: false };

export default function NewClientPage() {
  const router = useRouter();

  const service = useSectionForm({ schema: serviceSchema });
  const personal = useSectionForm({ schema: personalSchema });
  const professional = useSectionForm({ schema: professionalSchema });
  /**
   * Três `useSectionForm` fixos, não um array dinâmico — hooks não podem
   * nascer dentro de um loop, e o limite de 3 abas (o atual + até 2 extras)
   * já é regra de negócio fixa, então não perde generalidade.
   */
  const address1 = useSectionForm({ schema: addressSchema });
  const address2 = useSectionForm({ schema: addressSchema, initial: SECONDARY_ADDRESS });
  const address3 = useSectionForm({ schema: addressSchema, initial: SECONDARY_ADDRESS });
  const addressForms = [address1, address2, address3] as const;

  /** Quantas abas de endereço estão visíveis — de 1 (só o atual) a 3. */
  const [addressCount, setAddressCount] = useState(1);
  const [selectedAddressKey, setSelectedAddressKey] = useState("address-0");
  /** `id` do backend por posição; `null` até o primeiro salvamento daquela aba. */
  const [addressIds, setAddressIds] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  /**
   * Abas visíveis. Derivado de `addressCount`, não estado próprio — duas
   * fontes para a mesma verdade é como uma aba aparece sem formulário atrás.
   */
  const addressSlots: AddressSlot[] = addressForms
    .slice(0, addressCount)
    .map((form, index) => ({
      key: `address-${index}`,
      label: index === 0 ? "Endereço atual" : `Endereço ${index + 1}`,
      form,
    }));

  /**
   * Aba que pediu para virar a principal, aguardando confirmação.
   * `null` quando não há troca pendente.
   */
  const [primaryRequest, setPrimaryRequest] = useState<number | null>(null);
  /**
   * Aba cuja exclusão espera a escolha do próximo principal.
   * `null` quando não há exclusão pendente.
   */
  const [removeRequest, setRemoveRequest] = useState<number | null>(null);

  /** Índice da aba principal hoje, ou `-1` se nenhuma está marcada. */
  const currentPrimaryIndex = findPrimaryIndex(
    addressSlots.map((slot) => slot.form.values),
  );

  /**
   * Pedido de troca vindo de uma aba.
   *
   * Sem outro principal marcado, não há o que confirmar — promove direto.
   * Havendo, a troca é uma decisão sobre um endereço que o usuário já
   * escolheu antes, então ela é dita em voz alta antes de acontecer: era isso
   * que o backend fazia calado ao desmarcar o anterior a cada POST.
   */
  const handleRequestPrimary = (slot: AddressSlot) => {
    const index = Number(slot.key.replace("address-", ""));
    if (currentPrimaryIndex === -1 || currentPrimaryIndex === index) {
      promotePrimary(index);
      return;
    }
    setPrimaryRequest(index);
  };

  /**
   * Aplica a escolha: exatamente **um** principal no formulário inteiro.
   *
   * É aqui que a invariante é garantida — o que sai daqui para a API já vem
   * com um só principal, e a recusa com 400 no backend fica como rede de
   * segurança para chamadas fora desta tela, não como a defesa principal.
   */
  const promotePrimary = (index: number) => {
    const next = withPrimaryAt(
      addressForms.map((form) => form.values),
      index,
    );
    addressForms.forEach((form, i) => {
      form.setField("isPrimary", next[i].isPrimary);
    });
  };

  /**
   * Aplica a remoção de uma aba.
   *
   * `nextPrimary` vem na numeração **anterior** à remoção — é o que o diálogo
   * conhece. A reindexação acontece aqui, depois do `removeSlotAt`, porque
   * promover pelo índice antigo escolheria o endereço errado sem erro nenhum.
   */
  const applyRemoveAddress = async (index: number, nextPrimary?: number) => {
    const savedId = addressIds[index];

    // Aba já gravada precisa sair do servidor também; aba só aberta na tela
    // some sem nenhuma requisição.
    if (savedId && clientId) {
      try {
        await deleteAddress(clientId, savedId);
      } catch (error) {
        console.error("Erro ao excluir endereço:", error);
        return;
      }
    }

    const removed = removeSlotAt(
      addressForms.map((form) => form.values),
      addressIds,
      index,
      SECONDARY_ADDRESS,
    );

    const promoteAt =
      nextPrimary === undefined ? -1 : indexAfterRemoval(nextPrimary, index);

    const finalValues =
      promoteAt >= 0
        ? withPrimaryAt(removed.values, promoteAt)
        : removed.values;

    addressForms.forEach((form, i) => form.setValues(finalValues[i]));
    setAddressIds(removed.ids);

    const remaining = Math.max(1, addressCount - 1);
    setAddressCount(remaining);

    const selectedIndex = Number(selectedAddressKey.replace("address-", ""));
    setSelectedAddressKey(
      `address-${nextSelectedIndex(index, selectedIndex, remaining)}`,
    );

    notificationCenter.success("Endereço removido.");
  };

  /**
   * Pedido de exclusão vindo de uma aba.
   *
   * Excluir o principal e escolher o sucessor são a mesma decisão: sem
   * principal, o backend recusa e a listagem (ordenada por `isPrimary desc`)
   * não teria como ordenar. Por isso o diálogo, em vez de apagar e promover
   * alguém por conta própria.
   */
  const handleRemoveAddress = (index: number) => {
    const isPrimarySlot = addressForms[index]?.values.isPrimary;
    if (isPrimarySlot && addressCount > 1) {
      setRemoveRequest(index);
      return;
    }
    void applyRemoveAddress(index);
  };

  const handleAddAddress = () => {
    if (addressCount >= addressForms.length) return;
    const nextIndex = addressCount;
    setAddressCount(nextIndex + 1);
    // Já leva o foco para a aba nova: adicionar e continuar na antiga faria o
    // clique parecer sem efeito.
    setSelectedAddressKey(`address-${nextIndex}`);
  };

  /**
   * Intervalos de deficiência.
   *
   * Array de estado, e não um `useSectionForm` por item como nos endereços: a
   * lista não tem limite fixo, e hook não nasce dentro de loop. As regras vivem
   * em `disabilityPeriods.ts` como funções puras sobre o array.
   */
  const [disabilityPeriods, setDisabilityPeriods] = useState<
    DisabilityPeriodDraft[]
  >(() => [newDisabilityPeriod()]);
  const [disabilityRevealed, setDisabilityRevealed] = useState(false);

  /**
   * O "hoje" do cálculo, fixo por montagem da tela.
   *
   * Um só valor para a validação e para a conversão: lendo o relógio em cada
   * lugar, uma tela aberta à meia-noite poderia validar contra um dia e
   * converter contra outro.
   */
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const disabilityErrors = useMemo(
    () =>
      disabilityRevealed
        ? validateDisabilityPeriods(disabilityPeriods, today)
        : {},
    [disabilityPeriods, disabilityRevealed, today],
  );

  const updateDisabilityPeriod = (
    key: string,
    patch: Partial<DisabilityPeriodDraft>,
  ) =>
    setDisabilityPeriods((current) =>
      current.map((period) =>
        period.key === key ? { ...period, ...patch } : period,
      ),
    );

  const addDisabilityPeriod = () =>
    setDisabilityPeriods((current) => [...current, newDisabilityPeriod()]);

  /**
   * Tira o intervalo da tela.
   *
   * A última linha não é removida, é esvaziada: uma seção sem nenhum intervalo
   * não teria onde a pessoa clicar para começar de novo a não ser no botão de
   * adicionar, que some junto com o contexto.
   */
  const dropDisabilityPeriod = (key: string) =>
    setDisabilityPeriods((current) =>
      current.length === 1
        ? [newDisabilityPeriod()]
        : current.filter((period) => period.key !== key),
    );

  /**
   * Intervalo já gravado à espera de confirmação para sair do servidor.
   *
   * Rascunho some na hora; gravado pergunta antes, porque o `DELETE` não tem
   * desfazer e muda o tempo convertido do cliente — o número que vai para o
   * requerimento.
   */
  const [disabilityRemoval, setDisabilityRemoval] =
    useState<DisabilityPeriodDraft | null>(null);

  const removeDisabilityPeriod = (key: string) => {
    const period = disabilityPeriods.find((item) => item.key === key);
    if (!period) return;
    if (period.id && clientId) {
      setDisabilityRemoval(period);
      return;
    }
    dropDisabilityPeriod(key);
  };

  /**
   * Antes, a remoção só tirava da tela: o intervalo gravado continuava no
   * servidor e voltava na próxima abertura da ficha, somando na conversão.
   * Agora sai de lá primeiro; se o servidor recusar, fica na tela — o toast
   * do interceptor já diz por quê.
   */
  const confirmDisabilityRemoval = async () => {
    const period = disabilityRemoval;
    setDisabilityRemoval(null);
    if (!period?.id || !clientId) return;
    try {
      await deleteDisabilityPeriod(clientId, period.id);
      dropDisabilityPeriod(period.key);
    } catch (error) {
      console.error("Erro ao excluir período de deficiência:", error);
    }
  };

  const interview = useSectionForm({ schema: interviewSchema });

  /**
   * `null` enquanto o cliente não existe. Depois de preenchido, cada seção
   * passa a salvar sozinha; antes disso, o salvamento é um só.
   */
  const [clientId, setClientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /**
   * `id` da entrevista depois de gravada. Sem ele, cada "Salvar entrevista"
   * da fase 2 era um `POST` novo — a ficha ganhava uma cópia da mesma
   * entrevista a cada clique.
   */
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const { podeDestruir } = usePermissoes();
  /**
   * Arquivos escolhidos. Moram aqui, e não dentro da seção, porque quem decide
   * se o upload é disparado é o orquestrador — e ele precisa enxergar a lista.
   */
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [stagedSimulations, setStagedSimulations] = useState<
    StagedSimulation[]
  >([]);
  /** Os campos que faltam nos arquivos aparecem depois de tentar avançar ou salvar. */
  const [filesRevealed, setFilesRevealed] = useState(false);
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());
  /**
   * Qual aba mostrar. A página pede (erro de validação, "Revisar") e as abas
   * trocam para a primeira chave.
   */
  const [focus, setFocus] = useState<SectionFocus>({
    keys: [SECTION_KEYS.service],
    seq: 0,
  });
  const focusSection = (...keys: string[]) =>
    setFocus((current) => ({ keys, seq: current.seq + 1 }));
  /** Pergunta de sexo ao escolher o benefício por deficiência. */
  const [isAskingGender, setIsAskingGender] = useState(false);
  /** Modo de preenchimento — experimental e recolhido, ver `modes/FillModes.tsx`. */
  const [fillMode, setFillMode] = useFillModeChoice();
  // A aba visível — na Revisão o rodapé deixa de repetir as pendências.
  const [activeTab, setActiveTab] = useState<string>();
  const isReviewing = fillMode === "abas" && activeTab === REVIEW_KEY;
  /** Trocar o benefício para PCD pergunta o sexo — vale em qualquer modo. */
  const handleBenefitChange = (next: string, previous: string) => {
    if (shouldAskGender(previous, next)) setIsAskingGender(true);
    // Aposentadoria por deficiência pressupõe a deficiência: a chave de Dados
    // pessoais já vem ligada. Trocar de benefício depois não a desliga — a
    // pessoa continua com deficiência, só pede outra coisa.
    if (next === DISABILITY_BENEFIT) personal.setField("hasDisability", true);
  };

  const isCreated = clientId !== null;
  /** Diálogo de "descartar o cadastro?" do botão Cancelar. */
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  /** Ver o comentário na seção, na lista de abas abaixo. */
  const mostrarDeficiencia =
    service.values.benefit === DISABILITY_BENEFIT ||
    personal.values.hasDisability === true;

  const progress = useMemo(
    () =>
      computeProgress(
        { ...service.values, ...personal.values, ...professional.values },
        REQUIRED_CREATE_KEYS,
      ),
    [service.values, personal.values, professional.values],
  );

  const canCreate =
    service.isValid && personal.isValid && professional.isValid && !isCreating;

  /** Marca uma seção como gravada — alimenta o selo da aba. */
  const markSaved = (key: string) =>
    setSavedSections((current) => new Set(current).add(key));

  /**
   * Salvamento único da criação.
   *
   * As seis seções ficam abertas desde o começo. O que decide o que vai para a
   * API é o **preenchimento**, não um destravamento: só as seções com conteúdo
   * viram requisição.
   *
   * A ordem não é escolha de estilo — `POST /clients` precisa vir primeiro
   * porque é ele que produz o id que as três rotas de sub-recurso carregam no
   * caminho. Daí em diante é sequência simples.
   *
   * O que essa separação por endpoint resolve é **edição** (trocar um endereço
   * sem mandar um `PUT` do cliente inteiro por cima do que outra pessoa mexeu).
   * Na criação não há concorrência nem estado anterior — tratá-la como se
   * houvesse era transformar restrição de URL em regra de negócio.
   */
  const handleSaveAll = async () => {
    // Guarda contra duplicata: com o cliente já criado, este botão não existe
    // mais, mas um duplo clique na fração de segundo entre o POST e o
    // `setClientId` criaria um segundo cliente.
    if (clientId || isCreating) return;

    // Sempre obrigatórias (compõem o POST /clients).
    const requiredChecks = [
      [SECTION_KEYS.service, service.revealErrors()],
      [SECTION_KEYS.personal, personal.revealErrors()],
      [SECTION_KEYS.professional, professional.revealErrors()],
    ] as const;
    const requiredOk = requiredChecks.every(([, ok]) => ok);

    // Opcionais: só são validadas se o usuário mexeu nelas. Uma seção em
    // branco não pode reprovar um cadastro que está completo.
    // Cada aba de endereço é um POST independente; só as preenchidas contam.
    const filledAddresses = addressSlots.filter((slot) =>
      hasAddressInput(slot.form.values),
    );
    const interviewTouched = hasInterviewInput(interview.values);
    const disabilityTouched = hasAnyDisabilityInput(disabilityPeriods);

    let disabilityOk = true;
    if (disabilityTouched) {
      setDisabilityRevealed(true);
      disabilityOk =
        Object.keys(validateDisabilityPeriods(disabilityPeriods, today))
          .length === 0;
    }

    const optionalOk =
      filledAddresses.every((slot) => slot.form.revealErrors()) &&
      (!interviewTouched || interview.revealErrors()) &&
      disabilityOk;

    if (!requiredOk || !optionalOk) {
      notificationCenter.warning("Revise os campos destacados.", {
        description: "Há campos obrigatórios pendentes.",
      });
      // Com abas ou etapas a seção com erro pode nem estar na tela.
      const firstInvalid = requiredChecks.find(([, ok]) => !ok)?.[0];
      if (firstInvalid) focusSection(firstInvalid);
      else if (!disabilityOk) focusSection(SECTION_KEYS.disability);
      return;
    }


    // Rede de segurança do nosso lado: a interface já impede dois principais,
    // então cair aqui significa bug de estado — melhor descobrir antes do 400.
    if (
      !isValidPrimarySelection(filledAddresses.map((slot) => slot.form.values))
    ) {
      notificationCenter.warning("Escolha um único endereço principal.");
      focusSection(SECTION_KEYS.address);
      return;
    }

    // No cadastro todo campo do arquivo é obrigatório (menos a principal).
    if (!validateFiles()) {
      notificationCenter.warning("Complete os dados de cada arquivo.");
      focusSection(SECTION_KEYS.documents);
      return;
    }

    setIsCreating(true);
    try {
      const envelope = await createClient(
        toCreateRequest(service.values, personal.values, professional.values),
      );
      const newId = envelope?.data?.id;
      if (!newId) {
        // 2xx sem id é falha de contrato: sem id não há como gravar o resto.
        notificationCenter.warning("Cliente criado, mas sem identificador.", {
          description: "Confira a listagem antes de tentar de novo.",
        });
        return;
      }

      // A listagem cacheia por combinação de filtros; sem limpar, o cliente
      // novo não aparece até o próximo logout.
      clearClientsCache();
      setClientId(newId);
      markSaved(SECTION_KEYS.service);
      markSaved(SECTION_KEYS.personal);
      markSaved(SECTION_KEYS.professional);

      /**
       * Daqui para baixo o cliente **já existe**. Uma falha não desfaz a
       * criação — só deixa aquela seção por gravar. Por isso cada passo é
       * isolado: um endereço que falha não impede a entrevista de entrar, e a
       * seção que falhou continua editável, com o botão próprio de salvar.
       */
      const failed: string[] = [];

      /**
       * Os endereços vão numa requisição só (`/addresses/batch`), e não num
       * POST por aba.
       *
       * Com um POST por aba, cada um tinha transação própria: o segundo
       * falhando deixava o primeiro gravado e a ficha pela metade, com a tela
       * dizendo que "endereço 2" falhou e nada explicando por que o 1 ficou.
       * No lote, ou entram todos ou não entra nenhum — e a aba inteira volta
       * a ficar por gravar, que é um estado que a pessoa entende e consegue
       * repetir pelo botão de salvar da seção.
       *
       * O backend devolve os criados **na ordem enviada**, o que é o que
       * permite casar cada resposta com a aba que a originou e guardar o id —
       * sem ele, uma edição posterior viraria um endereço novo em vez de PUT.
       */
      if (filledAddresses.length > 0) {
        try {
          const saved = await createAddresses(
            newId,
            filledAddresses.map((slot) => toAddressRequest(slot.form.values)),
          );
          const criados = saved?.data ?? [];
          const enviados = filledAddresses.map((slot) =>
            Number(slot.key.replace("address-", "")),
          );
          setAddressIds((current) =>
            casarIdsDeEndereco(current, enviados, criados),
          );
          markSaved(SECTION_KEYS.address);
        } catch (error) {
          console.error("Erro ao salvar endereços:", error);
          failed.push(filledAddresses.length > 1 ? "endereços" : "endereço");
        }
      }

      /**
       * Os intervalos de deficiência vão num POST cada: não há rota de lote,
       * e aqui isso não é perda. Um intervalo é independente dos outros — o
       * segundo falhar não torna o primeiro inválido, ao contrário dos
       * endereços, onde o conjunto é que define qual é o principal.
       *
       * Guardamos o id de cada um que entrou, para que um reenvio pelo botão da
       * seção vire PUT em vez de duplicar o intervalo.
       */
      if (disabilityTouched) {
        const porGravar = disabilityPeriods.filter(hasDisabilityInput);
        let gravados = 0;
        for (const period of porGravar) {
          try {
            const saved = await createDisabilityPeriod(
              newId,
              toDisabilityPeriodRequest(period),
            );
            const savedId = saved?.data?.id;
            if (savedId) {
              gravados += 1;
              // O id vai para o rascunho: um reenvio pelo botão da seção
              // precisa virar PUT, senão duplica o intervalo.
              updateDisabilityPeriod(period.key, { id: savedId });
            }
          } catch (error) {
            console.error("Erro ao salvar período de deficiência:", error);
          }
        }
        if (gravados === porGravar.length) {
          markSaved(SECTION_KEYS.disability);
        } else {
          failed.push(
            porGravar.length > 1
              ? "períodos de deficiência"
              : "período de deficiência",
          );
        }
      }

      if (interviewTouched) {
        try {
          const saved = await createInterview(
            newId,
            toInterviewRequest(interview.values),
          );
          setInterviewId(saved?.data?.id ?? null);
          markSaved(SECTION_KEYS.interview);
        } catch (error) {
          console.error("Erro ao salvar entrevista:", error);
          failed.push("entrevista");
        }
      }

      if (stagedDocuments.length > 0) {
        try {
          await uploadDocuments(newId, buildDocumentsFormData(stagedDocuments));
          setStagedDocuments([]);
          markSaved(SECTION_KEYS.documents);
        } catch (error) {
          console.error("Erro ao enviar documentos:", error);
          failed.push("documentos");
        }
      }

      if (stagedSimulations.length > 0) {
        try {
          await uploadSimulations(
            newId,
            buildSimulationsFormData(
              stagedSimulations.map((item) => ({
                file: item.file,
                simulationDate: item.simulationDate,
                version: item.version,
                vinculos: item.vinculos ? Number(item.vinculos) : undefined,
                notes: item.notes,
              })),
            ),
          );
          setStagedSimulations([]);
          markSaved(SECTION_KEYS.documents);
        } catch (error) {
          console.error("Erro ao enviar simulações:", error);
          failed.push("simulações");
        }
      }

      if (failed.length > 0) {
        notificationCenter.warning("Cliente criado, com pendências.", {
          description: `Não foi possível salvar: ${failed.join(", ")}. Use o botão da própria seção para tentar de novo.`,
        });
        focusSection(SECTION_KEYS.address, SECTION_KEYS.interview);
        return;
      }

      notificationCenter.success("Cliente cadastrado.");
      router.push("/clientes");
    } catch (error) {
      // O toast de erro já vem do interceptor do axiosService.
      console.error("Erro ao criar cliente:", error);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Os handlers abaixo servem à fase 2: com o cliente criado, cada seção grava
   * sozinha na sua rota — que é onde a separação por endpoint tem valor real,
   * porque salvar o endereço não escreve por cima de um campo profissional.
   */
  const handleSaveService = async () => {
    if (!clientId || !service.revealErrors()) return;
    try {
      await patchClient(clientId, toPatchRequest(service.values));
      markSaved(SECTION_KEYS.service);
      notificationCenter.success("Atendimento atualizado.");
    } catch (error) {
      console.error("Erro ao atualizar atendimento:", error);
    }
  };

  const handleSavePersonal = async () => {
    if (!clientId || !personal.revealErrors()) return;
    try {
      await updatePersonalData(
        clientId,
        toPersonalDataRequest(personal.values),
      );
      markSaved(SECTION_KEYS.personal);
      notificationCenter.success("Dados pessoais salvos.");
    } catch (error) {
      console.error("Erro ao salvar dados pessoais:", error);
    }
  };

  const handleSaveProfessional = async () => {
    if (!clientId || !professional.revealErrors()) return;
    try {
      await updateProfessionalData(
        clientId,
        toProfessionalDataRequest(professional.values),
      );
      markSaved(SECTION_KEYS.professional);
      notificationCenter.success("Dados profissionais salvos.");
    } catch (error) {
      console.error("Erro ao salvar dados profissionais:", error);
    }
  };

  /**
   * Salva uma aba de endereço na fase 2.
   *
   * `POST` na primeira vez, `PUT` daí em diante — sem guardar o id, clicar
   * "salvar" duas vezes criaria dois endereços para o mesmo cliente.
   */
  const handleSaveAddress = async (index: number) => {
    const form = addressForms[index];
    if (!clientId || !form || !form.revealErrors()) return;

    const body = toAddressRequest(form.values);
    const existingId = addressIds[index];
    try {
      if (existingId) {
        await updateAddress(clientId, existingId, body);
        notificationCenter.success("Endereço atualizado.");
      } else {
        const saved = await createAddress(clientId, body);
        const addressId = saved?.data?.id;
        if (addressId) {
          setAddressIds((current) =>
            current.map((value, i) => (i === index ? addressId : value)),
          );
        }
        notificationCenter.success("Endereço salvo.");
      }
      markSaved(SECTION_KEYS.address);
    } catch (error) {
      console.error("Erro ao salvar endereço:", error);
    }
  };

  /**
   * Salvamento da seção depois de o cliente existir.
   *
   * Cada intervalo já gravado vira PUT (tem `id`), os novos viram POST. Sem
   * essa distinção, clicar em salvar duas vezes criaria intervalos duplicados —
   * e dois intervalos iguais se sobrepõem, então o segundo clique passaria a
   * devolver 400 sem a pessoa entender o que mudou.
   */
  const handleSaveDisability = async () => {
    if (!clientId) return;
    const porGravar = disabilityPeriods.filter(hasDisabilityInput);
    if (porGravar.length === 0) {
      notificationCenter.info("Nenhum período de deficiência preenchido.");
      return;
    }

    setDisabilityRevealed(true);
    if (
      Object.keys(validateDisabilityPeriods(disabilityPeriods, today)).length >
      0
    ) {
      return;
    }

    let falhas = 0;
    for (const period of porGravar) {
      try {
        const body = toDisabilityPeriodRequest(period);
        const saved = period.id
          ? await updateDisabilityPeriodRequest(clientId, period.id, body)
          : await createDisabilityPeriod(clientId, body);
        const savedId = saved?.data?.id;
        if (savedId && !period.id) {
          updateDisabilityPeriod(period.key, { id: savedId });
        }
      } catch (error) {
        console.error("Erro ao salvar período de deficiência:", error);
        falhas += 1;
      }
    }

    if (falhas === 0) {
      markSaved(SECTION_KEYS.disability);
      notificationCenter.success(
        porGravar.length > 1
          ? "Períodos de deficiência salvos."
          : "Período de deficiência salvo.",
      );
    }
  };

  const handleSaveInterview = async () => {
    if (!clientId) return;
    if (!hasInterviewInput(interview.values)) {
      notificationCenter.info("Nada para salvar na entrevista.");
      return;
    }
    if (!interview.revealErrors()) {
      notificationCenter.warning("A entrevista precisa de conteúdo.");
      return;
    }
    try {
      const body = toInterviewRequest(interview.values);
      if (interviewId) {
        await updateInterview(clientId, interviewId, body);
      } else {
        const saved = await createInterview(clientId, body);
        setInterviewId(saved?.data?.id ?? null);
      }
      markSaved(SECTION_KEYS.interview);
      notificationCenter.success("Entrevista salva.");
    } catch (error) {
      console.error("Erro ao salvar entrevista:", error);
    }
  };

  /**
   * O `validate` de cada aba — as abas não deixam avançar sem ele.
   *
   * Mesma regra do "Salvar cliente": Atendimento, Dados pessoais e Dados
   * profissionais sempre; endereço, deficiência e entrevista só quando
   * preenchidos (em branco, não viram requisição); arquivos, cada um completo.
   * Todos mostram os erros da aba ao reprovar.
   */
  function validateFiles() {
    setFilesRevealed(true);
    return (
      stagedDocuments.every(isDocumentComplete) &&
      stagedSimulations.every(isSimulationComplete)
    );
  }

  const validateAddresses = () =>
    addressSlots
      .filter((slot) => hasAddressInput(slot.form.values))
      // `map` antes do `every`: cada aba de endereço mostra os próprios erros.
      .map((slot) => slot.form.revealErrors())
      .every(Boolean);

  const validateDisability = () => {
    if (!hasAnyDisabilityInput(disabilityPeriods)) return true;
    setDisabilityRevealed(true);
    return (
      Object.keys(validateDisabilityPeriods(disabilityPeriods, today)).length ===
      0
    );
  };

  const validateInterview = () =>
    !hasInterviewInput(interview.values) || interview.revealErrors();

  /**
   * Nenhuma seção fica travada. O que define o que vai para a API é o
   * preenchimento — seção em branco simplesmente não vira requisição.
   */
  const statusOf = (key: string, isValid: boolean) => {
    if (savedSections.has(key))
      return { status: "saved" as const, label: "Salvo" };
    return isValid
      ? { status: "ready" as const, label: "Pronto" }
      : { status: "pending" as const, label: "Pendente" };
  };

  /**
   * Todos os campos com rótulo e valor — é a aba Revisão, e é também de onde
   * cada aba tira quantos obrigatórios faltam nela.
   */
  /**
   * Algo digitado que o Cancelar jogaria fora.
   *
   * Só vale **antes** de o cliente existir: depois do primeiro salvamento o
   * botão vira "Concluir" e o que importava já está gravado. Endereço usa o
   * `hasAddressInput` em vez da comparação genérica porque o principal muda de
   * aba sem ninguém digitar nada.
   */
  const hasUnsavedInput =
    !isCreated &&
    (sectionHasInput(service.values, serviceInitial) ||
      sectionHasInput(personal.values, personalInitial) ||
      sectionHasInput(professional.values, professionalInitial) ||
      addressForms.some((form) => hasAddressInput(form.values)) ||
      hasAnyDisabilityInput(disabilityPeriods) ||
      hasInterviewInput(interview.values) ||
      stagedDocuments.length > 0 ||
      stagedSimulations.length > 0);

  /** Formulário em branco sai direto: não há o que perder, nem o que perguntar. */
  const handleCancel = () => {
    if (hasUnsavedInput) {
      setIsConfirmingCancel(true);
      return;
    }
    router.push("/clientes");
  };

  const review = buildClientReview({
    service: service.values,
    personal: personal.values,
    professional: professional.values,
    addresses: addressSlots.map((slot) => ({
      label: slot.label,
      values: slot.form.values,
      hasInput: hasAddressInput(slot.form.values),
    })),
    interview: {
      values: interview.values,
      hasInput: hasInterviewInput(interview.values),
    },
    disability: mostrarDeficiencia ? disabilityPeriods : null,
    documents: stagedDocuments,
    simulations: stagedSimulations,
  });
  const missingIn = (key: ReviewSectionKey) =>
    review.find((section) => section.key === key)?.missing ?? 0;

  /** As abas, na ordem do formulário. A "Revisão" entra no fim, sozinha. */
  const candidates: (ClientFormSection | false)[] = [
    {
      id: SECTION_KEYS.service,
      title: "Atendimento",
      description:
        "Benefício pretendido e situação do caso — é o que orienta o requerimento.",
      icon: <ServiceIcon />,
      missing: missingIn("service"),
      validate: service.revealErrors,
      ...toSectionProps(statusOf(SECTION_KEYS.service, service.isValid)),
      content: (
        <div className="flex flex-col gap-2">
          <ServiceSection
            form={service}
            onBenefitChange={handleBenefitChange}
          />
          <SectionActions
            isVisible={isCreated}
            onSave={handleSaveService}
            label="Salvar atendimento"
          />
        </div>
      ),
    },
    /*
      A seção aparece só quando faz diferença: aposentadoria por deficiência
      é a hipótese em que o grau e o tempo em cada grau mudam o requerimento.
      A chave "pessoa com deficiência" de Dados pessoais também a traz, porque
      quem marcou aquela chave tem a informação em mãos — e perdê-la agora
      significa pedir de novo depois.

      Em qualquer outro caso seria mais um campo para ignorar no meio de um
      formulário que já é longo.
    */
    mostrarDeficiencia && {
      id: SECTION_KEYS.disability,
      title: "Períodos de deficiência",
      description:
        "Grau e tempo em cada grau. Na aposentadoria da pessoa com deficiência, mudam o tempo exigido.",
      icon: <DisabilityIcon />,
      missing: missingIn("disability"),
      validate: validateDisability,
      ...toSectionProps(
        statusOf(
          SECTION_KEYS.disability,
          Object.keys(validateDisabilityPeriods(disabilityPeriods, today))
            .length === 0,
        ),
      ),
      content: (
        <div className="flex flex-col gap-4">
          <DisabilitySection
            periods={disabilityPeriods}
            errors={disabilityErrors}
            gender={personal.values.gender}
            today={today}
            onChange={updateDisabilityPeriod}
            onAdd={addDisabilityPeriod}
            onRemove={removeDisabilityPeriod}
            canDeleteSaved={podeDestruir}
          />
          <SectionActions
            isVisible={isCreated}
            onSave={handleSaveDisability}
            label="Salvar períodos de deficiência"
          />
        </div>
      ),
    },
    {
      id: SECTION_KEYS.personal,
      title: "Dados pessoais",
      description: "Quem é o cliente e como falar com ele.",
      icon: <PersonIcon />,
      missing: missingIn("personal"),
      validate: personal.revealErrors,
      ...toSectionProps(statusOf(SECTION_KEYS.personal, personal.isValid)),
      content: (
        <div className="flex flex-col gap-2">
          <PersonalDataSection form={personal} />
          <SectionActions
            isVisible={isCreated}
            onSave={handleSavePersonal}
            label="Salvar dados pessoais"
          />
        </div>
      ),
    },
    {
      id: SECTION_KEYS.professional,
      title: "Dados profissionais",
      description: "Vida contributiva e o acesso ao Meu INSS.",
      icon: <WorkIcon />,
      missing: missingIn("professional"),
      validate: professional.revealErrors,
      ...toSectionProps(
        statusOf(SECTION_KEYS.professional, professional.isValid),
      ),
      content: (
        <div className="flex flex-col gap-2">
          <ProfessionalDataSection form={professional} />
          <SectionActions
            isVisible={isCreated}
            onSave={handleSaveProfessional}
            label="Salvar dados profissionais"
          />
        </div>
      ),
    },
    {
      id: SECTION_KEYS.address,
      title: "Endereço",
      description: "Até três endereços; um deles é o principal.",
      icon: <AddressIcon />,
      missing: missingIn("address"),
      validate: validateAddresses,
      ...toSectionProps(
        statusOf(SECTION_KEYS.address, addressForms[0].isValid),
      ),
      content: (
        <AddressesSection
          slots={addressSlots}
          selectedKey={selectedAddressKey}
          onSelectionChange={setSelectedAddressKey}
          canAddMore={addressCount < 3}
          onAddAddress={handleAddAddress}
          onRequestPrimary={handleRequestPrimary}
          renderActions={(slot) => {
            const index = Number(slot.key.replace("address-", ""));
            return (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {addressCount > 1 && (
                  <ChipButton
                    tone="danger"
                    icon={<TrashIcon className="h-3.5 w-3.5" />}
                    onClick={() => handleRemoveAddress(index)}
                  >
                    Excluir endereço
                  </ChipButton>
                )}
                <SectionActions
                  isVisible={isCreated}
                  onSave={() => handleSaveAddress(index)}
                  label={
                    addressIds[index] ? "Atualizar endereço" : "Salvar endereço"
                  }
                />
              </div>
            );
          }}
        />
      ),
    },
    {
      id: SECTION_KEYS.interview,
      title: "Entrevista",
      description:
        "O relato do atendimento: histórico, pendências e documentos a trazer.",
      icon: <InterviewIcon />,
      missing: missingIn("interview"),
      validate: validateInterview,
      ...toSectionProps(statusOf(SECTION_KEYS.interview, interview.isValid)),
      content: (
        <div className="flex flex-col gap-4">
          <InterviewSection form={interview} />
          <SectionActions
            isVisible={isCreated}
            onSave={handleSaveInterview}
            label="Salvar entrevista"
          />
        </div>
      ),
    },
    {
      id: SECTION_KEYS.documents,
      title: "Arquivos",
      description:
        "Documentos e simulações do caso, guardados junto do cliente.",
      icon: <FilesIcon />,
      missing: missingIn("documents"),
      validate: validateFiles,
      ...toSectionProps(
        statusOf(
          SECTION_KEYS.documents,
          stagedDocuments.every(isDocumentComplete) &&
            stagedSimulations.every(isSimulationComplete),
        ),
      ),
      content: (
        <FilesUpload
          documents={stagedDocuments}
          simulations={stagedSimulations}
          onDocumentsChange={setStagedDocuments}
          onSimulationsChange={setStagedSimulations}
          showErrors={filesRevealed}
        />
      ),
    },
  ];
  const sections = candidates.filter(
    (section): section is ClientFormSection => section !== false,
  );

  return (
    <div className="flex flex-col gap-4 pb-16">
      {/*
        `onPress` em vez de `href`: HeroUI v3 não tem `RouterProvider` — sem
        ele, `href` navegaria com reload de página inteira em vez do router do
        Next. O último item fica sem handler: react-aria já o marca como
        `isCurrent` (é o filho final da lista) e não desenha o separador.
      */}

      <PageHeader
        title="Cadastro de Cliente"
        description={
          // Legenda dos números das abas — some junto com eles, quando não
          // falta mais nada. Leitor de tela já ouve isso na própria aba.
          totalMissing(review) > 0 ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-semibold text-white"
              >
                N
              </span>
              Os números nas abas indicam quantos itens obrigatórios faltam em
              cada etapa para que o cliente possa ser cadastrado.
            </span>
          ) : undefined
        }
        actions={
          /*
            O anel de progresso, e não "Salvar cliente".
            
            O `ProgressRing` foi feito para este lugar — "aro verde sobre o azul
            da marca", diz o próprio componente — e o valor já era calculado
            aqui sem nunca ser mostrado. Salvar fica no rodapé porque é lá que
            a pessoa está quando termina de preencher oito seções; duplicá-lo
            no topo criaria dois botões que fazem a mesma coisa, e um deles
            sempre longe demais.
          */
          <ProgressRing
            value={progress}
            size={72}
            label="Preenchimento dos campos obrigatórios"
          />
        }
      />
      <FillModeDisclosure value={fillMode} onChange={setFillMode} />

      {fillMode === "abas" ? (
        <>
          <div>
            <ClientFormTabs
              sections={sections}
              focus={focus}
              onActiveChange={setActiveTab}
              review={{
                id: REVIEW_KEY,
                title: "Revisão",
                content: (
                  <ReviewPanel
                    sections={review}
                    onEdit={(key) => focusSection(SECTION_KEYS[key])}
                  />
                ),
              }}
            />
          </div>
        </>
      ) : (
        <FillModeView
          mode={fillMode}
          service={service}
          personal={personal}
          professional={professional}
          address={address1}
          onBenefitChange={handleBenefitChange}
        />
      )}

      <GenderPromptModal
        isOpen={isAskingGender}
        currentGender={personal.values.gender}
        onChoose={(gender) => personal.setField("gender", gender)}
        onClose={() => setIsAskingGender(false)}
      />

      <PrimaryAddressPicker
        isOpen={removeRequest !== null}
        onClose={() => setRemoveRequest(null)}
        removingLabel={
          removeRequest !== null
            ? (addressSlots[removeRequest]?.label ?? "Este endereço")
            : ""
        }
        options={addressSlots
          .filter(
            (slot) =>
              Number(slot.key.replace("address-", "")) !== removeRequest,
          )
          .map((slot) => {
            const index = Number(slot.key.replace("address-", ""));
            const { street, addressNumber, city } = slot.form.values;
            const hint = [street, addressNumber, city]
              .map((part) => part.trim())
              .filter(Boolean)
              .join(", ");
            return {
              index,
              label: slot.label,
              hint: hint || "Sem dados ainda",
            };
          })}
        onConfirm={(nextPrimaryIndex) => {
          if (removeRequest === null) return;
          void applyRemoveAddress(removeRequest, nextPrimaryIndex);
        }}
      />

      <ConfirmDialog
        isOpen={isConfirmingCancel}
        onClose={() => setIsConfirmingCancel(false)}
        onConfirm={() => router.push("/clientes")}
        tone="danger"
        heading="Cancelar o cadastro?"
        confirmLabel="Descartar e sair"
        cancelLabel="Continuar cadastro"
        description={
          <>
            O cliente ainda não foi salvo. Ao sair agora,{" "}
            <span className="font-medium">
              tudo o que foi preenchido será perdido
            </span>{" "}
            — dados pessoais e profissionais, endereços, entrevista e os
            arquivos selecionados. Não há como desfazer.
          </>
        }
      />

      <ConfirmDialog
        isOpen={disabilityRemoval !== null}
        onClose={() => setDisabilityRemoval(null)}
        onConfirm={() => void confirmDisabilityRemoval()}
        tone="danger"
        heading="Excluir este período de deficiência?"
        confirmLabel="Excluir"
        cancelLabel="Manter"
        description="O período já está gravado na ficha. Excluir tira o intervalo do cálculo da LC 142/2013, e não há como desfazer."
      />

      <ConfirmDialog
        isOpen={primaryRequest !== null}
        onClose={() => setPrimaryRequest(null)}
        onConfirm={() => {
          if (primaryRequest !== null) promotePrimary(primaryRequest);
        }}
        heading="Trocar o endereço principal?"
        confirmLabel="Tornar principal"
        cancelLabel="Manter"
        description={
          primaryRequest !== null && currentPrimaryIndex !== -1 ? (
            <>
              <span className="font-medium">
                {addressSlots[currentPrimaryIndex]?.label}
              </span>{" "}
              deixa de ser o principal e{" "}
              <span className="font-medium">
                {addressSlots[primaryRequest]?.label}
              </span>{" "}
              passa a ser. Só um endereço pode ser o principal.
            </>
          ) : null
        }
      />

      {/* Sem "Revisar" aqui: a Revisão é a última aba, e cada seção leva a
          ela pelo "Próxima". */}
      <FormActionBar
        missing={missingFields(review)}
        progress={progress}
        isReviewing={isReviewing}
        onGoTo={(key) => {
          // As pendências moram nas abas: de outro modo, volta para elas.
          if (fillMode !== "abas") setFillMode("abas");
          focusSection(SECTION_KEYS[key]);
        }}
      >
        <ActionButton tone="neutral" onClick={handleCancel}>
          {isCreated ? "Concluir" : "Cancelar"}
        </ActionButton>
        {!isCreated && (
          <ActionButton
            tone="primary"
            grow
            disabled={!canCreate}
            onClick={handleSaveAll}
          >
            {isCreating ? "Salvando…" : "Salvar cliente"}
          </ActionButton>
        )}
      </FormActionBar>
    </div>
  );
}

/**
 * Rodapé de uma seção que salva por conta própria.
 *
 * Um componente e não JSX repetido seis vezes: o botão de salvar seção só faz
 * sentido depois que o cliente existe, e essa condição tem que ser a mesma em
 * todas — repetir `{isCreated && ...}` à mão é como uma seção acaba salvando
 * antes da hora.
 */
function SectionActions({
  onSave,
  label,
  isVisible,
}: {
  onSave: () => void;
  label: string;
  isVisible: boolean;
}) {
  if (!isVisible) return null;
  return (
    <div className="flex justify-end pt-2">
      <ActionButton tone="primary" shape="pill" onClick={onSave}>
        {label}
      </ActionButton>
    </div>
  );
}

function toSectionProps(state: {
  status: "locked" | "pending" | "ready" | "saved";
  label: string;
}) {
  return { status: state.status, statusLabel: state.label };
}
