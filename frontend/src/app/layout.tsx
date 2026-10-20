import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import "@/estilos/globales.css";

const nunito = Nunito({
  variable: "--fuente-nunito",
  subsets: ["latin"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--fuente-nunito-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Echo",
    template: "%s · Echo",
  },
  description:
    "Plataforma educativa para aprender ética, principios, leyes y normas del desarrollo de software. Piloto académico de la Universidad Politécnica de Chiapas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${nunito.variable} ${nunitoSans.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
