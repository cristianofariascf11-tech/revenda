import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GV Moto Center | Gestor de Estoque",
  description: "Gestor interno de estoque e revenda da GV Moto Center.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
