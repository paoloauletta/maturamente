"use client";

import PdfViewer from "@/app/components/shared/renderer/pdf-renderer";
import { MessageCircle } from "lucide-react";
import type { Note } from "@/types/notesTypes";

interface PDFComponentProps {
  note: Note;
}

interface ChatComponentProps {
  // Add any props needed for the chat component in the future
}

// PDF component for displaying the note's PDF content
export function PDFComponent({ note }: PDFComponentProps) {
  return (
    <div className="w-full h-full">
      <PdfViewer
        pdfUrl={note.pdf_url}
        className="w-full h-full"
        height="100%"
        initialScale={1.2}
      />
    </div>
  );
}

// Chat component for AI interaction (placeholder for now)
export function ChatComponent({}: ChatComponentProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium text-foreground">AI Tutor</h2>
        </div>
      </div>

      {/* Chat Content Placeholder */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">AI Chat</h3>
            <p className="text-sm text-muted-foreground">
              Presto potrai chattare con l'AI per ottenere aiuto con questo
              appunto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
