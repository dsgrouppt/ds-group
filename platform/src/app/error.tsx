"use client";

import { useEffect } from "react";
import { LinkButton } from "@/components/ui/Button";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("app.error_boundary", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <div className="text-[.75rem] tracking-[.18em] uppercase text-graphite/50 mb-3">Erro inesperado</div>
        <h1 className="font-display font-normal text-2xl mb-4">Algo correu mal.</h1>
        <p className="text-graphite/70 text-sm mb-8 leading-relaxed">
          Ocorreu um erro ao processar este pedido. Pode tentar novamente ou voltar ao painel principal. Se o
          problema persistir, contacte o administrador.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-black text-white hover:bg-ink transition-colors"
          >
            Tentar novamente
          </button>
          <LinkButton href="/" variant="secondary">
            Ir para o Dashboard
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
