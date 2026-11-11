import type { Metadata } from "next";
import { OfficeSite } from "@/components/site/OfficeSite";
import { FAQ, SITE_NAME } from "@/components/site/siteContent";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Advogado previdenciário, direito previdenciário e INSS`,
  description:
    "Advogado previdenciário para aposentadoria, benefício do INSS, perícia, limbo previdenciário e auxílio-acidente: planejamento, pedido e recurso de aposentadorias por idade, tempo, especial, deficiência, professor, rural e incapacidade permanente.",
  keywords: [
    "direito previdenciário",
    "advogado previdenciário",
    "INSS",
    "benefício previdenciário",
    "limbo previdenciário",
    "perícia INSS",
    "extrato previdenciário",
    "auxílio-acidente",
    "aposentadoria especial",
    "perfil profissiográfico previdenciário",
  ],
  openGraph: {
    title: `${SITE_NAME} — Advocacia previdenciária`,
    description: "O seu futuro merece presença — direito previdenciário com estratégia, escuta e respeito à sua história.",
    type: "website",
    locale: "pt_BR",
  },
};

/**
 * O site do escritório. O HTML sai inteiro no build (bom para busca e para
 * quem abre pelo celular); o movimento e a janela da conversa chegam com o
 * JavaScript.
 */
export default function SitePage() {
  // As dúvidas viram dados estruturados: é o que deixa o Google mostrar as
  // respostas direto no resultado da busca.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <a
        href="#atuacao"
        className="sr-only z-[60] rounded-full bg-white px-4 py-2 text-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      <OfficeSite />
    </>
  );
}
