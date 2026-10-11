import "@/components/site/site.css";

/** O site do escritório — público, fora do `RouteGuard` e sem nada do sistema. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site min-h-screen bg-ivory font-sans text-primary">
      {/* Sem JavaScript, nada fica escondido à espera da animação de entrada. */}
      <noscript>
        <style>{`.site-reveal,.pr-vline>span,.pr-draw,.pr-spin-in{opacity:1!important;transform:none!important;filter:none!important}`}</style>
      </noscript>
      {children}
    </div>
  );
}
