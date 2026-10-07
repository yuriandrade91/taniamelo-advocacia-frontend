/**
 * Um ícone por seção do cadastro — traço de 1,5px em 20×20, como os do
 * resto do sistema. Antes todas usavam o mesmo cartão com linhas; um ícone
 * próprio deixa a aba reconhecível antes de ler o nome.
 */
import type { ReactNode } from "react";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const ServiceIcon = () => (
  <Icon>
    <rect x="3" y="6" width="14" height="10" rx="2" />
    <path d="M7.5 6V4.75A1.25 1.25 0 0 1 8.75 3.5h2.5a1.25 1.25 0 0 1 1.25 1.25V6M3 10.5h14" />
  </Icon>
);

export const DisabilityIcon = () => (
  <Icon>
    <circle cx="10" cy="3.75" r="1.25" />
    <path d="M5 7h10M10 7v4.5M10 11.5 7.5 17M10 11.5l2.5 5.5" />
  </Icon>
);

export const PersonIcon = () => (
  <Icon>
    <circle cx="10" cy="7" r="3" />
    <path d="M4 16.5c.8-2.8 3.2-4.5 6-4.5s5.2 1.7 6 4.5" />
  </Icon>
);

export const WorkIcon = () => (
  <Icon>
    <rect x="2.75" y="4" width="14.5" height="12" rx="2" />
    <circle cx="7.5" cy="9" r="1.75" />
    <path d="M5 13.25c.5-1.25 1.4-1.9 2.5-1.9s2 .65 2.5 1.9M12 8h3M12 11h3" />
  </Icon>
);

export const AddressIcon = () => (
  <Icon>
    <path d="M10 17.5s5.5-4.6 5.5-9.25a5.5 5.5 0 1 0-11 0C4.5 12.9 10 17.5 10 17.5Z" />
    <circle cx="10" cy="8.25" r="2" />
  </Icon>
);

export const InterviewIcon = () => (
  <Icon>
    <path d="M16.5 9.5c0 3.3-2.9 6-6.5 6a7.3 7.3 0 0 1-2.6-.5L3.5 16l1-3.1A5.6 5.6 0 0 1 3.5 9.5c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6Z" />
    <path d="M7 8.5h6M7 11h4" />
  </Icon>
);

export const FilesIcon = () => (
  <Icon>
    <path d="M14.5 9.25 9.4 14.35a3 3 0 0 1-4.25-4.25l5.65-5.65a2 2 0 0 1 2.83 2.83L8 12.9a1 1 0 0 1-1.41-1.42l4.95-4.95" />
  </Icon>
);

export const ReviewIcon = () => (
  <Icon>
    <path d="M7.5 5h9M7.5 10h9M7.5 15h9" />
    <path d="m2.75 5 1 1 1.75-2M2.75 10l1 1 1.75-2M2.75 15l1 1 1.75-2" />
  </Icon>
);
