import { db } from "@/db/drizzle";
import {
  noteStudySessionsTable,
  notesTable,
  subjectsTable,
  relationSubjectsUserTable,
  flaggedNotesTable,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSubscriptionStatus } from "./subscription-utils";
import {
  DashboardSubscriptionData,
  DashboardStudyTimeData,
  DashboardRecentStudyData,
} from "@/types/dashboardTypes";

/**
 * Get subscription data for dashboard display
 */
export async function getDashboardSubscriptionData(
  userId: string
): Promise<DashboardSubscriptionData> {
  const subscriptionStatus = await getSubscriptionStatus(userId);

  if (!subscriptionStatus || !subscriptionStatus.isActive) {
    return {
      hasActiveSubscription: false,
      planName: "Nessun piano attivo",
      daysUntilRenewal: null,
      renewalDate: null,
      price: null,
    };
  }

  const currentDate = new Date();
  const renewalDate = subscriptionStatus.currentPeriodEnd;

  let daysUntilRenewal: number | null = null;
  let renewalDateString: string | null = null;

  if (renewalDate) {
    const renewalDateObj =
      typeof renewalDate === "string" ? new Date(renewalDate) : renewalDate;
    daysUntilRenewal = Math.ceil(
      (renewalDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    renewalDateString = renewalDateObj.toLocaleDateString("it-IT");
  }

  return {
    hasActiveSubscription: true,
    planName: `Piano ${subscriptionStatus.subjectCount} Materie`,
    daysUntilRenewal,
    renewalDate: renewalDateString,
    price: subscriptionStatus.price,
  };
}

/**
 * Get recent study sessions for dashboard display
 */
export async function getDashboardRecentStudyData(
  userId: string,
  limit: number = 6
): Promise<DashboardRecentStudyData[]> {
  const recentSessions = await db
    .select({
      sessionId: noteStudySessionsTable.id,
      noteId: noteStudySessionsTable.note_id,
      noteTitle: notesTable.title,
      noteSlug: notesTable.slug,
      subjectName: subjectsTable.name,
      subjectSlug: subjectsTable.slug,
      subjectColor: subjectsTable.color,
      started_at: noteStudySessionsTable.started_at,
      last_active_at: noteStudySessionsTable.last_active_at,
      is_favorite: flaggedNotesTable.id,
    })
    .from(noteStudySessionsTable)
    .innerJoin(notesTable, eq(noteStudySessionsTable.note_id, notesTable.id))
    .innerJoin(subjectsTable, eq(notesTable.subject_id, subjectsTable.id))
    .innerJoin(
      relationSubjectsUserTable,
      and(
        eq(relationSubjectsUserTable.subject_id, subjectsTable.id),
        eq(relationSubjectsUserTable.user_id, userId)
      )
    )
    .leftJoin(
      flaggedNotesTable,
      and(
        eq(flaggedNotesTable.note_id, notesTable.id),
        eq(flaggedNotesTable.user_id, userId)
      )
    )
    .where(eq(noteStudySessionsTable.user_id, userId))
    .orderBy(desc(noteStudySessionsTable.last_active_at))
    .limit(limit);

  // Group by note to get the most recent session for each note
  const notesMap = new Map<string, any>();

  recentSessions.forEach((session) => {
    const noteId = session.noteId;
    if (
      !notesMap.has(noteId) ||
      new Date(session.last_active_at) >
        new Date(notesMap.get(noteId).last_active_at)
    ) {
      notesMap.set(noteId, session);
    }
  });

  // Convert to array and calculate study time
  return Array.from(notesMap.values()).map((session) => {
    const startTime = new Date(session.started_at);
    const endTime = new Date(session.last_active_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    const studyTimeMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));

    return {
      id: session.noteId,
      title: session.noteTitle,
      subjectName: session.subjectName,
      subjectSlug: session.subjectSlug,
      subjectColor: session.subjectColor,
      slug: session.noteSlug || "",
      lastStudiedAt: new Date(session.last_active_at),
      studyTimeMinutes,
      is_favorite: !!session.is_favorite,
    };
  });
}
