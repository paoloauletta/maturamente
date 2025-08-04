"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CreditCard,
  Plus,
  AlertTriangle,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
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
import SubscriptionChange from "@/app/components/subscription/subscription-change";

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

interface SubscriptionData {
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  willCancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | string | null;
  subjectCount: number; // Updated field name
  price: number; // Direct price instead of plan object
}

interface PendingSubscriptionChange {
  id: string;
  change_type: string;
  timing: string;
  new_subject_ids: string[];
  new_subject_count: number;
  new_price: string;
  scheduled_date: string | null;
  created_at: string;
}

interface UserSubjectAccess {
  hasAccess: boolean;
  subjectsCount: number;
  maxSubjects: number;
  availableSlots: number;
  selectedSubjects: string[];
}

interface Subject {
  id: string;
  name: string;
  description: string;
  slug: string;
}

interface SubscriptionManagementProps {
  userId: string;
}

export default function SubscriptionManagement({
  userId,
}: SubscriptionManagementProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userAccess, setUserAccess] = useState<UserSubjectAccess | null>(null);
  const [pendingChanges, setPendingChanges] = useState<
    PendingSubscriptionChange[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingOverlayMessage, setLoadingOverlayMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchSubscriptionData();
    fetchSubjects();
    fetchUserAccess();
    fetchPendingChanges();
  }, [userId]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch("/api/user/subscription-status");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchUserAccess = async () => {
    try {
      const response = await fetch("/api/user/subject-access");
      if (response.ok) {
        const data = await response.json();
        setUserAccess(data);
      }
    } catch (error) {
      console.error("Error fetching user access:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingChanges = async () => {
    try {
      const response = await fetch("/api/user/pending-subscription-changes");
      if (response.ok) {
        const data = await response.json();
        setPendingChanges(data.pendingChanges || []);
      }
    } catch (error) {
      console.error("Error fetching pending changes:", error);
    }
  };

  const openBillingPortal = async () => {
    try {
      setActionLoading(true);
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Impossibile creare sessione portale fatturazione");
      }

      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast.error("Impossibile aprire il portale fatturazione");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setActionLoading(true);
      setLoadingOverlayMessage("Cancellazione abbonamento in corso...");

      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Impossibile cancellare abbonamento");
      }

      toast.success(
        "L'abbonamento verrà cancellato alla fine del periodo di fatturazione"
      );

      // Automatic refresh after successful change
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Impossibile cancellare abbonamento");
      setActionLoading(false);
      setLoadingOverlayMessage("");
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      setLoadingOverlayMessage("Riattivazione abbonamento in corso...");

      const response = await fetch("/api/stripe/reactivate-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Impossibile riattivare abbonamento");
      }

      toast.success("Abbonamento riattivato con successo");

      // Automatic refresh after successful change
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      toast.error("Impossibile riattivare abbonamento");
      setActionLoading(false);
      setLoadingOverlayMessage("");
    }
  };

  const handleUndoPendingChange = async (changeId: string) => {
    try {
      setActionLoading(true);
      setLoadingOverlayMessage("Annullamento modifica in corso...");

      const response = await fetch("/api/stripe/undo-pending-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ changeId }),
      });

      if (!response.ok) {
        throw new Error("Impossibile annullare la modifica in sospeso");
      }

      toast.success("Modifica in sospeso annullata con successo");

      // Automatic refresh after successful change
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error undoing pending change:", error);
      toast.error("Impossibile annullare la modifica in sospeso");
      setActionLoading(false);
      setLoadingOverlayMessage("");
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";

    const dateObj = typeof date === "string" ? new Date(date) : date;

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "N/A";
    }

    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (subscription.isActive && !subscription.willCancelAtPeriodEnd) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Attivo
        </Badge>
      );
    }
    if (subscription.isActive && subscription.willCancelAtPeriodEnd) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          <Clock className="w-3 h-3 mr-1" />
          In Cancellazione
        </Badge>
      );
    }
    if (subscription.isPastDue) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Scaduto
        </Badge>
      );
    }
    if (subscription.isCanceled) {
      return (
        <Badge variant="secondary">
          <XCircle className="w-3 h-3 mr-1" />
          Cancellato
        </Badge>
      );
    }
    return <Badge variant="outline">Sconosciuto</Badge>;
  };

  // Get current user subjects
  const getCurrentSubjects = () => {
    if (!userAccess || !subjects.length) return [];
    return subjects.filter((subject) =>
      userAccess.selectedSubjects.includes(subject.id)
    );
  };

  // Get subjects that will be removed in pending changes
  const getSubjectsToBeRemoved = () => {
    if (!userAccess || !pendingChanges.length) return [];

    const subjectsToRemove: string[] = [];

    pendingChanges.forEach((change) => {
      if (change.change_type === "downgrade") {
        // Find subjects that are currently selected but not in the new plan
        const removedSubjects = userAccess.selectedSubjects.filter(
          (subjectId) => !change.new_subject_ids.includes(subjectId)
        );
        subjectsToRemove.push(...removedSubjects);
      }
    });

    return subjectsToRemove;
  };

  // Check if a subject is pending removal
  const isSubjectPendingRemoval = (subjectId: string) => {
    return getSubjectsToBeRemoved().includes(subjectId);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Gestione Abbonamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Gestione Abbonamento
          </CardTitle>
          <CardDescription>
            Non hai un abbonamento attivo. Abbonati per accedere alle
            funzionalità premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/pricing")}>
            Iscriviti subito
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Stato Abbonamento
            </span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Il tuo piano di abbonamento e stato attuale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo Piano</p>
              <p className="font-medium">Piano Personalizzato</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prezzo</p>
              <p className="font-medium">
                €{subscription.price.toFixed(2)}/mese
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Materie</p>
              <p className="font-medium">{subscription.subjectCount} materie</p>
              {getSubjectsToBeRemoved().length > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {getSubjectsToBeRemoved().length} in rimozione
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {subscription.willCancelAtPeriodEnd
                  ? "Cancellazione il"
                  : "Prossima fatturazione"}
              </p>
              <p className="font-medium">
                {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes Section */}
      {pendingChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Modifiche in Sospeso
            </CardTitle>
            <CardDescription>
              Hai modifiche al tuo abbonamento che saranno applicate alla
              prossima fatturazione
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingChanges.map((change) => (
              <div key={change.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-orange-500 text-orange-600"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {change.change_type === "downgrade"
                        ? "Modifica del piano"
                        : "Aggiornamento del piano"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Effettivo il {formatDate(change.scheduled_date)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUndoPendingChange(change.id)}
                    disabled={actionLoading}
                  >
                    Annulla Modifica
                  </Button>
                </div>

                {change.change_type === "downgrade" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Materie che verranno rimosse:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getSubjectsToBeRemoved().map((subjectId) => {
                        const subject = subjects.find(
                          (s) => s.id === subjectId
                        );
                        return subject ? (
                          <Badge
                            key={subjectId}
                            variant="destructive"
                            className="text-xs"
                          >
                            {subject.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Nuovo prezzo: €{parseFloat(change.new_price).toFixed(2)}
                      /mese
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subscription Change Section */}
      {subscription.isActive &&
        !subscription.willCancelAtPeriodEnd &&
        userAccess &&
        subjects.length > 0 && (
          <SubscriptionChange
            currentSubjects={userAccess.selectedSubjects}
            allSubjects={subjects}
            currentPrice={subscription.price}
            pendingRemovals={getSubjectsToBeRemoved()}
            onChangeComplete={() => {
              // Show success message and auto-refresh
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }}
          />
        )}

      {/* Billing Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Fatturazione e Pagamento
          </CardTitle>
          <CardDescription>
            Gestisci i tuoi metodi di pagamento e le informazioni di
            fatturazione
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={openBillingPortal}
            disabled={actionLoading}
            className="w-full gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            {actionLoading ? "Apertura..." : "Apri Portale Fatturazione"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Il portale fatturazione ti permette di aggiornare i metodi di
            pagamento, scaricare fatture e visualizzare la cronologia
            fatturazione.
          </p>
        </CardContent>
      </Card>

      {/* Subscription Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Azioni Abbonamento
          </CardTitle>
          <CardDescription>
            Gestisci lo stato del tuo abbonamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription.isActive && !subscription.willCancelAtPeriodEnd ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <XCircle className="w-4 h-4" />
                  Cancella Abbonamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancella Abbonamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sei sicuro di voler cancellare il tuo abbonamento? Perderai
                    l'accesso a tutte le funzionalità premium alla fine del tuo
                    periodo di fatturazione attuale (
                    {formatDate(subscription.currentPeriodEnd)}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantieni Abbonamento</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancella Abbonamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : subscription.willCancelAtPeriodEnd ? (
            <Button
              onClick={handleReactivateSubscription}
              disabled={actionLoading}
              className="w-full gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? "Riattivazione..." : "Riattiva Abbonamento"}
            </Button>
          ) : (
            <Button
              onClick={() => router.push("/pricing")}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Abbonati di Nuovo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={!!loadingOverlayMessage}
        message={loadingOverlayMessage}
      />
    </div>
  );
}
