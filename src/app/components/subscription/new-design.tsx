import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  Calculator,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Info,
  CreditCard,
  Calendar,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Note: Using regular input with type="checkbox" since Checkbox component might not be available
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Loading Overlay Component
const LoadingOverlay = ({
  isVisible,
  message,
}: {
  isVisible: boolean;
  message: string;
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-background border rounded-lg p-6 shadow-lg max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Elaborazione in corso</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Subject {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  maturita?: boolean;
  order_index: number;
}

interface UserSubjectAccess {
  hasAccess: boolean;
  subjectsCount: number;
  maxSubjects: number;
  availableSlots: number;
  selectedSubjects: string[];
}

interface PlanChangePreview {
  currentPrice: number;
  newPrice: number;
  prorationAmount: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  changeType: "upgrade" | "downgrade" | "no_change";
  effectiveDate: string;
}

interface SubscriptionChangeProps {
  currentSubjects: string[];
  allSubjects: Subject[];
  currentPrice: number;
  onChangeComplete: () => void;
  pendingRemovals?: string[]; // Subjects that are pending removal
}

export default function SubscriptionChange({
  currentSubjects,
  allSubjects,
  currentPrice,
  onChangeComplete,
  pendingRemovals = [],
}: SubscriptionChangeProps) {
  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>(currentSubjects);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [loadingOverlayMessage, setLoadingOverlayMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Update preview when selection changes
    if (
      selectedSubjects.length !== currentSubjects.length ||
      !selectedSubjects.every((id) => currentSubjects.includes(id))
    ) {
      fetchPreview();
    }
  }, [selectedSubjects, currentSubjects]);

  const fetchPreview = async () => {
    if (
      selectedSubjects.length === currentSubjects.length &&
      selectedSubjects.every((id) => currentSubjects.includes(id))
    ) {
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch("/api/stripe/plan-change-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newSubjectIds: selectedSubjects,
        }),
      });

      if (response.ok) {
        const previewData = await response.json();
        setPreview(previewData);
      } else {
        const error = await response.json();
        toast.error(error.error || "Impossibile recuperare anteprima");
      }
    } catch (error) {
      console.error("Error fetching preview:", error);
      toast.error("Impossibile recuperare anteprima modifiche");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    const isCurrentlySubscribed = currentSubjects.includes(subjectId);
    const isPendingRemoval = pendingRemovals.includes(subjectId);

    if (checked) {
      // User is trying to add a subject
      if (isCurrentlySubscribed) {
        // This is a currently subscribed subject, so this would be a downgrade (removing it)
        // Check if there are any other currently subscribed subjects being removed
        const otherRemovedCurrentSubjects = currentSubjects.filter(
          (id) => id !== subjectId && !selectedSubjects.includes(id)
        );

        if (otherRemovedCurrentSubjects.length > 0) {
          toast.error(
            "Non puoi aggiungere e rimuovere materie già sottoscritte contemporaneamente. Completa prima la rimozione delle materie attuali selezionate."
          );
          return;
        }
      } else {
        // This is a new subject, so this would be an upgrade (adding it)
        // Check if there are any currently subscribed subjects being removed
        const removedCurrentSubjects = currentSubjects.filter(
          (id) => !selectedSubjects.includes(id)
        );

        if (removedCurrentSubjects.length > 0) {
          toast.error(
            "Non puoi aggiungere nuove materie e rimuovere materie già sottoscritte contemporaneamente. Completa prima la rimozione delle materie attuali selezionate."
          );
          return;
        }
      }
      setSelectedSubjects((prev) => [...prev, subjectId]);
    } else {
      // User is trying to remove a subject
      if (isCurrentlySubscribed) {
        // Prevent removing the last remaining currently subscribed subject
        const currentlySelectedCount = selectedSubjects.filter(
          (id) => currentSubjects.includes(id) && id !== subjectId
        ).length;

        if (currentlySelectedCount === 0) {
          toast.error(
            "Non puoi rimuovere l'ultima materia sottoscritta. Devi mantenere almeno una materia nel tuo piano."
          );
          return;
        }

        // This is a currently subscribed subject being removed (downgrade)
        // Check if there are any new subjects being added
        const addedNewSubjects = selectedSubjects.filter(
          (id) => !currentSubjects.includes(id) && id !== subjectId
        );

        if (addedNewSubjects.length > 0) {
          toast.error(
            "Non puoi rimuovere materie già sottoscritte e aggiungere nuove materie contemporaneamente. Completa prima l'aggiunta delle nuove materie selezionate."
          );
          return;
        }
      } else {
        // This is a new subject being removed (not currently subscribed)
        // This should always be allowed
      }
      setSelectedSubjects((prev) => prev.filter((id) => id !== subjectId));
    }
  };

  const handlePlanChange = async () => {
    if (!preview) return;

    setLoading(true);
    setLoadingOverlayMessage(
      preview.isUpgrade
        ? "Aggiornamento piano in corso..."
        : "Modifica piano in corso..."
    );

    try {
      const response = await fetch("/api/stripe/plan-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newSubjectIds: selectedSubjects,
          timing: "immediate", // Always immediate for best UX
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Change applied successfully
        toast.success(result.message || "Abbonamento aggiornato con successo");

        // Show additional info for immediate charges
        if (result.chargedImmediately && result.immediateChargeAmount > 0) {
          setTimeout(() => {
            toast.info(
              `💳 Addebito immediato: €${result.immediateChargeAmount.toFixed(
                2
              )} è stato elaborato`,
              { duration: 5000 }
            );
          }, 1000);
        }

        setConfirmDialogOpen(false);
        onChangeComplete();
      } else {
        toast.error(result.error || "Impossibile aggiornare abbonamento");
        setLoading(false);
        setLoadingOverlayMessage("");
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Impossibile aggiornare abbonamento");
      setLoading(false);
      setLoadingOverlayMessage("");
    }
  };

  const getChangeDescription = () => {
    if (!preview) return null;

    const addedSubjects = selectedSubjects.filter(
      (id) => !currentSubjects.includes(id)
    );
    const removedSubjects = currentSubjects.filter(
      (id) => !selectedSubjects.includes(id)
    );

    if (addedSubjects.length > 0) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Plus className="w-4 h-4" />
          <span className="text-sm">
            Aggiunta {addedSubjects.length} materia
            {addedSubjects.length > 1 ? "e" : ""}
          </span>
        </div>
      );
    } else if (removedSubjects.length > 0) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <Minus className="w-4 h-4" />
          <span className="text-sm">
            Rimozione {removedSubjects.length} materia
            {removedSubjects.length > 1 ? "e" : ""}
          </span>
        </div>
      );
    }

    return null;
  };

  const hasChanges =
    selectedSubjects.length !== currentSubjects.length ||
    !selectedSubjects.every((id) => currentSubjects.includes(id));

  // Check if there are simultaneous changes (should not happen with new logic, but good to have)
  const addedSubjects = selectedSubjects.filter(
    (id) => !currentSubjects.includes(id)
  );
  const removedSubjects = currentSubjects.filter(
    (id) => !selectedSubjects.includes(id)
  );
  const hasSimultaneousChanges =
    addedSubjects.length > 0 && removedSubjects.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Modifica il Tuo Piano
        </CardTitle>
        <CardDescription>
          Aggiungi o rimuovi materie dal tuo abbonamento. Le modifiche hanno
          effetto immediatamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning for pending removals */}
        {pendingRemovals.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="font-medium text-orange-800">
                  Modifiche in Sospeso
                </div>
                <div className="text-sm text-orange-700">
                  Hai modifiche al tuo abbonamento che saranno applicate alla
                  prossima fatturazione. Le materie in sospeso non possono
                  essere modificate fino a quando le modifiche non saranno
                  completate.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subject Selection */}
        <div className="space-y-6">
          <h4 className="text-sm font-medium">Seleziona Materie</h4>

          {/* Current Subjects Section */}
          {(() => {
            const currentUserSubjects = allSubjects
              .filter(
                (subject) =>
                  currentSubjects.includes(subject.id) &&
                  !pendingRemovals.includes(subject.id)
              )
              .sort((a, b) => a.order_index - b.order_index);

            if (currentUserSubjects.length === 0) return null;

            return (
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Le Tue Materie
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentUserSubjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);
                    const isPendingRemoval = pendingRemovals.includes(
                      subject.id
                    );

                    return (
                      <div
                        key={subject.id}
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                          isPendingRemoval
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        } ${
                          isSelected
                            ? "border-transparent shadow-lg scale-[1.02]"
                            : "border-border hover:border-muted-foreground/30 hover:scale-[1.01]"
                        }`}
                        onClick={(e) => {
                          if (!isPendingRemoval) {
                            e.preventDefault();
                            handleSubjectToggle(subject.id, !isSelected);
                          }
                        }}
                        style={
                          {
                            "--subject-color": subject.color,
                            backgroundColor:
                              isSelected && !isPendingRemoval
                                ? `${subject.color}08`
                                : isPendingRemoval
                                ? "#f97316" + "08"
                                : "transparent",
                            boxShadow:
                              isSelected && !isPendingRemoval
                                ? `0 8px 32px ${subject.color}20`
                                : "none",
                          } as React.CSSProperties
                        }
                      >
                        {/* Accent border for selected state */}
                        {isSelected && !isPendingRemoval && (
                          <div
                            className="absolute inset-0 rounded-xl border-2 pointer-events-none"
                            style={{ borderColor: subject.color }}
                          />
                        )}
                        {isPendingRemoval && (
                          <div className="absolute inset-0 rounded-xl border-2 pointer-events-none border-orange-500" />
                        )}

                        {/* Top accent bar */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
                            isSelected || isPendingRemoval
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-60"
                          }`}
                          style={{
                            backgroundColor: isPendingRemoval
                              ? "#f97316"
                              : subject.color,
                          }}
                        />

                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h3
                                  className={`font-semibold transition-colors ${
                                    isPendingRemoval
                                      ? "text-orange-600"
                                      : "md:text-foreground text-[var(--subject-color)] group-hover:text-[var(--subject-color)]"
                                  }`}
                                >
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

                              {/* Status badges */}
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  Attuale
                                </Badge>
                                {!isSelected && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Rimozione
                                  </Badge>
                                )}
                                {isPendingRemoval && (
                                  <Badge className="text-xs bg-orange-500 text-white">
                                    In Sospeso
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Check icon */}
                            <div className="ml-4 flex-shrink-0">
                              <div
                                className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center ${
                                  isSelected
                                    ? "shadow-md"
                                    : isPendingRemoval
                                    ? "border-2 border-orange-500"
                                    : "border-2 border-muted-foreground/30 group-hover:border-[var(--subject-color)]"
                                }`}
                                style={{
                                  backgroundColor: isSelected
                                    ? isPendingRemoval
                                      ? "#f97316"
                                      : subject.color
                                    : "transparent",
                                  borderColor: isSelected
                                    ? isPendingRemoval
                                      ? "#f97316"
                                      : subject.color
                                    : undefined,
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
              </div>
            );
          })()}

          {/* Pending Changes Section */}
          {(() => {
            const pendingSubjects = allSubjects
              .filter((subject) => pendingRemovals.includes(subject.id))
              .sort((a, b) => a.order_index - b.order_index);

            if (pendingSubjects.length === 0) return null;

            return (
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-orange-600 uppercase tracking-wide">
                  Modifiche in Sospeso
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pendingSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="group relative overflow-hidden rounded-xl border-2 border-orange-500 opacity-50 cursor-not-allowed"
                      style={
                        {
                          "--subject-color": subject.color,
                          backgroundColor: `${subject.color}08`,
                          boxShadow: `0 8px 32px ${subject.color}20`,
                        } as React.CSSProperties
                      }
                    >
                      {/* Orange border and top bar */}
                      <div className="absolute inset-0 rounded-xl border-2 pointer-events-none border-orange-500" />
                      <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />

                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-orange-600">
                                {subject.name}
                              </h3>
                              {subject.maturita && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5 bg-orange-100 text-orange-600 border-orange-300"
                                >
                                  Maturità
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {subject.description}
                            </p>
                            <Badge className="text-xs bg-orange-500 text-white">
                              In Sospeso
                            </Badge>
                          </div>

                          <div className="ml-4 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full border-2 border-orange-500 bg-orange-500 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Available Subjects Section */}
          {(() => {
            const availableSubjects = allSubjects
              .filter(
                (subject) =>
                  !currentSubjects.includes(subject.id) &&
                  !pendingRemovals.includes(subject.id)
              )
              .sort((a, b) => a.order_index - b.order_index);

            if (availableSubjects.length === 0) return null;

            return (
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Altre Materie Disponibili
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableSubjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject.id);

                    return (
                      <div
                        key={subject.id}
                        className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? "border-transparent shadow-lg scale-[1.02]"
                            : "border-border hover:border-muted-foreground/30 hover:scale-[1.01]"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubjectToggle(subject.id, !isSelected);
                        }}
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
                                <h3 className="font-semibold md:text-foreground text-[var(--subject-color)] group-hover:text-[var(--subject-color)] transition-colors">
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

                              {/* Status badge */}
                              {isSelected && (
                                <Badge className="text-xs bg-green-500 text-white">
                                  Aggiunta
                                </Badge>
                              )}
                            </div>

                            {/* Check icon */}
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
                                  borderColor: isSelected
                                    ? subject.color
                                    : undefined,
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
              </div>
            );
          })()}
        </div>

        {/* Change Preview */}
        {hasChanges && !hasSimultaneousChanges && (
          <Card className="border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="w-5 h-5" />
                Anteprima Modifiche
                {previewLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              {getChangeDescription()}
            </CardHeader>

            {preview && !previewLoading && (
              <CardContent className="space-y-6">
                {/* Price Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="text-sm text-muted-foreground mb-1">
                      Piano Attuale
                    </div>
                    <div className="text-2xl font-bold">
                      €{preview.currentPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">/mese</div>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">
                      Nuovo Piano
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      €{preview.newPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">/mese</div>
                  </div>
                </div>

                {/* Proration Amount */}
                {preview.prorationAmount !== 0 && (
                  <div
                    className={`rounded-lg p-4 border-2 ${
                      preview.isUpgrade
                        ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                        : "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div
                          className={`font-medium ${
                            preview.isUpgrade
                              ? "text-red-800 dark:text-red-200"
                              : "text-green-800 dark:text-green-200"
                          }`}
                        >
                          {preview.isUpgrade
                            ? "Addebito Immediato"
                            : "Credito Applicato"}
                        </div>
                        <div
                          className={`text-sm ${
                            preview.isUpgrade
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {preview.isUpgrade
                            ? "Per il periodo rimanente di questo mese"
                            : "Applicato alla prossima fattura"}
                        </div>
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          preview.isUpgrade
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {preview.isUpgrade ? "+" : "-"}€
                        {Math.abs(preview.prorationAmount).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Materie selezionate:
                    </span>
                    <span className="font-medium">
                      {selectedSubjects.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Effettivo da:
                    </span>
                    <span className="font-medium">Immediatamente</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>
                    {preview.isUpgrade
                      ? "Le modifiche saranno applicate immediatamente e verrai addebitato per il periodo rimanente."
                      : "Le modifiche saranno applicate immediatamente e riceverai un credito per il periodo rimanente."}
                  </span>
                </div>
              </CardContent>
            )}

            {hasChanges && selectedSubjects.length === 0 && (
              <CardContent>
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Devi selezionare almeno una materia.</span>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        {hasChanges &&
          selectedSubjects.length > 0 &&
          !hasSimultaneousChanges && (
            <div className="flex gap-3">
              <Button
                onClick={() => setSelectedSubjects(currentSubjects)}
                variant="outline"
                className="flex-1"
              >
                Ripristina
              </Button>

              <AlertDialog
                open={confirmDialogOpen}
                onOpenChange={setConfirmDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    className="flex-1"
                    disabled={!preview || previewLoading}
                  >
                    {preview?.isUpgrade
                      ? "Aggiorna e Addebita Ora"
                      : "Passa a un piano inferiore"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      {preview?.isUpgrade ? (
                        <>
                          <CreditCard className="w-5 h-5 text-green-600" />
                          Conferma Aggiornamento
                        </>
                      ) : (
                        <>
                          <Minus className="w-5 h-5 text-orange-600" />
                          Conferma Modifica
                        </>
                      )}
                    </AlertDialogTitle>
                  </AlertDialogHeader>

                  <div className="space-y-4">
                    {/* Change Summary */}
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        {preview?.isUpgrade ? (
                          <Plus className="w-4 h-4 text-green-600" />
                        ) : (
                          <Minus className="w-4 h-4 text-orange-600" />
                        )}
                        <span className="font-medium">
                          {preview?.isUpgrade
                            ? "Passa a un piano superiore"
                            : "Passa a un piano inferiore"}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Prezzo attuale:</span>
                          <span>€{preview?.currentPrice.toFixed(2)}/mese</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nuovo prezzo:</span>
                          <span className="font-medium">
                            €{preview?.newPrice.toFixed(2)}/mese
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Materie selezionate:</span>
                          <span className="font-medium">
                            {selectedSubjects.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Immediate Action Info */}
                    {preview?.isUpgrade ? (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CreditCard className="w-4 h-4 text-green-600 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-medium text-green-800">
                              Addebito Immediato
                            </div>
                            <div className="text-sm text-green-700">
                              Verrai addebitato di €
                              {Math.abs(preview?.prorationAmount || 0).toFixed(
                                2
                              )}{" "}
                              per il periodo di fatturazione rimanente.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-medium text-orange-800">
                              Acesso alla materia
                            </div>
                            <div className="text-sm text-orange-700">
                              Avrai comunque accesso alla materia fino alla fine
                              del periodo attuale per nessun costo aggiuntivo.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePlanChange}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Elaborazione...
                        </>
                      ) : preview?.isUpgrade ? (
                        "Conferma e Addebita Ora"
                      ) : (
                        "Conferma Modifica"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
      </CardContent>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={!!loadingOverlayMessage}
        message={loadingOverlayMessage}
      />
    </Card>
  );
}
