"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { publicRoutes } from "@/constants/paths/routes";
import { CountUp } from "./CountUp";
import { Reveal } from "./Reveal";
import {
  ESSENCE_STATS,
  FAQ,
  JOURNEY,
  NAV_LINKS,
  PRACTICE_AREAS,
  SERVICES,
  SITE_CONTACT,
  SITE_SOCIALS,
} from "./siteContent";
import {
  ArrowUpRightIcon as ArrowUpRight,
  ChatIcon,
  CloseIcon,
  MenuIcon,
} from "./siteIcons";
import {
  ChannelList,
  Eyebrow,
  Logo,
  PRESS,
  usePrefersReducedMotion,
} from "./shared";
import type { Topic } from "./WhatsAppComposer";

const SCULPTURE = {
  src: "/photos/justice-sculpture.jpg",
  alt: "Escultura dourada de uma balança da justiça em um ambiente azul profundo",
};

const ESSENCE_PHOTO = {
  src: "/photos/tania-na-mesa.jpg",
  alt: "Dra. Tânia Melo à mesa, com uma xícara na mão, livros e documentos previdenciários ao lado",
  width: 1100,
  height: 1270,
};

/** A largura de tudo: 1400 px no máximo, com as margens da referência em cada faixa de tela. */
const CONTAINER =
  "mx-auto w-[min(1400px,calc(100%-100px))] max-[1100px]:w-[calc(100%-64px)] max-[760px]:w-[calc(100%-40px)]";

/**
 * O site do escritório, no desenho feito no Lovable: o nome enorme sobre a
 * cena azul com a balança dourada, as áreas em sanfona, "Nossa essência" sobre
 * a arquitetura, os passos numerados e o fechamento azul com o botão redondo.
 * O conteúdo é o do escritório: os sete benefícios, as seis etapas, o
 * as dúvidas e os canais de contato.
 *
 * Cada "falar com a equipe" abre a mesma janela: a pessoa escolhe a
 * aposentadoria, recebe a mensagem já escrita e ajusta antes de ir para o
 * WhatsApp — ou escreve do zero.
 */
export function OfficeSite() {
  const [composer, setComposer] = useState<{ topic: Topic } | null>(null);
  const openComposer = useCallback(
    (topic: Topic = "none") => setComposer({ topic }),
    [],
  );

  return (
    <ComposerContext.Provider value={openComposer}>
      <div className="min-h-screen bg-ivory text-primary">
        <Header />
        <Hero />
        <Manifesto />
        <Practice />
        <Journey />
        <Questions />
        <ClosingCall />
        <Footer />
        <button
          type="button"
          onClick={() => openComposer()}
          aria-label="Falar com a equipe pelo WhatsApp"
          className={`pr-fab fixed right-6 bottom-24 z-40 grid h-14 w-14 place-items-center rounded-full bg-secondary text-white hover:-translate-y-1 ${PRESS}`}
        >
          <ChatIcon className="h-6 w-6" />
        </button>
        {composer && (
          <WhatsAppComposer
            key={composer.topic}
            initialTopic={composer.topic}
            onClose={() => setComposer(null)}
          />
        )}
      </div>
    </ComposerContext.Provider>
  );
}

/* ───────────── a conversa pelo WhatsApp ───────────── */

const ComposerContext = createContext<(topic?: Topic) => void>(() => {});
const useComposer = () => useContext(ComposerContext);

/** A janela da conversa só é baixada quando alguém abre. */
const WhatsAppComposer = dynamic(() =>
  import("./WhatsAppComposer").then((module) => module.WhatsAppComposer),
);

/* ───────────── movimento ───────────── */

/**
 * Desloca `--parallax-y` no elemento conforme ele passa pela tela: a imagem
 * anda mais devagar que a página. Sem efeito com "reduzir movimento".
 */
function useParallax(ref: RefObject<HTMLElement | null>, factor: number) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    // O servidor rende com `reduced = false`: a primeira leitura pode já ter gravado um deslocamento.
    if (reduced) {
      ref.current?.style.removeProperty("--parallax-y");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      node.style.setProperty(
        "--parallax-y",
        `${(-offset * factor).toFixed(1)}px`,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, factor, reduced]);
}

