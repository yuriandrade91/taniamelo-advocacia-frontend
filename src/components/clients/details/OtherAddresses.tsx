import { Pill } from "@/components/ui/feedback/Badges";
import { optionalText } from "@/lib/formValues";
import type { ClientAddressResponse } from "@/interfaces/client/ClientSubResources.interface";

/**
 * Os endereços do cliente além do principal, na ficha.
 *
 * A ficha edita um endereço — o principal —, mas o cliente pode ter outros
 * (o cadastro aceita até três). Sem esta lista eles existiam só no banco:
 * quem abria a ficha não tinha como saber que havia outro lugar para mandar
 * correspondência. Aqui são leitura.
 */
export function OtherAddresses({ addresses }: Readonly<{ addresses: readonly ClientAddressResponse[] }>) {
  if (addresses.length === 0) return null;
  return (
    <section aria-label="Outros endereços" className="mt-5 flex flex-col gap-2">
      <h4 className="text-xs font-medium tracking-wide text-gray-100 uppercase">
        Outros endereços ({addresses.length})
      </h4>
      <ul className="flex flex-col gap-2">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-xl bg-page px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 text-sm font-medium text-primary">{streetLine(address)}</p>
              {address.addressType && <Pill tone="muted">{address.addressType}</Pill>}
            </div>
            <p className="mt-0.5 text-xs text-gray-100">{placeLine(address)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Rua das Flores, 120 — apto 31". */
function streetLine(address: ClientAddressResponse): string {
  const number = optionalText(address.addressNumber);
  const complement = optionalText(address.complement);
  return `${address.street}${number ? `, ${number}` : ""}${complement ? ` — ${complement}` : ""}`;
}

/** "Centro · Belo Horizonte/MG · CEP 30110-000". */
function placeLine(address: ClientAddressResponse): string {
  const zip = optionalText(address.zipCode);
  return [optionalText(address.neighborhood), `${address.city}/${address.state}`, zip && `CEP ${zip}`]
    .filter(Boolean)
    .join(" · ");
}
