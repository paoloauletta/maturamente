import type { Metadata } from "next";
import Landing from "./components/landing/index";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Benvenuto su MaturaMate, la piattaforma completa per la preparazione alla maturità scientifica. Accedi a teoria dettagliata, simulazioni d'esame e esercizi interattivi per matematica e fisica.",
  openGraph: {
    title: "MaturaMate - Preparazione Maturità Matematica Online",
    description:
      "Benvenuto su MaturaMate, la piattaforma completa per la preparazione alla maturità scientifica. Accedi a teoria dettagliata, simulazioni d'esame e esercizi interattivi.",
    url: "/",
  },
  twitter: {
    title: "MaturaMate - Preparazione Maturità Matematica Online",
    description:
      "Benvenuto su MaturaMate, la piattaforma completa per la preparazione alla maturità scientifica.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <Landing />;
}
