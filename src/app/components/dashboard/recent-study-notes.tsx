import React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Star } from "lucide-react";
import type { DashboardRecentStudyData } from "@/utils/dashboard-data";

interface RecentStudyNotesProps {
  recentNotes: DashboardRecentStudyData[];
}

export function RecentStudyNotes({ recentNotes }: RecentStudyNotesProps) {
  if (recentNotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nessuna sessione di studio recente</p>
        <p className="text-sm mt-1">
          Inizia a studiare per vedere qui i tuoi appunti recenti
        </p>
      </div>
    );
  }

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  };

  const formatLastStudied = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Ora";
    } else if (diffInHours < 24) {
      return `${diffInHours}h fa`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}g fa`;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {recentNotes.map((note) => (
        <Link
          key={note.id}
          href={`/${note.subjectSlug}/${note.slug}`}
          className="block group"
        >
          <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors h-full">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2 flex-1">
                {note.title}
              </h3>
              {note.is_favorite && (
                <div className="ml-2 flex-shrink-0">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatStudyTime(note.studyTimeMinutes)}</span>
              <span>•</span>
              <span>{formatLastStudied(note.lastStudiedAt)}</span>
            </div>

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
  );
}
