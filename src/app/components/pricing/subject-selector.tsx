"use client";

import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

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

export function SubjectSelector({
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