/** Uma linha do título que sobe de trás de uma máscara. */
function RisingLine({
  delay,
  children,
}: Readonly<{ delay: number; children: ReactNode }>) {
  return (
    <span className="pr-line">
      <span style={{ "--d": `${delay}ms` } as CSSProperties}>{children}</span>
    </span>
  );
}

/** Como a `RisingLine`, mas sobe quando o `Reveal` em volta chega à tela. */
function ViewLine({
  delay,
  className = "",
  children,
}: Readonly<{ delay: number; className?: string; children: ReactNode }>) {
  return (
    <span className="pr-vline">
      <span
        className={className}
        style={{ "--d": `${delay}ms` } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

/** Entrada da cena do topo, em cascata pelo `delay`. */
function Enter({
  delay,
  className = "",
  children,
}: Readonly<{ delay: number; className?: string; children: ReactNode }>) {
  return (
    <div
      className={`pr-in ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ───────────── topo ───────────── */

/**
 * O cabeçalho fica preso: transparente sobre a cena, ganha fundo e encolhe ao
 * rolar, some quando a leitura desce e volta quando sobe. O fio dourado no pé
 * é o progresso da página.
 */
function Header() {
  const ref = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const openComposer = useComposer();

  useEffect(() => {
    let frame = 0;
    let lastY = window.scrollY;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      node.dataset.scrolled = String(y > 40);
      if (y <= 500 || y < lastY - 4) node.dataset.hidden = "false";
      else if (y > lastY + 4) node.dataset.hidden = "true";
      lastY = y;
      progressRef.current?.style.setProperty(
        "transform",
        `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      ref={ref}
      data-menu={isMenuOpen}
      className="pr-header group fixed inset-x-0 top-0 z-30 text-white transition-[background-color,transform] duration-500 data-[hidden=true]:-translate-y-full data-[menu=true]:translate-y-0! data-[menu=true]:bg-midnight data-[scrolled=true]:bg-midnight/90 data-[scrolled=true]:backdrop-blur-md"
    >
      <div
        className={`${CONTAINER} flex h-[116px] items-center justify-between gap-6 border-b border-white/[0.18] transition-[height] duration-500 group-data-[scrolled=true]:h-[84px] group-data-[scrolled=true]:border-transparent max-[1100px]:h-[92px] max-[1100px]:group-data-[scrolled=true]:h-[72px]`}
      >
        <a
          href="#inicio"
          aria-label="Tânia Melo Advocacia — início"
          className="pr-drop"
          style={{ "--d": "0ms" } as CSSProperties}
        >
          <Logo
            tone="gold"
            decorative
            className="h-[98px] w-[182px] object-contain transition-all duration-500 group-data-[scrolled=true]:h-[70px] group-data-[scrolled=true]:w-[130px] max-[1100px]:h-[78px] max-[1100px]:w-[140px] max-[1100px]:group-data-[scrolled=true]:h-[60px] max-[1100px]:group-data-[scrolled=true]:w-[112px]"
          />
        </a>
        <nav
          aria-label="Principal"
          className="flex items-center gap-10 max-[1280px]:gap-7 max-[1100px]:hidden"
        >
          {NAV_LINKS.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              style={{ "--d": `${120 + index * 70}ms` } as CSSProperties}
              className="pr-drop relative text-[17px] opacity-80 transition-opacity after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-secondary after:transition-transform after:duration-300 hover:opacity-100 hover:after:origin-left hover:after:scale-x-100"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => openComposer()}
          style={{ "--d": "450ms" } as CSSProperties}
          className={`pr-drop group/cta flex items-center gap-4 text-[17px] font-medium max-[1100px]:hidden ${PRESS}`}
        >
          Vamos conversar{" "}
          <span className="grid h-10 w-10 place-items-center rounded-full border border-secondary text-gold-light transition duration-300 group-hover/cta:rotate-45 group-hover/cta:bg-secondary group-hover/cta:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-controls="site-menu"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          className={`hidden h-12 w-12 place-items-center max-[1100px]:grid ${PRESS}`}
        >
          {isMenuOpen ? (
            <CloseIcon className="h-6 w-6" />
          ) : (
            <MenuIcon className="h-6 w-6" />
          )}
        </button>
      </div>
      {isMenuOpen && (
        <nav
          id="site-menu"
          aria-label="Menu"
          className="pr-menu flex flex-col gap-1 bg-midnight px-5 pt-4 pb-8 min-[1101px]:hidden"
        >
          {NAV_LINKS.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              style={{ "--d": `${index * 50}ms` } as CSSProperties}
              className="pr-menu-item border-b border-white/10 py-4 text-[24px] font-light"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              openComposer();
            }}
            className={`mt-6 flex min-h-[54px] items-center justify-center gap-3 bg-secondary text-base font-medium ${PRESS}`}
          >
            Falar com a equipe <ArrowUpRight className="h-4 w-4" />
          </button>
        </nav>
      )}
      <span
        ref={progressRef}
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-secondary"
        aria-hidden="true"
      />
    </header>
  );
}

/** A cena do topo: a imagem entra de longe e desce devagar com a rolagem; o nome sobe linha a linha. */
function Hero() {
  const ref = useRef<HTMLElement>(null);
  const openComposer = useComposer();
  useParallax(ref, 0.18);

  return (
    <section
      id="inicio"
      ref={ref}
      className="relative isolate h-[min(880px,100svh)] min-h-[720px] overflow-hidden bg-midnight text-white max-[760px]:h-auto max-[760px]:min-h-[100svh]"
    >
      <Image
        src={SCULPTURE.src}
        alt={SCULPTURE.alt}
        fill
        preload
        sizes="100vw"
        className="pr-scene -z-20 object-cover max-[760px]:object-[67%_center]"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-primary)_45%,transparent),transparent_65%)] max-[760px]:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-primary)_80%,transparent),color-mix(in_oklch,var(--color-primary)_25%,transparent))]"
        aria-hidden="true"
      />

      <div
        className={`${CONTAINER} pr-drift relative [--drift:-2] [--drift-max:400px] grid h-full min-h-[inherit] grid-cols-1 pt-[150px] pb-[34px] min-[1600px]:pt-[175px] max-[760px]:block max-[760px]:pt-[125px] max-[760px]:pb-[26px]`}
      >
        <div>
          <Enter delay={100}>
            <Eyebrow line className="text-gold-light">
              Advocacia previdenciária
            </Eyebrow>
          </Enter>
          <h1 className="mt-[25px] text-[112px] leading-[0.94] font-light min-[1600px]:text-[140px] max-[1100px]:text-[98px] max-[760px]:mt-[27px] max-[760px]:text-[84px] max-[760px]:leading-[0.98]">
            <RisingLine delay={250}>Tânia</RisingLine>
            <RisingLine delay={400}>
              Melo<span className="text-secondary">.</span>
            </RisingLine>
          </h1>

          <Enter
            delay={700}
            className="mt-[27px] flex items-end gap-[35px] max-[1100px]:gap-5 max-[760px]:mt-[25px] max-[760px]:block"
          >
            <p className="text-[30px] leading-[1.3] font-light max-[760px]:text-[29px]">
              O seu futuro
              <br />
              merece <span className="text-gold-light">presença.</span>
            </p>
            <span className="block border-l border-white/[0.18] pb-[3px] pl-6 text-[16px] leading-[1.7] opacity-80 max-[1100px]:pl-4 max-[760px]:mt-[15px] max-[760px]:border-0 max-[760px]:p-0">
              <strong>Segunda à Sexta:</strong> 8h30 às 19h00
              <br />
              <strong>Sábado:</strong> 9h00 às 13h00
            </span>
          </Enter>

          <Enter delay={900} className="mt-[34px] max-[760px]:mt-7">
            <MainCta onClick={() => openComposer()}>
              Vamos falar sobre seus direitos (WhatsApp)
            </MainCta>
          </Enter>
        </div>

        <Enter
          delay={1200}
          className="col-span-full mt-[35px] flex items-center justify-between self-end border-t border-white/[0.18] pt-[23px] max-[760px]:mt-[40px]"
        >
          <a
            href="#atuacao"
            className="group flex items-center gap-3.5 text-[15px] font-medium"
          >
            <span className="grid h-[44px] w-8 place-items-center rounded-[18px] border border-white/[0.18] transition group-hover:border-secondary">
              <svg
                viewBox="0 0 24 24"
                className="pr-arrow-float w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </span>{" "}
            Explore nossa atuação
          </a>
        </Enter>
      </div>
    </section>
  );
}

