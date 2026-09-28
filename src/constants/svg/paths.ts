/**
 * Mapa central dos SVGs estáticos servidos via `public/svg`.
 *
 * Caminhos sempre absolutos (a partir da raiz) — é o formato exigido pelo
 * Next.js para assets de `public/`, independente da profundidade do
 * componente que os consome.
 */
const svgPaths = {
  LOGOS: {
    GOLD: "/svg/gold-logo.svg",
    BLUE: "/svg/blue-logo.svg",
    WHITE: "/svg/white-logo.svg",
  },

  ICONS: {
    ADD: "/svg/icons/add.svg",
    ARCHIVE: "/svg/icons/archive.svg",
    CALENDAR: "/svg/icons/calendar.svg",
    CONFETTI: "/svg/icons/confetti.svg",
    DETAILS: "/svg/icons/details.svg",
    EDIT: "/svg/icons/edit.svg",
    LETTER: "/svg/icons/letter.svg",
    PHONE: "/svg/icons/phone.svg",
    PROFILE: "/svg/icons/profile.svg",
    TRASH: "/svg/icons/trash.svg",
    USER_ID: "/svg/icons/user_id.svg",
  },
} as const;

export default svgPaths;
