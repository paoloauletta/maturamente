"use client";

import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Calendar,
  CreditCard,
  Clock,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  description: string;
  slug: string;
}

interface PlanChangePreview {
  changeType: "upgrade" | "downgrade" | "no_change";
  timing: "immediate" | "next_period";
  currentSubjectCount: number;
  newSubjectCount: number;
  currentPrice: number;
  newPrice: number;
  priceDifference: number;
  prorationAmount: number;
  creditAmount: number;
  nextBillingAmount: number;
  currentPeriodEnd: string;
  summary: {
    totalImmediateCost: number;
    monthlyPriceChange: number;
    effectiveDate: string;
  };
}

interface PlanChangeComponentProps {
  currentSubjects: Subject[];
  availableSubjects: Subject[];
  onClose?: () => void;
}

// Simple Alert component replacement
const Alert = ({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "destructive";
  className?: string;
}) => (
  <div
    className={`p-4 rounded-lg border ${
      variant === "destructive"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800"
    } ${className}`}
  >
    {children}
  </div>
);

const AlertDescription = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`text-sm ${className}`}>{children}</div>;

export function PlanChangeComponent({
  currentSubjects,
  availableSubjects,
  onClose,
}: PlanChangeComponentProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    currentSubjects.map((s) => s.id)
  );
  const [timing, setTiming] = useState<"immediate" | "next_period">(
    "immediate"
  );
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load preview whenever selection or timing changes
  useEffect(() => {
    if (selectedSubjects.length > 0) {
      loadPreview();
    }
  }, [selectedSubjects, timing]);

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/plan-change-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newSubjectIds: selectedSubjects,
          timing,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Caricamento dell'anteprima fallito");
      }

      setPreview(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Caricamento dell'anteprima fallito"
      );
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async () => {
    if (!preview || preview.changeType === "no_change") {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/stripe/plan-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newSubjectIds: selectedSubjects,
          timing,
        }),
      });

      const data = await response.json();

      console.log("Plan change API response:", {
        status: response.status,
        ok: response.ok,
        data: data,
      });

      if (!response.ok) {
        console.error("API request failed:", data);
        throw new Error(
          data.error || "Elaborazione della modifica del piano fallita"
        );
      }

      // Handle immediate upgrade that requires payment
      if (data.success && data.requiresPayment === true && data.checkoutUrl) {
        console.log("Redirecting to checkout:", {
          requiresPayment: data.requiresPayment,
          checkoutUrl: data.checkoutUrl,
          prorationAmount: data.prorationAmount,
        });

        // Use window.location.assign for better compatibility
        window.location.assign(data.checkoutUrl);
        return;
      }

      console.log(
        "No payment required or no checkout URL, showing success message:",
        {
          success: data.success,
          requiresPayment: data.requiresPayment,
          hasCheckoutUrl: !!data.checkoutUrl,
        }
      );

      setSuccess(data.message);

      // Close after a delay to show success message
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Elaborazione della modifica del piano fallita"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Modifica il Tuo Piano</h2>
        <p className="text-muted-foreground">
          Aggiungi o rimuovi materie dal tuo abbonamento
        </p>
      </div>

      {/* Current Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Piano Attuale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Materie</p>
              <p className="font-medium">{currentSubjects.length} materie</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prezzo Mensile</p>
              <p className="font-medium">
                {preview ? formatPrice(preview.currentPrice) : "Caricamento..."}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Prossima Fatturazione
              </p>
              <p className="font-medium">
                {preview
                  ? formatDate(preview.currentPeriodEnd)
                  : "Caricamento..."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Seleziona Materie</CardTitle>
          <CardDescription>
            Scegli a quali materie vuoi avere accesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableSubjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                <input
                  type="checkbox"
                  id={subject.id}
                  checked={selectedSubjects.includes(subject.id)}
                  onChange={() => handleSubjectToggle(subject.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <Label htmlFor={subject.id} className="font-medium">
                    {subject.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {subject.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            Selezionate: {selectedSubjects.length} materie
          </div>
        </CardContent>
      </Card>

      {/* Timing Selection */}
      {preview && preview.changeType !== "no_change" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Quando dovrebbe avere effetto questo cambiamento?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {preview.changeType === "upgrade" && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <input
                  type="radio"
                  id="immediate"
                  name="timing"
                  value="immediate"
                  checked={timing === "immediate"}
                  onChange={(e) =>
                    setTiming(e.target.value as "immediate" | "next_period")
                  }
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="immediate"
                    className="font-medium flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Immediatamente (con ripartizione)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Paga {formatPrice(preview.prorationAmount)} ora per il
                    periodo rimanente
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <input
                type="radio"
                id="next_period"
                name="timing"
                value="next_period"
                checked={timing === "next_period"}
                onChange={(e) =>
                  setTiming(e.target.value as "immediate" | "next_period")
                }
                className="text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <Label
                  htmlFor="next_period"
                  className="font-medium flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Prossimo periodo di fatturazione
                </Label>
                <p className="text-sm text-muted-foreground">
                  {preview.changeType === "downgrade"
                    ? `Mantieni l'accesso a tutte le materie attuali fino al ${formatDate(
                        preview.currentPeriodEnd
                      )}`
                    : `I cambiamenti avranno effetto il ${formatDate(
                        preview.currentPeriodEnd
                      )}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {isLoadingPreview && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento anteprima...
            </div>
          </CardContent>
        </Card>
      )}

      {preview && preview.changeType !== "no_change" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Anteprima Modifiche
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tipo di Modifica
                </p>
                <Badge
                  variant={
                    preview.changeType === "upgrade" ? "default" : "secondary"
                  }
                >
                  {preview.changeType}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Nuovo Prezzo Mensile
                </p>
                <p className="font-medium">{formatPrice(preview.newPrice)}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              {timing === "immediate" && preview.changeType === "upgrade" && (
                <div className="flex justify-between">
                  <span>Addebito immediato:</span>
                  <span className="font-medium">
                    {formatPrice(preview.prorationAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Variazione prezzo mensile:</span>
                <span
                  className={`font-medium ${
                    preview.priceDifference >= 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {preview.priceDifference >= 0 ? "+" : ""}
                  {formatPrice(preview.priceDifference)}
                </span>
              </div>

              {preview.changeType === "downgrade" && (
                <div className="flex justify-between">
                  <span>Risparmio mensile:</span>
                  <span className="font-medium text-green-600">
                    {formatPrice(preview.creditAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Data di entrata in vigore:</span>
                <span className="font-medium">
                  {timing === "immediate"
                    ? "Ora"
                    : formatDate(preview.currentPeriodEnd)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Changes Message */}
      {preview && preview.changeType === "no_change" && (
        <Alert>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Nessuna modifica rilevata. Hai selezionato le stesse materie del
              tuo piano attuale.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Actions */}
      <Card>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Annulla
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={
              !preview ||
              preview.changeType === "no_change" ||
              isProcessing ||
              selectedSubjects.length === 0
            }
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {preview?.changeType === "upgrade"
              ? `Aggiorna Piano ${
                  timing === "immediate"
                    ? `(Paga ${formatPrice(preview.prorationAmount)})`
                    : ""
                }`
              : preview?.changeType === "downgrade"
              ? "Programma Downgrade"
              : "Conferma Modifiche"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
