"use client";

import { useState } from "react";
import { Star, FileText, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Note } from "@/types/notesTypes";
import { ChatComponent, PDFComponent } from "./single-note-components";

interface SingleNoteLayoutProps {
  note: Note;
}

export function SingleNoteLayout({ note }: SingleNoteLayoutProps) {
  const [isFavorite, setIsFavorite] = useState(note.is_favorite);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const handleToggleFavorite = async () => {
    setIsTogglingFavorite(true);

    // Optimistic update
    setIsFavorite(!isFavorite);

    try {
      const response = await fetch("/api/notes/favorite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ noteId: note.id, isFavorite: !isFavorite }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle favorite");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert optimistic update on error
      setIsFavorite(isFavorite);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="md:text-4xl text-2xl font-semibold text-foreground truncate">
            {note.title}
          </h1>
          <div className="flex items-center gap-2">
            <Star
              className={cn(
                "md:h-5 h-4 md:w-5 w-4 transition-colors hover:text-yellow-400 hover:scale-110 transition-all cursor-pointer",
                isFavorite && "fill-yellow-400 text-yellow-400 cursor-pointer"
              )}
              onClick={handleToggleFavorite}
            />
          </div>
        </div>
      </div>

      {/* Mobile Tab Interface */}
      <div className="md:hidden flex-1">
        <Tabs defaultValue="pdf" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mt-4">
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="flex-1 mt-2">
            <div className="h-full rounded-lg border overflow-hidden">
              <PDFComponent note={note} />
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 mt-2">
            <div className="h-full rounded-lg border overflow-hidden">
              <ChatComponent />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Side-by-Side Layout */}
      <div className="hidden md:flex flex-1 bg-background">
        {/* Left section - PDF Viewer */}
        <div className="flex-1 flex flex-col">
          {/* PDF Viewer */}
          <div className="flex-1 relative">
            <PDFComponent note={note} />
          </div>
        </div>

        {/* Right section - AI Chat */}
        <div className="w-80 lg:w-96 border-l bg-background">
          <ChatComponent />
        </div>
      </div>
    </div>
  );
}
