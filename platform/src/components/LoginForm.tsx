"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeInternalPath } from "@/lib/url-safety";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou palavra-passe incorretos.");
      return;
    }

      router.push(safeInternalPath(params.get("callbackUrl"), "/"));
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <div className="font-display text-[1.8rem] font-medium tracking-tight">
            DS <span className="font-sans font-light tracking-[0.3em] uppercase text-[1rem] align-middle text-graphite">OS</span>
          </div>
          <p className="text-graphite-light text-sm mt-2">Plataforma interna DS Group</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-mist-2 rounded-lg p-8 flex flex-col gap-5">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-graphite mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-mist-2 rounded-md px-3 py-2.5 text-sm outline-none focus:border-gold transition-colors"
              placeholder="nome@dsgroup.pt"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-graphite mb-1.5">
              Palavra-passe
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-mist-2 rounded-md px-3 py-2.5 text-sm outline-none focus:border-gold transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-danger text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white rounded-md py-2.5 text-sm font-medium mt-2 hover:bg-ink transition-colors disabled:opacity-60"
          >
            {loading ? "A entrar…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs text-graphite-light mt-6">
          Acesso restrito à equipa DS Group.
          <br />
          Esqueceu-se da password? Peça a um administrador para a repor em Definições.
        </p>
      </div>
    </div>
  );
}

export { LoginForm };
