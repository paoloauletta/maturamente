"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight } from "lucide-react";
import type { UserSubject } from "@/types/subjectsTypes";

interface SubjectCardProps {
  subject: UserSubject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  // Convert color to CSS custom property for theming
  const cardStyle = {
    "--subject-color": subject.color,
  } as React.CSSProperties;

  return (
    <Link href={`/${subject.slug}`} className="group block">
      <Card
        className="h-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer relative overflow-hidden bg-gradient-to-br from-background via-background to-background border-2 hover:border-[var(--subject-color)] group-hover:shadow-[var(--subject-color)]/20"
        style={cardStyle}
      >
        {/* Color accent bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--subject-color)]" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl font-semibold mb-2 group-hover:text-[var(--subject-color)] transition-colors">
                {subject.name}
              </CardTitle>
              {subject.maturita && (
                <Badge
                  className="mb-2 text-xs"
                  style={{
                    backgroundColor: `${subject.color}20`,
                    color: subject.color,
                    borderColor: `${subject.color}40`,
                  }}
                >
                  Maturità
                </Badge>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[var(--subject-color)] transition-colors transform group-hover:translate-x-1" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {subject.description}
          </p>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--subject-color)]/10">
              <FileText className="h-4 w-4" style={{ color: subject.color }} />
            </div>
            <div>
              <p className="text-sm font-medium">
                {subject.notes_count}{" "}
                {subject.notes_count === 1 ? "appunto" : "appunti"}
              </p>
              <p className="text-xs text-muted-foreground">disponibili</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
