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
import { calculateCustomPrice } from "@/lib/subscription-plans";

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
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Seleziona Materie</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allSubjects.map((subject) => {
              const isSelected = selectedSubjects.includes(subject.id);
              const wasOriginallySelected = currentSubjects.includes(
                subject.id
              );
              const isPendingRemoval = pendingRemovals.includes(subject.id);

              return (
                <div
                  key={subject.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                      : isPendingRemoval
                      ? "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
                      : "bg-background"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={subject.id}
                    checked={isSelected}
                    onChange={(e) =>
                      handleSubjectToggle(subject.id, e.target.checked)
                    }
                    disabled={isPendingRemoval}
                    className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
                      isPendingRemoval ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={subject.id}
                      className={`text-sm font-medium ${
                        isPendingRemoval
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer"
                      }`}
                    >
                      {subject.name}
                    </label>
                    {/* Show status badges */}
                    <div className="flex gap-1 mt-1">
                      {wasOriginallySelected && (
                        <Badge variant="outline" className="text-xs">
                          Attuale
                        </Badge>
                      )}
                      {isSelected && !wasOriginallySelected && (
                        <Badge className="text-xs bg-green-500">Aggiunta</Badge>
                      )}
                      {!isSelected && wasOriginallySelected && (
                        <Badge variant="destructive" className="text-xs">
                          Rimozione
                        </Badge>
                      )}
                      {isPendingRemoval && (
                        <Badge
                          variant="outline"
                          className="text-xs border-orange-500 text-orange-600"
                        >
                          In Sospeso
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Change Preview */}
        {hasChanges && !hasSimultaneousChanges && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <h4 className="text-sm font-medium">Anteprima Modifiche</h4>
              {previewLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>

            {preview && !previewLoading && (
              <div className="space-y-3">
                {getChangeDescription()}

                <div className="bg-muted p-3 rounded space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Piano attuale:</span>
                    <span>€{preview.currentPrice.toFixed(2)}/mese</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Nuovo piano:</span>
                    <span>€{preview.newPrice.toFixed(2)}/mese</span>
                  </div>
                  {preview.prorationAmount !== 0 && (
                    <div className="flex justify-between text-sm font-medium border-t pt-2">
                      <span>
                        {preview.isUpgrade
                          ? "Addebito oggi:"
                          : "Credito applicato:"}
                      </span>
                      <span
                        className={
                          preview.isUpgrade ? "text-red-600" : "text-green-600"
                        }
                      >
                        {preview.isUpgrade ? "+" : "-"}€
                        {Math.abs(preview.prorationAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    {preview.isUpgrade
                      ? "Verrai addebitato immediatamente per l'importo ripartito che copre il periodo di fatturazione rimanente."
                      : "Riceverai un credito ripartito applicato alla tua prossima fattura."}
                  </span>
                </div>
              </div>
            )}

            {hasChanges && selectedSubjects.length === 0 && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Devi selezionare almeno una materia.</span>
              </div>
            )}
          </div>
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
