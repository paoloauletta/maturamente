import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getNoteBySlug } from "@/utils/notes-data";
import { SingleNoteLayout } from "../../components/subject/notes/single-note/single-note-layout";
import { LoadingSpinner } from "@/app/components/shared/loading/skeletons/loading-spinner";
import { connection } from "next/server";

// Force dynamic rendering for authentication
export const dynamic = "force-dynamic";

interface NotePageProps {
  params: Promise<{
    "subject-slug": string;
    "note-slug": string;
  }>;
}

async function NotePageServer({
  subjectSlug,
  noteSlug,
}: {
  subjectSlug: string;
  noteSlug: string;
}) {
  await connection();
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  try {
    const note = await getNoteBySlug(subjectSlug, noteSlug, session.user.id);

    if (!note) {
      notFound();
    }

    return <SingleNoteLayout note={note} />;
  } catch (error) {
    console.error("Error fetching note:", error);
    notFound();
  }
}

function NotePageLoading() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left section - PDF placeholder */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <LoadingSpinner text="Caricamento appunto..." size="sm" />
      </div>

      {/* Right section - Chat placeholder */}
      <div className="w-80 lg:w-96 border-l bg-background flex items-center justify-center">
        <LoadingSpinner text="Caricamento chat..." size="sm" />
      </div>
    </div>
  );
}

export default async function NotePage({ params }: NotePageProps) {
  const { "subject-slug": subjectSlug, "note-slug": noteSlug } = await params;

  return (
    <div className="fixed top-14 lg:top-[60px] bottom-0 left-0 md:left-[280px] right-0 overflow-auto">
      <Suspense fallback={<NotePageLoading />}>
        <NotePageServer subjectSlug={subjectSlug} noteSlug={noteSlug} />
      </Suspense>
    </div>
  );
}
