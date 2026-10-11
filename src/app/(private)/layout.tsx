import NavbarOpt from "@/components/ui/navbar/Navbar";
import { RouteGuard } from "@/components/auth/RouteGuard";

/**
 * Layout da área autenticada.
 *
 * O HeroUI v3 removeu o `HeroUIProvider` — não há mais provider a envolver a
 * árvore. Sem ele, este layout pode voltar a ser Server Component.
 *
 * A guarda entra aqui, e não em cada página: é o único lugar por onde toda
 * rota privada passa, e acrescentar uma página nova não pode significar
 * lembrar de protegê-la.
 */
export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // `min-h-screen` (e não `h-screen`) para o conteúdo mais alto que a
    // viewport rolar em vez de ser cortado.
    <RouteGuard>
      <div className="min-h-screen bg-page">
        <div className="mx-auto max-w-[1440px] px-4 py-4 md:px-6">
          <NavbarOpt />
          {children}
        </div>
      </div>
    </RouteGuard>
  );
}
