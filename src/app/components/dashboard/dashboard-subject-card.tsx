"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { UserSubject } from "@/types/subjectsTypes";

interface DashboardSubjectCardProps {
  subject: UserSubject;
}

export function DashboardSubjectCard({ subject }: DashboardSubjectCardProps) {
  const subjectColor = subject.color;

  return (
    <Link href={`/${subject.slug}`} className="group block">
      <div className="transition-all duration-200 hover:bg-muted/50 cursor-pointer p-4 border border-border rounded-md h-full flex flex-col justify-between">
        <div className="flex flex-col">
          <h3
            className="font-semibold text-base mb-1 text-[color:var(--subject-color)]"
            style={
              {
                "--subject-color": subjectColor,
              } as React.CSSProperties
            }
          >
            {subject.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            Esplora i tuoi appunti di {subject.name}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {subject.notes_count} Appunti disponibili
          </p>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 ml-2" />
        </div>
      </div>
    </Link>
  );
}
