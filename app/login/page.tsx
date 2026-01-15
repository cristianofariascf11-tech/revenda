"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email ou senha inválidos");
      return;
    }

    window.location.href = "/vehicles";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #000000, #111111)",
        padding: 16,
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: 360,
          padding: 28,
          borderRadius: 16,
          background: "#0f0f0f",
          border: "1px solid #222",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
  src="/logo.png"
  alt="GV Moto Center"
  style={{
    maxWidth: 180,
    marginBottom: 12,
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  }}
/>

          <div
            style={{
              fontSize: 13,
              color: "#ff7a00",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            GESTOR DE ESTOQUE (REVENDA)
          </div>
        </div>

        {/* EMAIL */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* SENHA */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <div
            style={{
              color: "#ff4d4d",
              fontSize: 13,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* BOTÃO */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: loading
              ? "#333"
              : "linear-gradient(135deg, #ff7a00, #ff9c1a)",
            color: "#000",
            fontWeight: 900,
            fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: 0.5,
          }}
        >
          {loading ? "ENTRANDO..." : "ENTRAR"}
        </button>

        {/* RODAPÉ */}
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 12,
            color: "#777",
          }}
        >
          © GV Moto Center
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#111",
  color: "#fff",
  fontSize: 14,
};
