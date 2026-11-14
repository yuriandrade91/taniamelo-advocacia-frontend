import { BENEFIT_ENTRIES, type BenefitKey } from "@/enums/benefit/Benefits";
import {
  SITUATION_ENTRIES,
  type SituationKey,
} from "@/enums/situation/Situation";

/**
 * O conteúdo do site do escritório, num lugar só.
 *
 * O que é do escritório e o sistema não sabe — telefone, WhatsApp, e-mail,
 * endereço, OAB — fica em `SITE_CONTACT`, **vazio até alguém preencher**. Campo
 * vazio não aparece: o site nunca publica um número de exemplo como se fosse o
 * de verdade. Pelo mesmo motivo não há nota de avaliação, contagem de clientes
 * nem "desde 19xx": número de vitrine sem fonte é o que o Provimento 205/2021
 * da OAB pede para não fazer.
 *
 * Exceção: `ESSENCE_STATS`, números de vitrine passados pelo próprio
 * escritório. Quem responde por eles é o escritório — confira com o
 * Provimento 205/2021 antes de publicar.
 *
 * Os benefícios e as etapas vêm dos enums do sistema: o site fala dos mesmos
 * serviços e do mesmo caminho que o escritório usa no dia a dia.
 */

type SiteContact = {
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  oab: string;
  instagram: string;
};

export const SITE_CONTACT: Readonly<SiteContact> = {
  /** Só dígitos, com DDD: "31999990000". Liga o botão flutuante e os CTAs. */
  whatsapp: "21995275421",
  /** Como deve aparecer: "(31) 3333-0000". */
  phone: "",
  email: "",
  /** Uma linha: "Rua…, nº — Bairro, Cidade/UF". */
  address: "",
  /** "OAB/MG 000.000". */
  oab: "",
  /** Sem o "@". */
  instagram: "",
};

/** Os destaques da faixa de "Nossa essência": o número grande e o que ele conta. */
export const ESSENCE_STATS = [
  { value: "+1.500", label: "clientes no Brasil e no exterior" },
  { value: "100%", label: "digital e personalizado" },
  { value: "98%", label: "dos processos ganhos" },
  // { value: "98%", label: "dos clientes satisfeitos" },
  { value: "5", label: "nota máxima no Google" },
  { value: "IA", label: "auxiliando os processos" },
] as const;

/** As redes do escritório, na ordem em que aparecem no rodapé. */
export const SITE_SOCIALS = [
  {
    name: "Instagram",
    handle: "@advogadataniamelo",
    href: "https://www.instagram.com/advogadataniamelo",
  },
  {
    name: "TikTok",
    handle: "@advogadataniamelo",
    href: "https://www.tiktok.com/@advogadataniamelo",
  },
  {
    name: "Google",
    handle: "Avaliações",
    href: "https://www.google.com/searchviewer/10?svid=CCYSESoPCg0vZy8xMXZfM3pxenk4GAo",
  },
  {
    name: "LinkedIn",
    handle: "Tânia Melo",
    href: "https://www.linkedin.com/in/tania-melo-22a1a433/",
  },
] as const;

export const SITE_NAME = "Tânia Melo Advocacia Previdenciária";

/** A mensagem que já vai escrita no WhatsApp. */
const WHATSAPP_GREETING =
  "Olá! Vim pelo site e gostaria de conversar sobre a minha aposentadoria.";

/** O WhatsApp com a mensagem já escrita — ou a seção de contato, enquanto o número não está preenchido. */
export const whatsappHref = (message: string) =>
  SITE_CONTACT.whatsapp
    ? `https://wa.me/55${SITE_CONTACT.whatsapp}?text=${encodeURIComponent(message)}`
    : "#contato";

/** O destino do "falar com a equipe": o WhatsApp, quando configurado; senão, a seção de contato. */
export const contactHref = whatsappHref(WHATSAPP_GREETING);

