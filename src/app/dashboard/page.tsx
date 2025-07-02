import React from "react";
import { Suspense } from "react";
import { getCurrentUserOptional, isAuthenticated } from "@/utils/user-context";
import { UnauthenticatedOverlay } from "@/app/components/auth/unauthenticated-overlay";
import { DashboardSkeleton } from "@/app/components/shared/loading";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays,
  ArrowRight,
  FileText,
  MessageSquare,
  Clock,
  BookOpen,
  BarChart3,
  Bot,
  Crown,
} from "lucide-react";
import { SubjectsDataServer } from "@/app/components/dashboard/le-mie-materie/subjects-data-server";
import { DashboardSubjectCard } from "@/app/components/dashboard/dashboard-subject-card";
import { getRecentNotesAcrossAllSubjects } from "@/utils/notes-data";
import { getUserSubjects } from "@/utils/subjects-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "La tua dashboard personale su MaturaMente. Accedi alle simulazioni d'esame, teoria matematica, statistiche di progresso e impostazioni del profilo.",
  keywords: [
    "dashboard maturità",
    "area personale",
    "statistiche studio",
    "progresso matematica",
    "simulazioni personali",
  ],
  openGraph: {
    title: "Dashboard | MaturaMente",
    description:
      "La tua dashboard personale su MaturaMente. Accedi alle simulazioni d'esame, teoria matematica e statistiche di progresso.",
    url: "/dashboard",
  },
  twitter: {
    title: "Dashboard | MaturaMente",
    description:
      "La tua dashboard personale su MaturaMente. Accedi alle simulazioni d'esame, teoria matematica e statistiche.",
  },
  alternates: {
    canonical: "/dashboard",
  },
};

// Force dynamic rendering since we use headers() through getCurrentUser()
export const dynamic = "force-dynamic";

// Configure for better caching
export const revalidate = 300; // 5 minutes revalidation for dashboard data

