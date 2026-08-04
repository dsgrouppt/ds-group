import Link from "next/link";

export default function AcessoNegadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6 text-center">
      <div>
        <p className="font-display text-2xl mb-3">Acesso não autorizado</p>
        <p className="text-graphite-light text-sm max-w-[42ch] mx-auto mb-6">
          A sua conta não tem permissão para aceder a este módulo. Contacte um administrador se
          acredita que isto é um engano.
        </p>
        <Link href="/" className="text-sm font-medium underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
