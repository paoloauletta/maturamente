import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./client";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Impostazioni",
  description:
    "Personalizza il tuo profilo MaturaMate. Modifica dati personali, preferenze di studio, notifiche e impostazioni di privacy per ottimizzare la tua esperienza di apprendimento.",
  keywords: [
    "impostazioni profilo",
    "preferenze utente",
    "configurazione account",
    "privacy settings",
    "personalizzazione studio",
    "notifiche app",
  ],
  openGraph: {
    title: "Impostazioni | MaturaMate",
    description:
      "Personalizza il tuo profilo MaturaMate. Modifica dati personali, preferenze di studio e impostazioni privacy.",
    url: "/dashboard/settings",
  },
  twitter: {
    title: "Impostazioni | MaturaMate",
    description:
      "Personalizza il tuo profilo MaturaMate. Modifica preferenze di studio e impostazioni.",
  },
  alternates: {
    canonical: "/dashboard/settings",
  },
};

export default async function SettingsPage() {
  await connection();
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/");
  }

  // Get additional user information from the database
  const userInfo = await db
    .select({
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, user.id as string))
    .then((res) => res[0] || { username: "" });

  const userData = {
    id: user.id as string,
    email: user.email as string,
    givenName: user.name?.split(" ")[0] || "",
    familyName: user.name?.split(" ").slice(1).join(" ") || "",
    picture: user.image || "",
    username: userInfo?.username || "",
  };

  return (
    <div className="container max-w-5xl mx-auto px-4">
      <SettingsClient
        id={userData.id}
        email={userData.email}
        givenName={userData.givenName}
        familyName={userData.familyName}
        picture={userData.picture}
        username={userData.username}
      />
    </div>
  );
}
