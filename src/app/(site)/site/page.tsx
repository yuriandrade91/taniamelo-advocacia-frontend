import type { Metadata } from "next";
import { OfficeSite } from "@/components/site/OfficeSite";
import { SITE_NAME } from "@/components/site/siteContent";

export const metadata: Metadata = {
  title: `${SITE_NAME} — Advocacia previdenciária`,
  description:
    "Planejamento, pedido e recurso de aposentadorias do INSS: idade, tempo de contribuição, especial, pessoa com deficiência, professor, rural e incapacidade permanente.",
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
  return (
    <>
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
