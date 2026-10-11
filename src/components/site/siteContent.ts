import { BENEFIT_ENTRIES, type BenefitKey } from "@/enums/benefit/Benefits";
import { SITUATION_ENTRIES, type SituationKey } from "@/enums/situation/Situation";

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
  whatsapp: "21988275421",
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

export const SITE_NAME = "Tânia Melo Advocacia";

/** A mensagem que já vai escrita no WhatsApp. */
const WHATSAPP_GREETING = "Olá! Vim pelo site e gostaria de conversar sobre a minha aposentadoria.";

/** O WhatsApp com a mensagem já escrita — ou a seção de contato, enquanto o número não está preenchido. */
export const whatsappHref = (message: string) =>
  SITE_CONTACT.whatsapp ? `https://wa.me/55${SITE_CONTACT.whatsapp}?text=${encodeURIComponent(message)}` : "#contato";

/** O destino do "falar com a equipe": o WhatsApp, quando configurado; senão, a seção de contato. */
export const contactHref = whatsappHref(WHATSAPP_GREETING);

export const NAV_LINKS = [
  { href: "#atuacao", label: "Atuação" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#simulador", label: "Simulador PcD" },
  { href: "#duvidas", label: "Dúvidas" },
  { href: "#contato", label: "Contato" },
] as const;

const BENEFIT_LABEL = Object.fromEntries(BENEFIT_ENTRIES) as Record<BenefitKey, string>;

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
    question: "Trabalhou exposto a ruído, calor, agentes químicos ou biológicos?",
    summary: "PPP, laudos técnicos e o histórico de cada empresa conferidos para provar a exposição.",
  },
  {
    key: "APOSENTADORIA_POR_IDADE",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_IDADE,
    question: "Chegou a idade e não sabe se as contribuições fecham a conta?",
    summary: "Idade mínima e carência conferidas contra o seu CNIS, com as lacunas corrigidas antes do pedido.",
  },
  {
    key: "APOSENTADORIA_POR_TEMPO_CONTRIBUICAO",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_TEMPO_CONTRIBUICAO,
    question: "Começou a contribuir antes da Reforma de 2019?",
    summary: "As regras de transição são comparadas lado a lado para achar a data e o valor mais vantajosos.",
  },
  {
    key: "APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE",
    title: BENEFIT_LABEL.APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE,
    question: "Uma doença ou um acidente impedem você de voltar a trabalhar?",
    summary: "Laudos, exames e o histórico médico organizados para a perícia do INSS.",
  },
  {
    key: "APOSENTADORIA_POR_TEMPO_PROFESSOR",
    title: "Aposentadoria do professor",
    question: "Dá ou deu aula na educação infantil, no ensino fundamental ou no médio?",
    summary: "O tempo de magistério tem regra própria, com requisitos reduzidos — e precisa ser comprovado período a período.",
  },
  {
    key: "APOSENTADORIA_RURAL",
    title: BENEFIT_LABEL.APOSENTADORIA_RURAL,
    question: "Trabalhou no campo, sozinho ou com a família?",
    summary: "A idade exigida é menor, e a prova do trabalho rural é montada com os documentos que existem.",
  },
];

export type JourneyStep = { key: SituationKey; title: string; description: string };

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
export const JOURNEY: readonly JourneyStep[] = SITUATION_ENTRIES.map(([key, title]) => ({
  key,
  title,
  description: STEP_DESCRIPTIONS[key],
}));

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
] as const;
