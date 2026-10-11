"use client";

import { useId, useSyncExternalStore, type ComponentType } from "react";
import Image from "next/image";
import svgPaths from "@/constants/svg/paths";
import type { IconProps } from "@/components/ui/icons/Svg";
import { SITE_CONTACT, SITE_NAME, contactHref } from "./siteContent";
import { ChatIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon } from "./siteIcons";

/** As peças pequenas do site: o que não é seção, mas a página usa em mais de um lugar. */

/** "Reduzir movimento" ligado no sistema. As animações em JS consultam isto; as de CSS, o `site.css`. */
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeReduced = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** "Aposentadoria por tempo de contribuição" → "Tempo de contribuição": para rótulo onde o espaço é curto. */
export function shortBenefit(title: string) {
  const short = title.replace(/^Aposentadoria\s+(por\s+|do\s+|da\s+)?/i, "");
  return short.charAt(0).toUpperCase() + short.slice(1);
}

/** A marca do escritório: dourada sobre fundo escuro, azul sobre claro. */
export function Logo({ tone = "gold", className = "h-11 w-auto", decorative = false }: { tone?: "gold" | "blue"; className?: string; decorative?: boolean }) {
  return (
    <Image
      src={tone === "gold" ? svgPaths.LOGOS.GOLD : svgPaths.LOGOS.BLUE}
      alt={decorative ? "" : SITE_NAME}
      width={112}
      height={60}
      className={className}
      unoptimized
    />
  );
}

/**
 * Um grupo de escolhas — rádio de verdade por baixo, para teclado e leitor de
 * tela. O desenho vem de quem usa (o simulador e a janela da conversa).
 */
export function ChoicePills<T extends string>({
  legend,
  options,
  value,
  onChange,
  className = "",
  legendClassName = "",
  groupClassName = "",
  optionClassName,
}: {
  legend: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  legendClassName?: string;
  groupClassName?: string;
  /** As classes de cada opção, escolhida ou não. */
  optionClassName: (isActive: boolean) => string;
}) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className={legendClassName}>{legend}</legend>
      <div className={groupClassName}>
        {options.map((option) => {
          const isActive = option.id === value;
          return (
            <label
              key={option.id}
              className={`cursor-pointer transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-current ${optionClassName(isActive)}`}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={isActive}
                onChange={() => onChange(option.id)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type Channel = { label: string; value: string; href?: string; icon: ComponentType<IconProps> };

/** Os canais preenchidos em `SITE_CONTACT`, na ordem de preferência. Vazio não entra. */
function contactChannels(): Channel[] {
  const { whatsapp, phone, email, address, instagram } = SITE_CONTACT;
  const list: (Channel | false)[] = [
    !!whatsapp && { label: "WhatsApp", value: "Conversar agora", href: contactHref, icon: ChatIcon },
    !!phone && { label: "Telefone", value: phone, href: `tel:+55${phone.replace(/\D/g, "")}`, icon: PhoneIcon },
    !!email && { label: "E-mail", value: email, href: `mailto:${email}`, icon: MailIcon },
    !!instagram && {
      label: "Instagram",
      value: `@${instagram.replace(/^@/, "")}`,
      href: `https://instagram.com/${instagram.replace(/^@/, "")}`,
      icon: InstagramIcon,
    },
    !!address && { label: "Endereço", value: address, icon: PinIcon },
  ];
  return list.filter((channel): channel is Channel => Boolean(channel));
}

/**
 * Os canais de contato preenchidos em `SITE_CONTACT`, no desenho de quem usa.
 * Sem nenhum ainda, o aviso de que chegam em breve — nunca um número de exemplo.
 */
export function ChannelList({
  className = "",
  itemClassName = "",
  iconClassName = "h-5 w-5",
  labelClassName = "block text-xs uppercase tracking-[0.15em] opacity-60",
  emptyClassName = "",
}: {
  className?: string;
  itemClassName?: string;
  iconClassName?: string;
  labelClassName?: string;
  emptyClassName?: string;
}) {
  const list = contactChannels();
  if (list.length === 0) {
    return <p className={emptyClassName}>Os canais de atendimento serão publicados aqui em breve.</p>;
  }
  return (
    <ul className={className}>
      {list.map((channel) => {
        const Icon = channel.icon;
        const body = (
          <>
            <Icon className={iconClassName} />
            <span className="min-w-0">
              <span className={labelClassName}>{channel.label}</span>
              <span className="block truncate">{channel.value}</span>
            </span>
          </>
        );
        return (
          <li key={channel.label}>
            {channel.href ? (
              <a href={channel.href} className={itemClassName}>
                {body}
              </a>
            ) : (
              <div className={itemClassName}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
