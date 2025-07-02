import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsernameSetupForm from "../../components/auth/username-setup";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Configura Username",
  description:
    "Configura il tuo nome utente su MaturaMate. Personalizza il tuo profilo scegliendo un username unico per la tua esperienza di studio personalizzata.",
  keywords: [
    "configura username",
    "setup profilo",
    "nome utente",
    "personalizzazione account",
    "primo accesso",
  ],
  openGraph: {
    title: "Configura Username | MaturaMate",
    description:
      "Configura il tuo nome utente su MaturaMate per personalizzare il tuo profilo di studio.",
    url: "/username-setup",
  },
  twitter: {
    title: "Configura Username | MaturaMate",
    description:
      "Personalizza il tuo profilo MaturaMate con un username unico.",
  },
  alternates: {
    canonical: "/username-setup",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function UsernameSetupPage() {
  await connection();
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/");
  }

  try {
    // Check if user already has a username
    const userInfo = await db
      .select({
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, user.id as string))
      .then((res) => res[0] || { username: "" });

    // If user already has a username, redirect to dashboard
    if (userInfo.username) {
      redirect("/dashboard");
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Benvenuto in MaturaMate!
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Prima di iniziare, scegli un nome utente
            </p>
          </div>

          <UsernameSetupForm
            userId={user.id as string}
            email={user.email as string}
            name={user.name || ""}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Error checking username:", error);

    // In case of error, allow the user to set a username anyway
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Benvenuto in MaturaMate!
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Prima di iniziare, scegli un nome utente
            </p>
          </div>

          <UsernameSetupForm
            userId={user.id as string}
            email={user.email as string}
            name={user.name || ""}
          />
        </div>
      </main>
    );
  }
}
