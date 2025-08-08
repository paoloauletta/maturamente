"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Check, Minus } from "lucide-react";
import { useState } from "react";

export interface SubjectUI {
  id: string;
  name: string;
  description: string;
  color: string;
  maturita?: boolean;
  order_index: number;
}

interface SubjectCardProps {
  subject: SubjectUI;
  isSelected?: boolean;
  disabled?: boolean;
  state?: "current" | "available" | "pending-removal";
  onToggle?: (subjectId: string, next: boolean) => void;
  onUndoPendingRemoval?: (subjectId: string) => Promise<void>;
}

export function SubjectCard({
  subject,
  isSelected = false,
  disabled = false,
  state = "available",
  onToggle,
  onUndoPendingRemoval,
}: SubjectCardProps) {
  const [open, setOpen] = useState(false);
  const clickable = !!onToggle && state !== "pending-removal" && !disabled;

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
        clickable
          ? "cursor-pointer"
          : state === "pending-removal"
          ? "opacity-80"
          : ""
      } ${
        isSelected
          ? "border-transparent shadow-lg scale-[1.02]"
          : "border-border hover:border-muted-foreground/30 hover:scale-[1.01]"
      }`}
      onClick={(e) => {
        if (!clickable) return;
        e.preventDefault();
        onToggle?.(subject.id, !isSelected);
      }}
      style={{
        // Pricing page styling approach
        // Use CSS var for hover accents, and shadow when selected
        // Preserve all existing settings features
        boxShadow: isSelected ? `0 8px 32px ${subject.color}20` : undefined,
        ["--subject-color" as any]: subject.color,
      }}
    >
      {isSelected && (
        <div
          className="absolute inset-0 rounded-xl border-2 pointer-events-none"
          style={{ borderColor: subject.color }}
        />
      )}

      <div
        className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-60"
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

            {state === "current" && !isSelected && (
              <div className="flex flex-wrap gap-1">
                <Badge variant="destructive" className="text-xs">
                  Rimozione
                </Badge>
              </div>
            )}

            {state === "available" && isSelected && (
              <Badge className="text-xs bg-green-500 text-white">
                Aggiunta
              </Badge>
            )}

            {state === "pending-removal" && (
              <div className="flex items-center gap-2">
                <Badge className="text-xs bg-red-600 text-white">
                  In Sospeso
                </Badge>
                {onUndoPendingRemoval && (
                  <AlertDialog open={open} onOpenChange={setOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 gap-1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                        <span className="font-bold">Annulla Rimozione</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Minus className="w-4 h-4" />
                          Annulla Rimozione Materia
                        </AlertDialogTitle>
                        <div className="text-base text-blue-500 bg-blue-500/5 p-4 rounded-lg border border-blue-500/20">
                          Questa azione annullerà la rimozione programmata di “
                          {subject.name}”. L’abbonamento verrà aggiornato ora
                          senza alcun costo aggiuntivo.
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await onUndoPendingRemoval(subject.id);
                            setOpen(false);
                          }}
                          className="text-white"
                        >
                          Continua
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>

          <div className="ml-4 flex-shrink-0">
            <div
              className={`w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center ${
                isSelected
                  ? "shadow-md"
                  : "border-2 border-muted-foreground/30 group-hover:border-[var(--subject-color)]"
              }`}
              style={{
                backgroundColor: isSelected ? subject.color : "transparent",
                borderColor: isSelected ? subject.color : undefined,
              }}
            >
              {isSelected && <Check className="h-3.5 w-3.5 text-foreground" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
