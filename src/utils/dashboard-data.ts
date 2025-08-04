import { unstable_cache } from "next/cache";
import { db } from "@/db/drizzle";
import {
  subscriptions,
  noteStudySessionsTable,
  notesTable,
  subjectsTable,
  relationSubjectsUserTable,
  flaggedNotesTable,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSubscriptionStatus } from "./subscription-utils";

export interface DashboardSubscriptionData {
  hasActiveSubscription: boolean;
  planName: string;
  daysUntilRenewal: number | null;
  renewalDate: string | null;
  price: number | null;
}

export interface DashboardStudyTimeData {
  totalHours: number;
  totalMinutes: number;
  weeklyData: Array<{
    day: string;
    hours: number;
    minutes: number;
  }>;
}

export interface DashboardRecentStudyData {
  id: string;
  title: string;
  subjectName: string;
  subjectSlug: string;
  subjectColor: string;
  slug: string;
  lastStudiedAt: Date;
  studyTimeMinutes: number;
  is_favorite: boolean;
}

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
 * Get study time data for dashboard display
 */
export async function getDashboardStudyTimeData(
  userId: string
): Promise<DashboardStudyTimeData> {
  // Get study sessions from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessions = await db
    .select({
      started_at: noteStudySessionsTable.started_at,
      last_active_at: noteStudySessionsTable.last_active_at,
    })
    .from(noteStudySessionsTable)
    .where(
      and(
        eq(noteStudySessionsTable.user_id, userId),
        sql`${noteStudySessionsTable.started_at} >= ${sevenDaysAgo}`
      )
    )
    .orderBy(desc(noteStudySessionsTable.started_at));

  // Calculate total study time
  let totalMinutes = 0;
  sessions.forEach((session) => {
    const startTime = new Date(session.started_at);
    const endTime = new Date(session.last_active_at);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
    totalMinutes += durationMinutes;
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Group by day for weekly data
  const sessionsByDay = sessions.reduce((acc, session) => {
    const date = new Date(session.started_at);
    const dayKey = date.toLocaleDateString("it-IT", { weekday: "short" });

    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(session);
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate time for each day
  const weeklyData = Object.entries(sessionsByDay).map(([day, daySessions]) => {
    let dayMinutes = 0;
    daySessions.forEach((session) => {
      const startTime = new Date(session.started_at);
      const endTime = new Date(session.last_active_at);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
      dayMinutes += durationMinutes;
    });

    return {
      day,
      hours: Math.floor(dayMinutes / 60),
      minutes: dayMinutes % 60,
    };
  });

  return {
    totalHours,
    totalMinutes: remainingMinutes,
    weeklyData,
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