export const NAV_LINKS = [
  { href: "#escritorio", label: "Essência" },
  { href: "#atuacao", label: "Atuação" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#duvidas", label: "Dúvidas" },
] as const;

const BENEFIT_LABEL = Object.fromEntries(BENEFIT_ENTRIES) as Record<
  BenefitKey,
  string
>;

export type Service = {
  key: BenefitKey;
  title: string;
  /** A pergunta de quem procura este benefício, na língua dele. */
  question: string;
  summary: string;
};

export const SERVICES: readonly Service[] = [
  {
    key: "APOSENTADORIA_POR_DEFICIENCIA",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_DEFICIENCIA,
    question: "Tem deficiência e trabalha? O tempo exigido pode ser bem menor.",
    summary:
      "A Lei Complementar 142/2013 reduz o tempo de contribuição conforme o grau da deficiência — grave, moderada ou leve — e o tempo trabalhado em cada grau é convertido com precisão.",
  },
  {
    key: "APOSENTADORIA_ESPECIAL",
    title: BENEFIT_LABEL.APOSENTADORIA_ESPECIAL,
    question:
      "Trabalhou exposto a ruído, calor, agentes químicos ou biológicos?",
    summary:
      "PPP, laudos técnicos e o histórico de cada empresa conferidos para provar a exposição.",
  },
  {
    key: "APOSENTADORIA_POR_IDADE",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_IDADE,
    question: "Chegou a idade e não sabe se as contribuições fecham a conta?",
    summary:
      "Idade mínima e carência conferidas contra o seu CNIS, com as lacunas corrigidas antes do pedido.",
  },
  {
    key: "APOSENTADORIA_POR_TEMPO_CONTRIBUICAO",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_TEMPO_CONTRIBUICAO,
    question: "Começou a contribuir antes da Reforma de 2019?",
    summary:
      "As regras de transição são comparadas lado a lado para achar a data e o valor mais vantajosos.",
  },
  {
    key: "APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE,
    question: "Uma doença ou um acidente impedem você de voltar a trabalhar?",
    summary:
      "Laudos, exames e o histórico médico organizados para a perícia do INSS.",
  },
  {
    key: "APOSENTADORIA_POR_TEMPO_PROFESSOR",
    title: "Aposentadoria do professor",
    question:
      "Dá ou deu aula na educação infantil, no ensino fundamental ou no médio?",
    summary:
      "O tempo de magistério tem regra própria, com requisitos reduzidos — e precisa ser comprovado período a período.",
  },
  {
    key: "APOSENTADORIA_RURAL",
    title: BENEFIT_LABEL.APOSENTADORIA_RURAL,
    question: "Trabalhou no campo, sozinho ou com a família?",
    summary:
      "A idade exigida é menor, e a prova do trabalho rural é montada com os documentos que existem.",
  },
];

export const PRACTICE_AREAS = [
  {
    title: "MEI",
    question:
      "Contribuiu como microempreendedor individual e quer saber como esse período entra na aposentadoria?",
    summary:
      "Conferimos os pagamentos do DAS e o CNIS para avaliar o aproveitamento dos recolhimentos e se é necessário complementar contribuições para a regra pretendida.",
  },
  {
    title: "Contribuinte Individual",
    question: "Trabalha por conta própria e contribui para o INSS?",
    summary:
      "Revisamos a atividade exercida, os comprovantes de recolhimento e o CNIS para identificar períodos que podem ser considerados e eventuais pendências.",
  },
  {
    title: "Facultativo",
    question: "Você contribui por opção, sem exercer atividade remunerada?",
    summary:
      "Conferimos seu histórico, o plano escolhido e os recolhimentos para entender como eles podem ser considerados nas regras aplicáveis ao seu caso.",
  },
  {
    title: "Dona de casa de baixa renda",
    question:
      "Você se dedica ao trabalho doméstico na própria residência e contribui como facultativa de baixa renda?",
    summary:
      "Analisamos os requisitos do enquadramento, o CadÚnico e as contribuições feitas para verificar a possibilidade de validação e o aproveitamento dos períodos.",
  },
  {
    title: "Médico",
    question: "Trabalhou como médico exposto a agentes nocivos à saúde?",
    summary:
      "Analisamos documentos como o PPP e os registros dos locais de trabalho para verificar se a exposição permite reconhecer períodos especiais. A profissão, por si só, não garante esse enquadramento.",
  },
  {
    title: "Enfermeira",
    question: "Trabalhou como enfermeira exposta a agentes nocivos à saúde?",
    summary:
      "Conferimos o PPP e os registros de cada vínculo para avaliar a exposição a agentes biológicos e a possibilidade de reconhecer períodos especiais.",
  },
  {
    title: "Tempo Especial",
    question: "Trabalhou exposto a agentes prejudiciais à saúde?",
    summary:
      "Avaliamos os períodos trabalhados e documentos como PPP e laudos técnicos para verificar se os requisitos para o reconhecimento do tempo especial foram atendidos.",
  },
  {
    title: "Reclamatória Trabalhista",
    question:
      "Uma reclamatória trabalhista reconheceu vínculo ou remunerações que não aparecem no seu CNIS?",
    summary:
      "Analisamos a decisão e os documentos do processo junto com as provas do vínculo. O resultado trabalhista, sozinho, não garante o reconhecimento automático pelo INSS.",
  },
] as const;

export type JourneyStep = {
  key: SituationKey;
  title: string;
  description: string;
};

const STEP_DESCRIPTIONS: Record<SituationKey, string> = {
  FORMULARIO_PREENCHIDO:
    "Você conta a sua história: onde trabalhou, como contribuiu, sua saúde e sua família. Sem precisar saber o nome do benefício.",
  ANALISE_DOCUMENTAL:
    "CNIS, carteiras de trabalho, carnês, laudos — cada documento conferido e organizado por categoria.",
  PLANEJAMENTO_EM_EXECUCAO:
    "As regras possíveis são simuladas lado a lado: datas, valores e o que falta para cada uma.",
  PLANEJAMENTO_CONCLUIDO:
    "Você recebe o caminho recomendado, explicado: qual benefício, quando pedir e por quê.",
  BENEFICIO_FUTURO:
    "Se o melhor momento ainda não chegou, o caso fica acompanhado até a data certa — sem pedido precipitado.",
  BENEFICIO_CONCLUIDO:
    "O pedido é feito e acompanhado até a decisão do INSS. Se houver negativa, o caso segue para o recurso.",
};

/** As seis etapas da esteira — as mesmas que o escritório acompanha no sistema. */
export const JOURNEY: readonly JourneyStep[] = SITUATION_ENTRIES.map(
  ([key, title]) => ({
    key,
    title,
    description: STEP_DESCRIPTIONS[key],
  }),
);

export const FAQ = [
  {
    question: "Preciso saber qual benefício pedir antes do primeiro contato?",
    answer:
      "Não. Descobrir isso é justamente o trabalho da análise: a partir do seu histórico, as regras possíveis são comparadas e a melhor é recomendada.",
  },
  {
    question: "O que é o CNIS e por que ele importa tanto?",
    answer:
      "O Cadastro Nacional de Informações Sociais é o extrato de vínculos e contribuições que o INSS usa para decidir. Vínculo faltando ou salário errado ali muda o resultado — por isso ele é conferido logo no começo. Você consegue o seu pelo Meu INSS.",
  },
  {
    question: "O INSS negou meu pedido. Ainda dá para fazer alguma coisa?",
    answer:
      "Em geral, sim: há o recurso administrativo e, conforme o caso, a ação judicial. O prazo do recurso é curto — 30 dias da ciência da decisão —, então vale procurar orientação logo.",
  },
  {
    question: "Como funciona a aposentadoria da pessoa com deficiência?",
    answer:
      "Pela Lei Complementar 142/2013, há duas formas. Por tempo de contribuição, com o tempo exigido reduzido conforme o grau da deficiência. Ou por idade: 60 anos para homens e 55 para mulheres, com 15 anos de contribuição na condição de pessoa com deficiência.",
  },
  {
    question: "A Reforma da Previdência de 2019 mudou as minhas regras?",
    answer:
      "Depende de quando você começou a contribuir. Quem já contribuía antes de 13/11/2019 pode se encaixar em regras de transição, e às vezes mais de uma — comparar todas é o que evita escolher a pior.",
  },
  {
    question: "Quais documentos costumam ser pedidos?",
    answer:
      "Documentos pessoais, carteiras de trabalho, carnês e o CNIS são a base. Conforme o benefício entram PPP e laudos técnicos (atividade especial), laudos médicos (incapacidade e deficiência) ou provas do trabalho rural.",
  },
  // As perguntas abaixo respondem ao que as pessoas pesquisam no Google sobre
  // direito previdenciário (Google Trends, nov/2026): "o que é benefício
  // previdenciário", "limbo previdenciário", "perícia", "extrato", "PPP", "nexo técnico".
  {
    question: "O que é benefício previdenciário?",
    answer:
      "É o pagamento que o INSS faz a quem contribuiu e se encaixa numa situação prevista em lei: aposentadoria, auxílio por incapacidade temporária (antigo auxílio-doença), auxílio-acidente, pensão por morte, salário-maternidade, entre outros. Cada um tem requisitos próprios de contribuição, carência e idade.",
  },
  {
    question: "O que é o limbo previdenciário?",
    answer:
      "É quando o INSS considera o trabalhador apto e encerra o benefício, mas a empresa não o aceita de volta por entender que ele segue incapaz. Ele fica sem salário e sem benefício. A saída passa por recurso ou ação contra o INSS e, conforme o caso, pela cobrança dos salários da empresa.",
  },
  {
    question: "Como funciona a perícia do INSS?",
    answer:
      "Um perito médico avalia se existe incapacidade para o trabalho, olhando exames, laudos e o histórico da doença. Levar laudos atualizados, receitas e exames organizados faz diferença. Se o resultado for negativo, cabe recurso ou ação judicial, com perícia judicial.",
  },
  {
    question: "Para que serve o extrato previdenciário?",
    answer:
      "O extrato previdenciário (CNIS) mostra vínculos, salários e contribuições. É com ele que se confere se o tempo e a carência fecham, e se há períodos ou salários faltando para corrigir antes do pedido. Ele é emitido pelo Meu INSS.",
  },
  {
    question: "O que é o PPP (perfil profissiográfico previdenciário)?",
    answer:
      "É o documento, emitido pela empresa, que registra a atividade do trabalhador e os agentes nocivos a que esteve exposto, como ruído, calor e agentes químicos. Ele é a principal prova da aposentadoria especial e do tempo de trabalho em condições prejudiciais.",
  },
  {
    question: "O que é o nexo técnico epidemiológico (NTEP)?",
    answer:
      "É o vínculo que o INSS reconhece automaticamente entre a doença e a atividade da empresa, a partir de estatísticas por setor. Quando ele se aplica, a incapacidade é tratada como acidentária, o que pode trazer estabilidade no emprego e depósito de FGTS durante o afastamento.",
  },
  {
    question: "Quando cabe o auxílio-acidente?",
    answer:
      "Quando, depois de um acidente ou de uma doença, a pessoa se recupera mas fica com uma sequela que reduz a capacidade de trabalhar. O benefício é uma indenização mensal, de 50% do salário de benefício, paga enquanto ela trabalha — e pode ser pedido mesmo depois de voltar ao serviço.",
  },
] as const;
