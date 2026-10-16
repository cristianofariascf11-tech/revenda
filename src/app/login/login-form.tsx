"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { loginSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import type { z } from "zod";

type LoginData = z.infer<typeof loginSchema>;

export function LoginForm({ nextPath, configured }: { nextPath?: string; configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  async function submit(values: LoginData) {
    setError("");
    if (!configured) return setError("Configure o Supabase antes de entrar.");
    try {
      const { error: authError } = await createClient().auth.signInWithPassword(values);
      if (authError) throw authError;
      const safeNext = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/vehicles";
      router.replace(safeNext); router.refresh();
    } catch {
      setError("E-mail ou senha incorretos. Verifique os dados e tente novamente.");
    }
  }
  return <form className="stack" onSubmit={handleSubmit(submit)} noValidate>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <div className="field"><label htmlFor="email">E-mail</label><input className="input" id="email" type="email" autoComplete="email" {...register("email")}/>{errors.email && <span className="field-error">{errors.email.message}</span>}</div>
    <div className="field"><label htmlFor="password">Senha</label><input className="input" id="password" type="password" autoComplete="current-password" {...register("password")}/>{errors.password && <span className="field-error">{errors.password.message}</span>}</div>
    <button className="btn btn-primary" style={{minHeight: 49}} disabled={isSubmitting || !configured}><LogIn size={18}/>{isSubmitting ? "ENTRANDO..." : "ENTRAR"}</button>
  </form>;
}