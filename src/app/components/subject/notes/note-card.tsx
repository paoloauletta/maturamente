"use client";

import { Card } from "@/components/ui/card";
import { Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/notesTypes";

interface NoteCardProps {
  note: Note;
  onToggleFavorite?: (noteId: string, isFavorite: boolean) => void;
  isLoading?: boolean;
}

export function NoteCard({ note, onToggleFavorite, isLoading }: NoteCardProps) {
  const params = useParams();
  const subjectSlug = (params?.["subject-slug"] as string) || "";

  const handleToggleFavorite = () => {
    if (onToggleFavorite && !isLoading) {
      onToggleFavorite(note.id, !note.is_favorite);
    }
  };

  return (
    <Link href={`/${subjectSlug}/${note.slug}`}>
      <Card className="p-6 transition-all duration-200 cursor-pointer group bg-[var(--subject-color)]/5 border-[var(--subject-color)]/10">
        <div className="space-y-4">
          {/* Header with title and favorite */}
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900 dark:text-white text-lg leading-snug line-clamp-2">
              {note.title}
            </h3>

            {note.is_favorite && (
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  note.is_favorite
                    ? "fill-yellow-400 text-yellow-400 cursor-pointer"
                    : "hover:text-yellow-400 hover:scale-110 transition-all cursor-pointer"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
              />
            )}
          </div>

          {/* Footer with arrow */}
          <div className="flex justify-end">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--subject-color)]/20 group-hover:bg-[var(--subject-color)] transition-colors">
              <ArrowRight className="h-4 w-4 text-[var(--subject-color)] group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