export default async function DashboardMaturamentePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  try {
    // Check if user is authenticated
    const authenticated = await isAuthenticated();

    if (!authenticated) {
      return <UnauthenticatedDashboard />;
    }

    // Get current user from headers (set by middleware)
    const user = await getCurrentUserOptional();
    if (!user) {
      return <UnauthenticatedDashboard />;
    }

    const userId = user.id;

    // Fetch data in parallel
    const [subjectsData, userSubjects, recentNotes] = await Promise.all([
      SubjectsDataServer(),
      getUserSubjects(userId),
      getRecentNotesAcrossAllSubjects(userId, 6), // Get 6 recent notes
    ]);

    // Mock data for subscription
    const subscriptionData = {
      plan: "Piano Pro",
      renewalDate: "12/04/2025",
    };

    return (
      <div className="flex flex-col gap-8 pb-8 container mx-auto max-w-6xl px-4">
        {/* Header Section */}
        <div className="relative w-full pt-4 md:px-2 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,#000)]" />
          <div className="relative">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Ciao Paolo Auletta
                </h1>
                <p className="text-muted-foreground mt-2">
                  Continua il tuo studio da dove lo avevi lasciato
                </p>
              </div>
              <div className="w-full md:w-auto border rounded-lg px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-base font-medium">
                      {subscriptionData.plan}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Prossimo rinnovo {subscriptionData.renewalDate}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Row 1: Le mie materie (larger) + Ore di studio (smaller) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Le mie materie Section - takes 2/3 of the width */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Le mie materie
                </CardTitle>
                <CardDescription>
                  Le materie che stai studiando di più
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subjectsData.subjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative w-full h-full">
                    {subjectsData.subjects.slice(0, 4).map((subject) => (
                      <DashboardSubjectCard
                        key={subject.id}
                        subject={subject}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna materia disponibile</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/le-mie-materie">
                    Tutte le materie
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Ore di studio Section - takes 1/3 of the width */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Ore di studio
                </CardTitle>
                <CardDescription>Ore di studio complessive</CardDescription>
              </CardHeader>
              <CardContent className="h-full">
                <div className="space-y-4 items-center justify-center h-full">
                  <div className="relative w-full h-full bg-muted/20 rounded-lg flex items-center justify-center">
                    {/* Simple chart placeholder that matches the wireframe */}
                    <div className="flex items-end gap-1 h-16">
                      <div className="w-2 bg-primary/60 h-8 rounded-sm"></div>
                      <div className="w-2 bg-primary/60 h-12 rounded-sm"></div>
                      <div className="w-2 bg-primary h-16 rounded-sm"></div>
                      <div className="w-2 bg-primary/60 h-10 rounded-sm"></div>
                      <div className="w-2 bg-primary/60 h-6 rounded-sm"></div>
                      <div className="w-2 bg-primary/60 h-14 rounded-sm"></div>
                      <div className="w-2 bg-primary/60 h-4 rounded-sm"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/statistiche">
                    Tutte le statistiche
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Row 2: AI Tutor (smaller) + Appunti recenti (larger) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Tutor Section - takes 1/3 of the width */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  AI Tutor
                </CardTitle>
                <CardDescription>
                  La tua conversazione più recente con il Tutor AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 border rounded-lg bg-card/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Mi puoi spiegare la...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        18/06/2025
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/ai-tutor">
                    Parla col tutor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Appunti recenti Section - takes 2/3 of the width
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Appunti recenti
                </CardTitle>
                <CardDescription>
                  Gli ultimi appunti che hai studiato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentNotes.length > 0 ? (
                    recentNotes.slice(0, 3).map((note) => (
                      <Link
                        key={note.id}
                        href={`/${note.subjectSlug}/${note.slug}`}
                        className="block group"
                      >
                        <div className="flex items-start gap-3 p-3 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                                {note.title}
                              </p>
                              {note.is_favorite && (
                                <div className="ml-2 flex-shrink-0">
                                  <span className="text-yellow-500 text-xs">
                                    ★
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {note.date}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-xs px-2 py-1 rounded text-white"
                                style={{
                                  backgroundColor:
                                    note.subjectColor || "#6366f1",
                                }}
                              >
                                {note.subjectName}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nessun appunto recente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card> */}

            {/* Separate detailed "Appunti recenti" section */}
            {recentNotes.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Appunti recenti
                  </CardTitle>
                  <CardDescription>
                    Gli ultimi appunti che hai studiato
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recentNotes.slice(0, 6).map((note) => (
                      <Link
                        key={note.id}
                        href={`/${note.subjectSlug}/${note.slug}`}
                        className="block group"
                      >
                        <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors h-full">
                          <div className="flex items-start justify-between">
                            <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                              {note.title}
                            </h3>
                            {note.is_favorite && (
                              <div className="ml-2 flex-shrink-0">
                                <span className="text-yellow-500 text-xs">
                                  ★
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {note.date}
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <span
                              className="text-xs px-2 py-1 rounded text-white"
                              style={{
                                backgroundColor: note.subjectColor || "#6366f1",
                              }}
                            >
                              {note.subjectName}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          Errore nel caricamento della dashboard. Riprova più tardi.
        </p>
      </div>
    );
  }
}

// Unauthenticated dashboard component
function UnauthenticatedDashboard() {
  // Sample data for demonstration
  const sampleData = (
    <div className="flex flex-col gap-6 pb-8 container mx-auto max-w-6xl px-4 min-h-[calc(100vh-4rem)]">
      {/* Hero Banner */}
      <div className="relative w-full pt-4 md:px-2 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,#000)]" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Ciao Paolo Auletta
              </h1>
              <p className="text-muted-foreground mt-2">
                Continua il tuo studio da dove lo avevi lasciato
              </p>
            </div>
            <Card className="w-full lg:w-auto">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10">
                    <Crown className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Piano Pro</p>
                    <p className="text-xs text-muted-foreground">
                      Prossimo rinnovo 12/04/2025
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sample cards */}
        <Card className="lg:col-span-2 h-48">
          <CardContent className="p-4">
            <div className="text-xl font-bold">Le mie materie</div>
          </CardContent>
        </Card>
        <Card className="h-64">
          <CardContent className="p-4">
            <div className="text-xl font-bold">Ore di studio</div>
          </CardContent>
        </Card>
        <Card className="h-64">
          <CardContent className="p-4">
            <div className="text-xl font-bold">AI Tutor</div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 h-32">
          <CardContent className="p-4">
            <div className="text-xl font-bold">Appunti recenti</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <UnauthenticatedOverlay
      title="Accedi alla tua Dashboard"
      description="Crea un account gratuito per monitorare i tuoi progressi e personalizzare il tuo percorso di studio"
      features={[
        "Monitora i tuoi progressi in tempo reale",
        "Salva i risultati delle simulazioni",
        "Statistiche dettagliate delle performance",
        "Piano di studio personalizzato",
      ]}
    >
      {sampleData}
    </UnauthenticatedOverlay>
  );
}
