import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <div className="text-[.75rem] tracking-[.18em] uppercase text-graphite/50 mb-3">Erro 404</div>
        <h1 className="font-display font-normal text-2xl mb-4">Página não encontrada.</h1>
        <p className="text-graphite/70 text-sm mb-8 leading-relaxed">
          O registo ou a página que procura não existe, ou pode ter sido removido.
        </p>
        <LinkButton href="/" variant="primary">
          Ir para o Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
