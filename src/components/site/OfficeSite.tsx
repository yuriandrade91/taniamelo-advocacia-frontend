"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { publicRoutes } from "@/constants/paths/routes";
import type { BenefitKey } from "@/enums/benefit/Benefits";
import { Reveal } from "./Reveal";
import { GRADES, SEXES, useDisabilityRule } from "./disabilityRule";
import { FAQ, JOURNEY, NAV_LINKS, SERVICES, SITE_CONTACT, whatsappHref } from "./siteContent";
import { ArrowUpRightIcon as ArrowUpRight, ChatIcon, CloseIcon, MenuIcon } from "./siteIcons";
import { ChannelList, ChoicePills, Logo, shortBenefit, usePrefersReducedMotion } from "./shared";

const SCULPTURE = {
  src: "/photos/justice-sculpture.jpg",
  alt: "Escultura dourada de uma balança da justiça em um ambiente azul profundo",
};
const ARCHITECTURE = {
  src: "/photos/justice-architecture.jpg",
  alt: "Arquitetura contemporânea aberta para o horizonte, com uma balança da justiça",
};

/** A largura de tudo: 1400 px no máximo, com as margens da referência em cada faixa de tela. */
const CONTAINER = "mx-auto w-[min(1400px,calc(100%-100px))] max-[1100px]:w-[calc(100%-64px)] max-[760px]:w-[calc(100%-40px)]";

/** Clique que afunda um pouco: o retorno de toque de todo botão da página. */
const PRESS = "transition active:scale-[0.97]";

/**
 * O site do escritório, no desenho feito no Lovable: o nome enorme sobre a
 * cena azul com a balança dourada, as áreas em sanfona, "Nossa essência" sobre
 * a arquitetura, os passos numerados e o fechamento azul com o botão redondo.
 * O conteúdo é o do escritório: os sete benefícios, as seis etapas, o
 * simulador da LC 142, as dúvidas e os canais de contato.
 *
 * Todo "falar com a equipe" abre a mesma janela: a pessoa escolhe a
 * aposentadoria, recebe a mensagem já escrita e ajusta antes de ir para o
 * WhatsApp — ou escreve do zero.
 */
export function OfficeSite() {
  const [composer, setComposer] = useState<{ topic: Topic } | null>(null);
  const openComposer = (topic: Topic = "none") => setComposer({ topic });

  return (
    <ComposerContext.Provider value={openComposer}>
      <div className="min-h-screen bg-ivory text-primary">
        <Header />
        <Hero />
        <Practice />
        <Manifesto />
        <Journey />
        <Simulator />
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
        {composer && <WhatsAppComposer key={composer.topic} initialTopic={composer.topic} onClose={() => setComposer(null)} />}
      </div>
    </ComposerContext.Provider>
  );
}

/* ───────────── a conversa pelo WhatsApp ───────────── */

/** O assunto da mensagem: uma das aposentadorias, "ainda não sei", ou o texto da própria pessoa. */
type Topic = BenefitKey | "unsure" | "own" | "none";

const ComposerContext = createContext<(topic?: Topic) => void>(() => {});
const useComposer = () => useContext(ComposerContext);

const TOPICS: readonly { id: Topic; label: string }[] = [
  ...SERVICES.map((service) => ({ id: service.key as Topic, label: shortBenefit(service.title) })),
  { id: "unsure", label: "Ainda não sei" },
  { id: "own", label: "Escrever do meu jeito" },
];

/** O texto pronto de cada assunto. "Escrever do meu jeito" começa em branco. */
function messageFor(topic: Topic) {
  if (topic === "own") return "";
  if (topic === "unsure") {
    return "Olá! Vim pelo site e gostaria de uma orientação. Ainda não sei qual aposentadoria se encaixa no meu caso.";
  }
  const service = SERVICES.find((item) => item.key === topic);
  if (!service) return "Olá! Vim pelo site e gostaria de conversar sobre a minha aposentadoria.";
  return `Olá! Vim pelo site e gostaria de conversar sobre ${service.title.toLowerCase()}. Quero entender se tenho direito e quais são os próximos passos.`;
}