/* ───────────── seções ───────────── */

type PracticeChatOption = {
  id: string;
  title: string;
  question: string;
  summary: string;
  topic: Topic | null;
};

function Practice() {
  const [conversation, setConversation] = useState<PracticeChatOption[]>([]);
  const openComposer = useComposer();
  const practiceItems: PracticeChatOption[] = [
    ...SERVICES.map((service) => ({
      ...service,
      id: service.key,
      topic: service.key,
    })),
    ...PRACTICE_AREAS.map((service, index) => ({
      ...service,
      id: `practice-area-${index}`,
      topic: null,
    })),
  ];
  return (
    <section
      id="atuacao"
      className="scroll-mt-20 bg-white py-[110px] max-[760px]:py-[60px]"
    >
      <div className={CONTAINER}>
        <Reveal>
          <div className="grid grid-cols-[1fr_360px] gap-[26px] max-[1100px]:grid-cols-[1fr_270px] max-[760px]:grid-cols-1 max-[760px]:gap-5">
            <Eyebrow className="col-span-full text-secondary">
              02 / Onde podemos ajudar
            </Eyebrow>
            <SectionTitle className="max-[1100px]:text-[38px] max-[760px]:text-[32px]">
              Você vive a sua história.
              <br />
              <span>Nós cuidamos dos seus direitos.</span>
            </SectionTitle>
            <p className="self-end pb-[5px] text-[17px] leading-[1.75] text-muted-ink">
              Entre regras, documentos e decisões,
              <br />
              existe uma pessoa. E ela vem primeiro.
            </p>
          </div>
        </Reveal>

        <div className="mt-[60px] grid grid-cols-[1fr_2fr] gap-[70px] max-[1100px]:gap-[45px] max-[760px]:mt-[35px] max-[760px]:grid-cols-1 max-[760px]:gap-5">
          {/* Acompanha a rolagem enquanto a sanfona é mais alta que ele. */}
          <Reveal
            delay={100}
            className="sticky top-32 self-start max-[760px]:hidden"
          >
            <aside className="border-t border-hairline pt-7">
              <svg
                viewBox="0 0 24 24"
                className="pr-spin-in h-[70px] w-[70px] text-secondary"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                aria-hidden="true"
              >
                <path d="M19 5 5 19M9 5h10v10" />
              </svg>
              <p className="mt-[25px] text-[32px] leading-[1.3] font-light">
                Um novo olhar
                <br />
                para o seu
                <br />
                <span className="text-secondary">próximo capítulo.</span>
              </p>
              <InlineLink href="#duvidas">
                Conheça as dúvidas mais comuns
              </InlineLink>
            </aside>
          </Reveal>

          <div className="overflow-hidden border border-hairline bg-ivory/60">
            <div className="flex items-center gap-4 bg-primary px-6 py-5 text-white max-[480px]:px-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-secondary/50 text-secondary">
                <ChatIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold tracking-[1.6px] text-gold-light uppercase">
                  Tânia Melo Advocacia
                </p>
                <h3 className="mt-1 text-[19px] font-light">
                  Uma conversa para começar
                </h3>
              </div>
              <span className="ml-auto flex items-center gap-2 text-[11px] text-white/65">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-gold-light"
                  aria-hidden="true"
                />
                Atendimento
              </span>
            </div>

            <div className="space-y-5 px-6 py-6 max-[480px]:px-4">
              <div className="max-w-[88%] border border-hairline bg-white px-5 py-4 max-[480px]:max-w-full">
                <p className="text-[11px] font-semibold tracking-[1.2px] text-secondary uppercase">
                  Olá, que bom ter você aqui
                </p>
                <p className="mt-2 text-[15px] leading-[1.7] text-primary">
                  Escolha um tema para conhecer como podemos ajudar. Você pode
                  explorar quantas opções quiser.
                </p>
              </div>

              {conversation.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="space-y-4"
                  aria-live="polite"
                >
                  <p className="ml-auto w-fit max-w-[88%] bg-primary px-5 py-3 text-[14px] text-white max-[480px]:max-w-full">
                    {item.title}
                  </p>
                  <div className="max-w-[92%] border border-hairline bg-white px-5 py-4 max-[480px]:max-w-full">
                    <p className="text-[16px] leading-[1.7] font-medium text-primary">
                      {item.question}
                    </p>
                    <p className="mt-2 text-[15px] leading-[1.75] text-muted-ink">
                      {item.summary}
                    </p>
                    <button
                      type="button"
                      onClick={() => openComposer(item.topic ?? undefined)}
                      className={`group mt-4 flex items-center gap-2 text-[14px] font-medium text-secondary ${PRESS}`}
                    >
                      Conversar sobre meu caso
                      <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="border-t border-hairline pt-5">
                <p className="mb-3 text-[11px] font-semibold tracking-[1.4px] text-muted-ink uppercase">
                  Escolha uma opção
                </p>
                <ul className="grid grid-cols-2 gap-2 max-[480px]:grid-cols-1">
                  {practiceItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setConversation((current) => [...current, item])
                        }
                        className={`group flex min-h-11 w-full items-center justify-between gap-3 border border-hairline bg-white px-3 text-left text-[13px] leading-[1.4] text-primary transition hover:border-secondary hover:bg-white ${PRESS}`}
                      >
                        {item.title}
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-secondary transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** "Nossa essência": quem atende — a foto de um lado, a história e o que o atendimento promete do outro. */
function Manifesto() {
  const photoRef = useRef<HTMLDivElement>(null);
  useParallax(photoRef, 0.05);

  return (
    <section
      id="escritorio"
      className="scroll-mt-20 bg-ivory pt-[110px] text-primary max-[760px]:pt-[60px]"
    >
      <div
        className={`${CONTAINER} grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-x-[90px] gap-y-10 max-[1100px]:gap-x-[48px] max-[900px]:grid-cols-1`}
      >
        <Reveal>
          <figure className="mx-auto max-w-[520px] max-[900px]:max-w-[420px]">
            <div className="group relative">
              {/* A foto anda dentro da moldura com a rolagem; a ampliação cobre o vão que o deslocamento abriria. */}
              <div ref={photoRef} className="relative z-10 overflow-hidden">
                <div className="pr-drift scale-[1.12] [--drift-max:26px]">
                  <Image
                    src={ESSENCE_PHOTO.src}
                    alt={ESSENCE_PHOTO.alt}
                    width={ESSENCE_PHOTO.width}
                    height={ESSENCE_PHOTO.height}
                    sizes="(max-width: 900px) 420px, 520px"
                    className="aspect-[4/5] w-full object-cover object-[50%_100%] transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>
              </div>
              {/* Duas molduras deslocadas, em cantos opostos: saem de trás da foto quando ela entra em cena. */}
              <div
                className="pr-frame absolute top-[-20px] right-5 bottom-5 -left-5 border border-primary [--from-x:20px] [--from-y:20px] max-[760px]:top-[-12px] max-[760px]:right-3 max-[760px]:bottom-3 max-[760px]:-left-3"
                aria-hidden="true"
              />
              <div
                className="pr-frame absolute top-5 -right-5 bottom-[-20px] left-5 border border-secondary [--from-x:-20px] [--from-y:-20px] max-[760px]:top-3 max-[760px]:-right-3 max-[760px]:bottom-[-12px] max-[760px]:left-3"
                aria-hidden="true"
              />
            </div>
            <figcaption className="mt-[44px] text-[13px] font-medium tracking-[1.5px] text-secondary uppercase">
              Dra. Tânia Melo
            </figcaption>
          </figure>
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>01 / Nossa essência</Eyebrow>
          </Reveal>
          <Reveal>
            <h2 className="mt-[26px] text-[52px] leading-[1.1] font-light max-[760px]:text-[38px]">
              <ViewLine delay={100}>Uma advogada que entende</ViewLine>
              <ViewLine delay={220} className="text-secondary">
                o que você está passando
              </ViewLine>
            </h2>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-[28px] flex max-w-[560px] flex-col gap-4 text-[17px] leading-[1.8] text-muted-ink">
              <p>
                Há 16 anos sou advogada previdenciária. Deixei uma carreira de
                36 anos como gestora na administração pública para{" "}
                <strong className="font-medium text-primary">
                  inovar e expandir meu atendimento digitalmente
                </strong>
                .
              </p>
              <p>
                Ajudo você a entender a importância da aposentadoria, a
                contribuir corretamente e descubro direitos que você tem e o
                INSS não te conta. Tudo de forma simples e prática.
              </p>
            </div>
            <span
              className="pr-draw mt-[36px] block h-px max-w-[560px] bg-hairline"
              aria-hidden="true"
            />
            <dl className="mt-6 grid max-w-[560px] grid-cols-3 gap-x-6 max-[760px]:grid-cols-1 max-[760px]:gap-y-4">
              {[
                ["Tributário", "Advogada há 26 anos"],
                ["Processos", "Digitais e automatizados"],
                ["Atendimento", "Personalizado"],
              ].map(([label, value], index) => (
                <Reveal key={label} delay={450 + index * 120}>
                  <dt className="text-[12px] font-medium tracking-[1.5px] text-secondary uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1 text-[17px] leading-[1.35]">{value}</dd>
                </Reveal>
              ))}
            </dl>
            <div className="mt-[36px]">
              <MainCta href="#como-funciona">
                Conheça o caminho do seu caso
              </MainCta>
            </div>
          </Reveal>
        </div>
      </div>

      {/* A faixa de destaques: de ponta a ponta, colada na base da seção; o número em dourado e, embaixo, o que ele conta. */}
      <div className="mt-[90px] bg-primary text-white max-[900px]:mt-[60px]">
        <ul
          className={`${CONTAINER} grid grid-cols-5 gap-12 max-[900px]:grid-cols-2 max-[480px]:grid-cols-1`}
        >
          {ESSENCE_STATS.map((stat, index) => (
            <li
              key={stat.value}
              className="group border-l border-white/15 px-8 py-10 first:border-l-0 first:pl-0 max-[900px]:nth-[odd]:border-l-0 max-[900px]:nth-[odd]:pl-0 max-[900px]:nth-[n+3]:border-t max-[480px]:border-l-0 max-[480px]:px-0 max-[480px]:not-first:border-t max-[480px]:py-7"
            >
              <Reveal delay={index * 120} className="flex flex-col gap-3">
                <p className="text-[52px] leading-none font-light text-secondary tabular-nums transition-transform duration-300 group-hover:translate-x-2 max-[760px]:text-[44px]">
                  <CountUp value={stat.value} delay={index * 120 + 200} />
                </p>
                <p className="text-[13px] leading-[1.5] font-semibold tracking-[1.5px] text-white/85 uppercase">
                  {stat.label}
                </p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Journey() {
  const stepsRef = useRef<HTMLOListElement>(null);
  useParallax(stepsRef, 0.05);

  return (
    <section
      id="como-funciona"
      className="scroll-mt-20 bg-ivory py-[110px] max-[760px]:py-[60px]"
    >
      <div className={CONTAINER}>
        <Reveal>
          <Eyebrow>03 / Um passo de cada vez</Eyebrow>
          <SectionTitle className="mt-[22px] max-[760px]:text-[32px]">
            Clareza para decidir.
            <br />
            <span>Confiança para seguir.</span>
          </SectionTitle>
        </Reveal>
        <ol
          ref={stepsRef}
          className="mt-[55px] grid grid-cols-3 gap-[45px] max-[1100px]:grid-cols-2 max-[760px]:mt-[30px] max-[760px]:grid-cols-1 max-[760px]:gap-[30px]"
        >
          {JOURNEY.map((step, index) => (
            // Colunas em sentidos opostos: a grade se desencontra e se encaixa ao rolar. Numa coluna só, não há com quem se desencontrar.
            <li
              key={step.key}
              className="pr-drift [--drift-max:18px] max-[760px]:[--drift:0] min-[761px]:max-[1100px]:nth-[2n]:[--drift:-1] min-[1101px]:nth-[3n+2]:[--drift:-1]"
            >
              <Reveal delay={(index % 3) * 120} className="group">
                <span
                  className="pr-draw block h-px bg-hairline"
                  aria-hidden="true"
                />
                <div className="pt-[27px] transition duration-300 group-hover:-translate-y-1">
                  <span className="text-[44px] font-light text-secondary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-[18px] mb-[13px] text-[25px] max-[760px]:mt-[12px]">
                    {step.title}
                  </h3>
                  <p className="text-[17px] leading-[1.75] text-muted-ink">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Questions() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section
      id="duvidas"
      className="scroll-mt-20 bg-white py-[110px] max-[760px]:py-[60px]"
    >
      <div className={CONTAINER}>
        <Reveal>
          <div className="grid grid-cols-[1fr_360px] gap-[26px] max-[1100px]:grid-cols-[1fr_270px] max-[760px]:grid-cols-1 max-[760px]:gap-5">
            <Eyebrow className="col-span-full text-secondary">
              04 / Dúvidas frequentes
            </Eyebrow>
            <SectionTitle className="max-[760px]:text-[32px]">
              Perguntas que chegam todo dia.
              <br />
              <span>Respostas sem juridiquês.</span>
            </SectionTitle>
            <p className="self-end pb-[5px] text-[17px] leading-[1.75] text-muted-ink">
              Informações gerais. Cada caso exige análise individual.
            </p>
          </div>
        </Reveal>
        <div className="mt-[60px] border-b border-hairline max-[760px]:mt-[35px]">
          {FAQ.map((item, index) => (
            <Reveal key={item.question} delay={index * 60}>
              <AccordionRow
                number={String(index + 1).padStart(2, "0")}
                title={item.question}
                isOpen={open === index}
                onToggle={() => setOpen(open === index ? null : index)}
              >
                <p className="max-w-[700px] text-[17px] leading-[1.8] text-muted-ink">
                  {item.answer}
                </p>
              </AccordionRow>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCall() {
  const ref = useRef<HTMLElement>(null);
  const openComposer = useComposer();
  useParallax(ref, 0.08);

  return (
    <section
      ref={ref}
      id="contato"
      className="scroll-mt-20 overflow-hidden bg-primary py-[90px] text-white max-[760px]:py-[60px]"
    >
      <div
        className={`${CONTAINER} flex items-center justify-between gap-[35px] max-[760px]:block`}
      >
        {/* Texto e círculo derivam em sentidos opostos, o círculo mais; empilhados no celular, ficam parados. */}
        <Reveal>
          <div className="pr-drift [--drift:0.5] max-[760px]:[--drift:0]">
            <Eyebrow className="text-gold-light">
              O próximo capítulo começa aqui
            </Eyebrow>
            <h2 className="mt-[30px] text-[76px] leading-[1.06] font-light max-[760px]:text-[46px]">
              Vamos olhar para
              <br />o seu <span className="text-gold-light">futuro?</span>
            </h2>
            <ChannelList
              className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-[17px]"
              itemClassName="flex items-center gap-3 opacity-85 transition hover:opacity-100"
              iconClassName="h-5 w-5 shrink-0 text-gold-light"
              labelClassName="sr-only"
              emptyClassName="mt-8 text-[15px] opacity-70"
            />
          </div>
        </Reveal>
        <Reveal delay={200} className="shrink-0">
          <div className="pr-drift [--drift:-0.8] max-[760px]:[--drift:0]">
            <button
              type="button"
              onClick={() => openComposer()}
              className="pr-orbit group relative flex h-44 w-44 flex-col items-center justify-center gap-4 rounded-full border border-secondary transition duration-500 hover:bg-secondary active:scale-95 max-[760px]:mt-[36px] max-[760px]:h-[140px] max-[760px]:w-[140px]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-10 w-10 transition duration-500 group-hover:rotate-45 max-[760px]:h-8 max-[760px]:w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 5H19V11" />
                <path d="M19 5L5 19" />
              </svg>
              <span className="text-[15px] font-medium">Vamos conversar</span>
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const openComposer = useComposer();
  return (
    <footer className="border-t border-hairline bg-ivory">
      <div
        className={`${CONTAINER} grid grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-x-[90px] gap-y-10 py-[90px] max-[900px]:grid-cols-1 max-[760px]:py-[60px]`}
      >
        <Reveal>
          <Eyebrow>Nas redes</Eyebrow>
          <h2 className="mt-[26px] text-[40px] leading-[1.15] font-light max-[760px]:text-[32px]">
            <ViewLine delay={100}>Acompanhe o escritório</ViewLine>
            <ViewLine delay={220} className="text-secondary">
              de perto
            </ViewLine>
          </h2>
        </Reveal>
        {/* Um índice, não uma fileira de ícones: cada rede é uma linha com o nome grande; o fio se desenha ao entrar. */}
        <ul>
          {SITE_SOCIALS.map((social, index) => (
            <li key={social.name}>
              <Reveal delay={index * 120}>
                <span
                  className="pr-draw block h-px bg-hairline"
                  aria-hidden="true"
                />
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${social.name}, ${social.handle} (abre em outra aba)`}
                  className="group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-5 py-7 max-[760px]:grid-cols-[28px_minmax(0,1fr)_auto] max-[760px]:py-5"
                >
                  <span
                    className="text-[13px] font-medium tracking-[2px] text-secondary"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[44px] leading-[1.1] font-light transition-transform duration-300 group-hover:translate-x-3 max-[760px]:text-[30px]">
                      {social.name}
                    </span>
                    <span className="mt-1 block truncate text-[15px] text-muted-ink transition-transform duration-300 group-hover:translate-x-3">
                      {social.handle}
                    </span>
                  </span>
                  <span className="grid h-14 w-14 place-items-center rounded-full border border-secondary text-secondary transition duration-500 group-hover:bg-secondary group-hover:text-white group-active:scale-95 max-[760px]:h-11 max-[760px]:w-11">
                    <ArrowUpRight className="h-5 w-5 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </a>
              </Reveal>
            </li>
          ))}
          <li aria-hidden="true">
            <Reveal delay={SITE_SOCIALS.length * 120}>
              <span className="pr-draw block h-px bg-hairline" />
            </Reveal>
          </li>
        </ul>
      </div>
      <div className="border-t border-hairline">
        <div
          className={`${CONTAINER} flex items-center justify-between gap-5 py-[38px] max-[760px]:flex-col max-[760px]:items-start`}
        >
          <p className="text-[16px]">
            Tânia Melo <span className="text-secondary">/</span> Advocacia
            previdenciária
            {SITE_CONTACT.oab && (
              <span className="text-muted-ink"> · {SITE_CONTACT.oab}</span>
            )}
          </p>
          <p className="text-[14px] text-muted-ink">
            Informações gerais. Cada caso exige análise individual.
          </p>
          <div className="flex items-center gap-6 text-[15px]">
            <Link
              href={publicRoutes.login}
              className="text-muted-ink transition hover:text-primary underline decoration-1 decoration-secondary underline-offset-2"
            >
              Área da equipe
            </Link>
            <button
              type="button"
              onClick={() => openComposer()}
              className={`group flex items-center gap-2 ${PRESS}`}
            >
              Contato{" "}
              <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ───────────── peças ───────────── */

function SectionTitle({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <h2
      className={`text-[46px] leading-[1.2] [&>span]:font-light [&>span]:text-muted-ink ${className}`}
    >
      {children}
    </h2>
  );
}

/** O botão dourado: com `href` é link de página; com `onClick`, abre a conversa. */
function MainCta({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className = `pr-shine group relative inline-flex min-h-[56px] items-center gap-6 overflow-hidden bg-secondary px-6 py-4 text-[16px] font-medium text-white hover:-translate-y-0.5 max-[760px]:gap-4 max-[760px]:px-5 max-[760px]:text-[15px] ${PRESS}`;
  const body = (
    <>
      {children}
      <ArrowUpRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
    </>
  );
  return href ? (
    <a href={href} className={className}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function InlineLink({
  href,
  children,
}: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <a
      href={href}
      className="group mt-[33px] flex items-center gap-4 text-[16px] whitespace-nowrap"
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
        {children}
      </span>
      <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

/** Sanfona que abre deslizando; o "+" vira "−" girando. */
function AccordionRow({
  number,
  title,
  isOpen,
  onToggle,
  children,
}: Readonly<{
  number: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}>) {
  const panelId = useId();
  return (
    <div className="border-t border-hairline">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="group flex w-full items-center gap-[23px] py-[28px] text-left max-[760px]:gap-3 max-[760px]:py-[22px]"
      >
        <span className="w-6 shrink-0 text-[13px] text-secondary">
          {number}
        </span>
        <h3 className="flex-1 text-[26px] transition-transform duration-300 group-hover:translate-x-2 max-[760px]:text-[21px]">
          {title}
        </h3>
        <span
          className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition duration-300 group-active:scale-90 max-[760px]:h-9 max-[760px]:w-9 ${
            isOpen
              ? "border-primary bg-primary text-white"
              : "border-hairline group-hover:border-secondary"
          }`}
          aria-hidden="true"
        >
          <span className="absolute h-px w-3.5 bg-current" />
          <span
            className={`absolute h-3.5 w-px bg-current transition-transform duration-300 ${isOpen ? "rotate-90 scale-y-0" : ""}`}
          />
        </span>
      </button>
      <div
        id={panelId}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="pr-[45px] pb-[30px] pl-[47px] max-[760px]:pr-5 max-[760px]:pl-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
