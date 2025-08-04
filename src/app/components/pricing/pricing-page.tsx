"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Star,
  Calculator,
  Zap,
  Target,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Clock,
  Users,
} from "lucide-react";
import { calculateCustomPrice } from "@/lib/subscription-plans";
import getStripe from "@/lib/stripe-client";

interface Subject {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  maturita: boolean;
}

interface SubjectSelectorProps {
  subjects: Subject[];
  selectedSubjects: string[];
  onSelectionChange: (subjects: string[]) => void;
}

function SubjectSelector({
  subjects,
  selectedSubjects,
  onSelectionChange,
}: SubjectSelectorProps) {
  const handleToggleSubject = (subjectId: string) => {
    const isSelected = selectedSubjects.includes(subjectId);

    if (isSelected) {
      onSelectionChange(selectedSubjects.filter((id) => id !== subjectId));
    } else {
      onSelectionChange([...selectedSubjects, subjectId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">
          Scegli le Tue Materie
        </h2>
        <p className="text-muted-foreground">
          Seleziona le materie che vuoi studiare. Puoi modificare la tua
          selezione in qualsiasi momento.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {subjects.map((subject) => {
          const isSelected = selectedSubjects.includes(subject.id);
          return (
            <div
              key={subject.id}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "border-transparent shadow-lg scale-[1.02]"
                  : "border-border hover:border-muted-foreground/30 hover:scale-[1.01]"
              }`}
              onClick={() => handleToggleSubject(subject.id)}
              style={
                {
                  "--subject-color": subject.color,
                  backgroundColor: isSelected
                    ? `${subject.color}08`
                    : "transparent",
                  boxShadow: isSelected
                    ? `0 8px 32px ${subject.color}20`
                    : "none",
                } as React.CSSProperties
              }
            >
              {/* Accent border for selected state */}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                  style={{ borderColor: subject.color }}
                />
              )}

              {/* Top accent bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
                  isSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-60"
                }`}
                style={{ backgroundColor: subject.color }}
              />

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-[var(--subject-color)] transition-colors">
                        {subject.name}
                      </h3>
                      {subject.maturita && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5"
                          style={{
                            backgroundColor: `${subject.color}15`,
                            color: subject.color,
                            border: `1px solid ${subject.color}30`,
                          }}
                        >
                          Maturità
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {subject.description}
                    </p>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center ${
                        isSelected
                          ? "shadow-md"
                          : "border-2 border-muted-foreground/30 group-hover:border-[var(--subject-color)]"
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? subject.color
                          : "transparent",
                        borderColor: isSelected ? subject.color : undefined,
                      }}
                    >
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedSubjects.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>
            {selectedSubjects.length} materia
            {selectedSubjects.length === 1 ? "" : "e"} selezionata
            {selectedSubjects.length === 1 ? "" : "e"}
          </span>
        </div>
      )}
    </div>
  );
}

interface PricingPageProps {
  subjects: Subject[];
}

export function PricingPage({ subjects }: PricingPageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (selectedSubjects.length === 0 || !session?.user?.id) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: "CUSTOM",
          selectedSubjects,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const stripe = await getStripe();
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = calculateCustomPrice(selectedSubjects.length);
  const canProceedToCheckout = selectedSubjects.length > 0 && session?.user?.id;

  const handleReturnToDashboard = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("bypassSubscriptionRedirect", "true");
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        {session?.user && (
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleReturnToDashboard}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Torna alla Dashboard
            </Button>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-16 max-w-4xl mx-auto">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
            <Star className="w-3 h-3 mr-1" />
            Prezzi Flessibili
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
            Studia Intelligente, Paga Meno
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Scegli esattamente quello di cui hai bisogno. Nessun pacchetto
            fisso, nessuno spreco. Aumenta o diminuisci in qualsiasi momento.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-foreground font-medium">€4.99</span>
              <span className="text-muted-foreground">prima materia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-foreground font-medium">€2.49</span>
              <span className="text-muted-foreground">ogni aggiuntiva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-foreground font-medium">
                Cancella quando vuoi
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Subject Selection - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <SubjectSelector
                subjects={subjects}
                selectedSubjects={selectedSubjects}
                onSelectionChange={setSelectedSubjects}
              />
            </div>

            {/* Pricing Summary - Takes 1 column, sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <Card className="shadow-xl bg-card/80 backdrop-blur-sm border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" />
                      Il Tuo Piano
                    </CardTitle>
                    <CardDescription>
                      {selectedSubjects.length === 0
                        ? "Seleziona le materie per vedere i prezzi"
                        : `${selectedSubjects.length} materia${
                            selectedSubjects.length === 1 ? "" : "e"
                          } selezionata${
                            selectedSubjects.length === 1 ? "" : "e"
                          }`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {selectedSubjects.length > 0 ? (
                      <>
                        {/* Pricing Breakdown */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Prima materia
                            </span>
                            <span className="font-medium">€4.99</span>
                          </div>

                          {selectedSubjects.length > 1 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {selectedSubjects.length - 1} aggiuntiva
                                {selectedSubjects.length - 1 === 1 ? "" : "e"}
                              </span>
                              <span className="font-medium">
                                €
                                {((selectedSubjects.length - 1) * 2.49).toFixed(
                                  2
                                )}
                              </span>
                            </div>
                          )}

                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">Totale/mese</span>
                              <span className="text-2xl font-bold text-primary">
                                €{totalPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* What's Included */}
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-foreground">
                            Cosa è incluso:
                          </h4>
                          <div className="space-y-2">
                            {[
                              "Teoria ed esercizi completi",
                              "Tracciamento studio con IA",
                              "Analisi del progresso",
                              "Supporto prioritario",
                            ].map((feature, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="text-muted-foreground">
                                  {feature}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calculator className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground text-sm">
                          Seleziona le materie per vedere i tuoi prezzi
                          personalizzati
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-4">
                    {status === "unauthenticated" ? (
                      <Button
                        className="w-full h-12 text-base font-medium"
                        onClick={() =>
                          (window.location.href = "/api/auth/signin")
                        }
                      >
                        Accedi per Continuare
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckout}
                        disabled={!canProceedToCheckout || loading}
                        className="w-full h-12 text-base cursor-pointer"
                        size="lg"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Elaborazione...
                          </div>
                        ) : selectedSubjects.length === 0 ? (
                          "Seleziona le materie per continuare"
                        ) : (
                          <div className="flex items-center gap-2">
                            Inizia per €{totalPrice.toFixed(2)}/mese
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Perché Scegliere la Nostra Piattaforma?
            </h3>
            <p className="text-muted-foreground">
              Tutto quello di cui hai bisogno per avere successo nei tuoi studi
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center group">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-2 text-foreground">
                Perfetto per Te
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Paga solo per quello di cui hai bisogno. Nessun costo inutile o
                impegno.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-2 text-foreground">Flessibile</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aggiungi o rimuovi materie in qualsiasi momento. Adattati mentre
                le tue esigenze cambiano.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold mb-2 text-foreground">
                Qualità Premium
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Accesso a tutte le funzionalità, contenuti completi e strumenti
                basati sull'intelligenza artificiale.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