/** "21988275421" → "(21) 98827-5421". */
const formattedWhatsapp = SITE_CONTACT.whatsapp.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

/**
 * A janela do "falar com a equipe". `<dialog>` de verdade: Esc fecha, o foco
 * fica dentro e o resto da página não recebe clique.
 */
function WhatsAppComposer({ initialTopic, onClose }: { initialTopic: Topic; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [message, setMessage] = useState(() => messageFor(initialTopic));
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const choose = (next: Topic) => {
    setTopic(next);
    setMessage(messageFor(next));
    if (next === "own") requestAnimationFrame(() => textRef.current?.focus());
  };

  const trimmed = message.trim();
  const sendClassName = `group inline-flex min-h-[54px] items-center gap-4 bg-secondary px-6 text-base font-medium text-white ${PRESS}`;
  const sendLabel = (
    <>
      Enviar pelo WhatsApp
      <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
      className="pr-dialog m-auto w-[min(600px,calc(100%-32px))] max-w-none bg-ivory p-0 text-primary backdrop:bg-midnight/70 backdrop:backdrop-blur-sm"
    >
      <div className="max-h-[calc(100svh-48px)] overflow-y-auto p-8 max-[760px]:p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Eyebrow>Falar com a equipe</Eyebrow>
            <h2 id={titleId} className="mt-4 text-[34px] leading-[1.15] font-light max-[760px]:text-[28px]">
              Sobre qual aposentadoria
              <br />
              <span className="text-secondary">você quer conversar?</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Fechar"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline hover:rotate-90 hover:border-primary ${PRESS}`}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <ChoicePills
          legend="Escolha o assunto e a mensagem já vem escrita"
          options={TOPICS}
          value={topic}
          onChange={choose}
          className="mt-7"
          legendClassName="text-[15px] text-muted-ink"
          groupClassName="mt-4 flex flex-wrap gap-2"
          optionClassName={(isActive) =>
            `${PRESS} rounded-full border px-4 py-2.5 text-[15px] ${
              isActive ? "border-primary bg-primary text-white" : "border-hairline bg-white hover:border-secondary"
            }`
          }
        />

        <label htmlFor={textId} className="mt-7 block text-[13px] font-medium tracking-[1.5px] text-secondary uppercase">
          Sua mensagem
        </label>
        <textarea
          id={textId}
          ref={textRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          placeholder="Conte com suas palavras: qual aposentadoria, há quanto tempo contribui, o que aconteceu…"
          className="mt-3 w-full resize-y border border-hairline bg-white p-4 text-base leading-[1.7] transition outline-none focus:border-secondary"
        />
        <p className="mt-2 text-[14px] text-muted-ink">Pode mudar o texto como quiser antes de enviar.</p>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[14px] text-muted-ink">WhatsApp {formattedWhatsapp}</span>
          {trimmed ? (
            <a
              href={whatsappHref(trimmed)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => dialogRef.current?.close()}
              className={sendClassName}
            >
              {sendLabel}
            </a>
          ) : (
            <button type="button" disabled className={`${sendClassName} cursor-not-allowed opacity-45`}>
              {sendLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

/* ───────────── movimento ───────────── */

/**
 * Desloca `--parallax-y` no elemento conforme ele passa pela tela: a imagem
 * anda mais devagar que a página. Sem efeito com "reduzir movimento".
 */
function useParallax(ref: RefObject<HTMLElement | null>, factor: number) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
      node.style.setProperty("--parallax-y", `${(-offset * factor).toFixed(1)}px`);
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
function RisingLine({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <span className="pr-line">
      <span style={{ "--d": `${delay}ms` } as CSSProperties}>{children}</span>
    </span>
  );
}

/** Como a `RisingLine`, mas sobe quando o `Reveal` em volta chega à tela. */
function ViewLine({ delay, className = "", children }: { delay: number; className?: string; children: ReactNode }) {
  return (
    <span className="pr-vline">
      <span className={className} style={{ "--d": `${delay}ms` } as CSSProperties}>
        {children}
      </span>
    </span>
  );
}

/** Entrada da cena do topo, em cascata pelo `delay`. */
function Enter({ delay, className = "", children }: { delay: number; className?: string; children: ReactNode }) {
  return (
    <div className={`pr-in ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
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
      progressRef.current?.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`);
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
        <a href="#inicio" aria-label="Tânia Melo Advocacia — início" className="pr-drop" style={{ "--d": "0ms" } as CSSProperties}>
          <Logo
            tone="gold"
            decorative
            className="h-[98px] w-[182px] object-contain transition-all duration-500 group-data-[scrolled=true]:h-[70px] group-data-[scrolled=true]:w-[130px] max-[1100px]:h-[78px] max-[1100px]:w-[140px] max-[1100px]:group-data-[scrolled=true]:h-[60px] max-[1100px]:group-data-[scrolled=true]:w-[112px]"
          />
        </a>
        <nav aria-label="Principal" className="flex items-center gap-10 max-[1280px]:gap-7 max-[1100px]:hidden">
          {NAV_LINKS.filter((link) => link.href !== "#contato").map((link, index) => (
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
          Vamos conversar
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
          {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>
      {isMenuOpen && (
        <nav id="site-menu" aria-label="Menu" className="pr-menu flex flex-col gap-1 bg-midnight px-5 pt-4 pb-8 min-[1101px]:hidden">
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
      <span ref={progressRef} className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-secondary" aria-hidden="true" />
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
      <Image src={SCULPTURE.src} alt={SCULPTURE.alt} fill preload sizes="100vw" className="pr-scene -z-20 object-cover max-[760px]:object-[67%_center]" />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-primary)_45%,transparent),transparent_65%)] max-[760px]:bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-primary)_80%,transparent),color-mix(in_oklch,var(--color-primary)_25%,transparent))]"
        aria-hidden="true"
      />

      <div className={`${CONTAINER} relative grid h-full min-h-[inherit] grid-cols-[1fr_190px] pt-[150px] pb-[34px] min-[1600px]:pt-[175px] max-[760px]:block max-[760px]:pt-[125px] max-[760px]:pb-[26px]`}>
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

          <Enter delay={700} className="mt-[27px] flex items-end gap-[35px] max-[1100px]:gap-5 max-[760px]:mt-[25px] max-[760px]:block">
            <p className="text-[30px] leading-[1.3] font-light max-[760px]:text-[29px]">
              O seu futuro
              <br />
              merece <span className="text-gold-light">presença.</span>
            </p>
            <span className="block border-l border-white/[0.18] pb-[3px] pl-6 text-[16px] leading-[1.7] opacity-80 max-[1100px]:pl-4 max-[760px]:mt-[15px] max-[760px]:border-0 max-[760px]:p-0">
              Direito previdenciário com estratégia,
              <br />
              escuta e respeito à sua história.
            </span>
          </Enter>

          <Enter delay={900} className="mt-[34px] max-[760px]:mt-7">
            <MainCta onClick={() => openComposer()}>Vamos falar sobre seus direitos</MainCta>
          </Enter>
        </div>

        <Enter delay={1100} className="flex items-center gap-[18px] self-start justify-self-end pt-[42px] max-[760px]:hidden">
          <span className="text-[12px] leading-[2.2] tracking-[2px] opacity-75 [writing-mode:vertical-rl]" aria-hidden="true">
            ESTRATÉGIA JURÍDICA.
            <br />
            CUIDADO HUMANO.
          </span>
          <span className="pr-grow-y h-[150px] w-px origin-top bg-secondary" aria-hidden="true" />
        </Enter>

        <Enter delay={1200} className="col-span-full mt-[35px] flex items-center justify-between self-end border-t border-white/[0.18] pt-[23px] max-[760px]:mt-[40px]">
          <a href="#atuacao" className="group flex items-center gap-3.5 text-[15px] font-medium">
            <span className="grid h-[44px] w-8 place-items-center rounded-[18px] border border-white/[0.18] transition group-hover:border-secondary">
              <svg viewBox="0 0 24 24" className="pr-arrow-float w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </span>
            Explore nossa atuação
          </a>
          <span className="mr-[50px] text-[15px] opacity-70 max-[760px]:hidden">Cada história é única. Nossa atenção também.</span>
        </Enter>
      </div>
    </section>
  );
}

/* ───────────── seções ───────────── */

function Practice() {
  const [open, setOpen] = useState<string | null>(SERVICES[0].key);
  const openComposer = useComposer();
  return (
    <section id="atuacao" className="scroll-mt-20 bg-ivory py-[110px] max-[760px]:py-[60px]">
      <div className={CONTAINER}>
        <Reveal>
          <div className="grid grid-cols-[1fr_360px] gap-[26px] max-[1100px]:grid-cols-[1fr_270px] max-[760px]:grid-cols-1 max-[760px]:gap-5">
            <Eyebrow className="col-span-full text-secondary">01 / Onde podemos ajudar</Eyebrow>
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
          <Reveal delay={100} className="max-[760px]:hidden">
            <aside className="border-t border-hairline pt-7">
              <svg viewBox="0 0 24 24" className="pr-spin-in h-[70px] w-[70px] text-secondary" fill="none" stroke="currentColor" strokeWidth="0.8" aria-hidden="true">
                <path d="M19 5 5 19M9 5h10v10" />
              </svg>
              <p className="mt-[25px] text-[32px] leading-[1.3] font-light">
                Um novo olhar
                <br />
                para o seu
                <br />
                <span className="text-secondary">próximo capítulo.</span>
              </p>
              <InlineLink href="#duvidas">Conheça as dúvidas mais comuns</InlineLink>
            </aside>
          </Reveal>

          <div className="border-b border-hairline">
            {SERVICES.map((service, index) => (
              <Reveal key={service.key} delay={index * 70}>
                <AccordionRow
                  number={String(index + 1).padStart(2, "0")}
                  title={service.title}
                  isOpen={open === service.key}
                  onToggle={() => setOpen(open === service.key ? null : service.key)}
                >
                  <p className="max-w-[560px] text-[17px] leading-[1.8] text-muted-ink">
                    {service.question} {service.summary}
                  </p>
                  <button
                    type="button"
                    onClick={() => openComposer(service.key)}
                    className={`group mt-5 flex items-center gap-3 text-[16px] font-medium text-secondary ${PRESS}`}
                  >
                    Conversar sobre meu caso
                    <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                </AccordionRow>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** "Nossa essência": o texto sobre a arquitetura, que corre mais devagar que a página. */
function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  useParallax(ref, 0.1);
  return (
    <section id="escritorio" ref={ref} className="relative isolate scroll-mt-20 overflow-hidden text-primary">
      <Image src={ARCHITECTURE.src} alt={ARCHITECTURE.alt} fill sizes="100vw" className="pr-parallax -z-20 object-cover max-[760px]:object-[65%_center]" />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--color-ivory)_83%,transparent),transparent_70%)] max-[760px]:bg-[color-mix(in_oklch,var(--color-ivory)_83%,transparent)]"
        aria-hidden="true"
      />
      <div className={`${CONTAINER} py-[110px] max-[760px]:py-[70px]`}>
        <Reveal>
          <Eyebrow>02 / Nossa essência</Eyebrow>
        </Reveal>
        <Reveal>
          <h2 className="mt-[30px] text-[76px] leading-[1.06] font-light max-[760px]:text-[54px]">
            <ViewLine delay={100}>Não é só</ViewLine>
            <ViewLine delay={220}>sobre leis.</ViewLine>
            <ViewLine delay={340} className="text-secondary">
              É sobre você.
            </ViewLine>
          </h2>
        </Reveal>
        <Reveal delay={380}>
          <p className="my-[28px] text-[18px] leading-[1.7]">
            A orientação jurídica começa com escuta.
            <br />
            E se constrói com análise, clareza e cuidado.
          </p>
          <MainCta href="#como-funciona">Conheça o caminho do seu caso</MainCta>
        </Reveal>
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-ivory py-[110px] max-[760px]:py-[60px]">
      <div className={CONTAINER}>
        <Reveal>
          <div className="flex items-end justify-between gap-[35px] max-[760px]:block">
            <div>
              <Eyebrow>03 / Um passo de cada vez</Eyebrow>
              <SectionTitle className="mt-[22px] max-[760px]:text-[32px]">
                Clareza para decidir.
                <br />
                <span>Confiança para seguir.</span>
              </SectionTitle>
            </div>
            <InlineLink href="#duvidas">Informação que aproxima</InlineLink>
          </div>
        </Reveal>
        <ol className="mt-[55px] grid grid-cols-3 gap-[45px] max-[1100px]:grid-cols-2 max-[760px]:mt-[30px] max-[760px]:grid-cols-1 max-[760px]:gap-[30px]">
          {JOURNEY.map((step, index) => (
            <li key={step.key}>
              <Reveal delay={(index % 3) * 120} className="group">
                <span className="pr-draw block h-px bg-hairline" aria-hidden="true" />
                <div className="pt-[27px] transition duration-300 group-hover:-translate-y-1">
                  <span className="text-[44px] font-light text-secondary">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-[18px] mb-[13px] text-[25px] max-[760px]:mt-[12px]">{step.title}</h3>
                  <p className="text-[17px] leading-[1.75] text-muted-ink">{step.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** O simulador da LC 142 no desenho da referência: fios, números finos, botões retos. */
function Simulator() {
  const { sex, setSex, grade, setGrade, required, general, saved, minAge } = useDisabilityRule();
  const option = (isActive: boolean) =>
    `${PRESS} border px-5 py-3.5 text-[15px] font-medium ${isActive ? "border-primary bg-primary text-white" : "border-hairline bg-white hover:border-primary/40"}`;
  const legend = "text-[13px] font-medium tracking-[1.7px] text-secondary uppercase";
  return (
    <section id="simulador" className="scroll-mt-20 border-t border-hairline bg-white py-[110px] max-[760px]:py-[60px]">
      <div className={CONTAINER}>
        <Reveal>
          <Eyebrow>04 / Simulador PcD · LC 142/2013</Eyebrow>
        </Reveal>
        <div className="mt-[22px] grid grid-cols-[1fr_1fr] gap-[70px] max-[1100px]:gap-[45px] max-[760px]:grid-cols-1 max-[760px]:gap-8">
          <Reveal delay={100}>
            <SectionTitle className="max-[760px]:text-[32px]">
              Com deficiência,
              <br />
              <span>o tempo exigido é menor.</span>
            </SectionTitle>
            <div className="mt-10 flex flex-col gap-6">
              <ChoicePills legend="Para quem" options={SEXES} value={sex} onChange={setSex} legendClassName={legend} groupClassName="mt-3 flex flex-wrap gap-2" optionClassName={option} />
              <ChoicePills legend="Grau da deficiência" options={GRADES} value={grade} onChange={setGrade} legendClassName={legend} groupClassName="mt-3 flex flex-wrap gap-2" optionClassName={option} />
            </div>
          </Reveal>
          <Reveal delay={220}>
            <div aria-live="polite" className="border-t border-hairline pt-[27px]">
              <p className="text-[13px] font-medium tracking-[1.7px] text-muted-ink uppercase">Tempo de contribuição exigido</p>
              <p className="mt-2 text-[120px] leading-none font-light text-secondary max-[760px]:text-[88px]">
                <span key={required} className="pr-pop inline-block">
                  {required}
                </span>
                <span className="ml-3 text-[30px] text-primary">anos</span>
              </p>
              <p className="mt-4 text-[24px] font-light">
                {saved} anos a menos <span className="text-muted-ink">que os {general} da regra geral.</span>
              </p>
              <p className="mt-5 max-w-[520px] text-[17px] leading-[1.75] text-muted-ink">
                Por idade: {minAge} anos, com 15 de contribuição na condição de pessoa com deficiência. O grau vem da
                avaliação do INSS, e quem trabalhou em graus diferentes tem o tempo convertido.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Questions() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="duvidas" className="scroll-mt-20 bg-ivory py-[110px] max-[760px]:py-[60px]">
      <div className={CONTAINER}>
        <Reveal>
          <div className="grid grid-cols-[1fr_360px] gap-[26px] max-[1100px]:grid-cols-[1fr_270px] max-[760px]:grid-cols-1 max-[760px]:gap-5">
            <Eyebrow className="col-span-full text-secondary">05 / Dúvidas frequentes</Eyebrow>
            <SectionTitle className="max-[760px]:text-[32px]">
              Perguntas que chegam todo dia.
              <br />
              <span>Respostas sem juridiquês.</span>
            </SectionTitle>
            <p className="self-end pb-[5px] text-[17px] leading-[1.75] text-muted-ink">Informações gerais. Cada caso exige análise individual.</p>
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
                <p className="max-w-[700px] text-[17px] leading-[1.8] text-muted-ink">{item.answer}</p>
              </AccordionRow>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCall() {
  const openComposer = useComposer();
  return (
    <section id="contato" className="scroll-mt-20 overflow-hidden bg-primary py-[90px] text-white max-[760px]:py-[60px]">
      <div className={`${CONTAINER} flex items-center justify-between gap-[35px] max-[760px]:block`}>
        <Reveal>
          <Eyebrow className="text-gold-light">O próximo capítulo começa aqui</Eyebrow>
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
        </Reveal>
        <Reveal delay={200} className="shrink-0">
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
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const openComposer = useComposer();
  return (
    <footer className="border-t border-hairline bg-ivory py-[38px]">
      <div className={`${CONTAINER} flex items-center justify-between gap-5 max-[760px]:flex-col max-[760px]:items-start`}>
        <p className="text-[16px]">
          Tânia Melo <span className="text-secondary">/</span> Advocacia previdenciária
          {SITE_CONTACT.oab && <span className="text-muted-ink"> · {SITE_CONTACT.oab}</span>}
        </p>
        <p className="text-[14px] text-muted-ink">Informações gerais. Cada caso exige análise individual.</p>
        <div className="flex items-center gap-6 text-[15px]">
          <Link href={publicRoutes.login} className="text-muted-ink transition hover:text-primary">
            Área da equipe
          </Link>
          <button type="button" onClick={() => openComposer()} className={`group flex items-center gap-2 ${PRESS}`}>
            Contato <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}

/* ───────────── peças ───────────── */

/** O sobretítulo; o fio na frente é só o do topo. */
function Eyebrow({ children, className = "text-secondary", line = false }: { children: ReactNode; className?: string; line?: boolean }) {
  return (
    <p className={`flex items-center gap-3.5 text-[13px] font-medium tracking-[2px] uppercase max-[760px]:text-[12px] max-[760px]:tracking-[1.5px] ${className}`}>
      {line && <span className="pr-grow-x h-px w-10 origin-left bg-current" aria-hidden="true" />}
      {children}
    </p>
  );
}

function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-[46px] leading-[1.2] [&>span]:font-light [&>span]:text-muted-ink ${className}`}>{children}</h2>;
}

/** O botão dourado: com `href` é link de página; com `onClick`, abre a conversa. */
function MainCta({ href, onClick, children }: { href?: string; onClick?: () => void; children: ReactNode }) {
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

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group mt-[33px] flex items-center gap-4 text-[16px] whitespace-nowrap">
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
}: {
  number: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
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
        <span className="w-6 shrink-0 text-[13px] text-secondary">{number}</span>
        <h3 className="flex-1 text-[26px] transition-transform duration-300 group-hover:translate-x-2 max-[760px]:text-[21px]">{title}</h3>
        <span
          className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition duration-300 group-active:scale-90 max-[760px]:h-9 max-[760px]:w-9 ${
            isOpen ? "border-primary bg-primary text-white" : "border-hairline group-hover:border-secondary"
          }`}
          aria-hidden="true"
        >
          <span className="absolute h-px w-3.5 bg-current" />
          <span className={`absolute h-3.5 w-px bg-current transition-transform duration-300 ${isOpen ? "rotate-90 scale-y-0" : ""}`} />
        </span>
      </button>
      <div
        id={panelId}
        inert={!isOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="pr-[45px] pb-[30px] pl-[47px] max-[760px]:pr-5 max-[760px]:pl-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
