"use client";

import Image, { type ImageProps } from "next/image";

import svgPaths from "@/constants/svg/paths";
import { officeLogoSrc, useOfficeLogo } from "@/hooks/useOfficeLogo";
import { getTenantSlug } from "@/lib/tenant";

type OfficeLogoProps = Omit<ImageProps, "src"> & {
  /** O tom da marca padrão: dourada sobre fundo escuro, azul sobre claro. */
  tone: "gold" | "blue";
};

const TANIA_SLUG = "tania";

/**
 * A marca em toda tela: a logo que o escritório enviou ou, sem ela, a padrão
 * — a própria da Tânia no escritório dela, a do sistema nos demais — no tom
 * pedido. A logo enviada é uma só e vale nos dois tons.
 *
 * O escritório só entra na conta com a resposta em mãos (`logoUrl === null`):
 * antes disso o HTML pré-gerado não sabe qual é, e a hidratação tem de desenhar
 * o mesmo que ele.
 *
 * Enquanto não se sabe qual das duas, o espaço fica reservado e vazio:
 * desenhar a padrão e trocá-la em seguida seria a marca errada piscando a cada
 * recarga. `object-contain` porque a logo do escritório não tem a proporção da
 * padrão, e uma caixa de altura e largura fixas a esticaria. `unoptimized`
 * porque nenhuma das duas passa pelo otimizador: a padrão é SVG e a do
 * escritório já vem pronta da API.
 */
export function OfficeLogo({ tone, className = "", alt, ...image }: Readonly<OfficeLogoProps>) {
  const { logoUrl } = useOfficeLogo();
  const isTania = logoUrl === null && getTenantSlug().toLowerCase() === TANIA_SLUG;
  const brand = isTania ? svgPaths.TANIA_LOGOS : svgPaths.LOGOS;
  const fallback = tone === "gold" ? brand.GOLD : brand.BLUE;
  return (
    <Image
      {...image}
      unoptimized
      src={logoUrl ? officeLogoSrc(logoUrl) : fallback}
      alt={alt}
      className={`object-contain ${logoUrl === undefined ? "invisible" : ""} ${className}`}
    />
  );
}
