import { cache } from "react";
import { db } from "@/db/drizzle";
import {
  notesTable,
  flaggedNotesTable,
  subjectsTable,
  relationSubjectsUserTable,
} from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import type { Note, FavoriteNote, SubjectNotesData } from "@/types/notesTypes";
import type { NotesStatisticsData, RecentNote } from "@/types/statisticsTypes";
import {
  getSubjectStudyStats,
  getMonthlyStudyActivityBySubject,
} from "./study-sessions";

/**
 * Get all notes for a specific subject with favorite status
 * Cached to improve performance
 */
export const getSubjectNotes = cache(
  async (subjectSlug: string, userId: string): Promise<SubjectNotesData> => {
    try {
      // First get the subject by slug
      const subject = await db
        .select({
          id: subjectsTable.id,
          name: subjectsTable.name,
          color: subjectsTable.color,
          slug: subjectsTable.slug,
        })
        .from(subjectsTable)
        .where(eq(subjectsTable.slug, subjectSlug))
        .limit(1);

      if (!subject[0]) {
        throw new Error("Subject not found");
      }

      const subjectData = subject[0];

      // Get all notes for the subject with favorite information
      const notesWithFavorites = await db
        .select({
          id: notesTable.id,
          title: notesTable.title,
          description: notesTable.description,
          storage_path: notesTable.storage_path,
          subject_id: notesTable.subject_id,
          n_pages: notesTable.n_pages,
          slug: notesTable.slug,
          created_at: notesTable.created_at,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .where(eq(notesTable.subject_id, subjectData.id))
        .orderBy(desc(notesTable.created_at));

      // Transform to Note objects
      const allNotes: Note[] = notesWithFavorites.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        storage_path: row.storage_path,
        subject_id: row.subject_id || "",
        n_pages: row.n_pages || 1,
        slug: row.slug || "",
        created_at: row.created_at,
        is_favorite: !!row.is_favorite,
      }));

      // Filter favorite notes
      const favoriteNotes = allNotes.filter((note) => note.is_favorite);

      return {
        allNotes,
        favoriteNotes,
        subject: {
          id: subjectData.id,
          name: subjectData.name,
          color: subjectData.color,
          slug: subjectData.slug,
        },
      };
    } catch (error) {
      console.error("Error fetching subject notes:", error);
      throw new Error("Failed to fetch subject notes");
    }
  }
);

/**
 * Get favorite notes for a specific user
 */
export const getFavoriteNotes = cache(
  async (userId: string): Promise<FavoriteNote[]> => {
    try {
      const favoriteNotesRaw = await db
        .select({
          id: flaggedNotesTable.id,
          user_id: flaggedNotesTable.user_id,
          note_id: flaggedNotesTable.note_id,
          created_at: flaggedNotesTable.created_at,
          note_title: notesTable.title,
          note_description: notesTable.description,
          note_storage_path: notesTable.storage_path,
          note_subject_id: notesTable.subject_id,
          note_n_pages: notesTable.n_pages,
          note_slug: notesTable.slug,
          note_created_at: notesTable.created_at,
        })
        .from(flaggedNotesTable)
        .innerJoin(notesTable, eq(flaggedNotesTable.note_id, notesTable.id))
        .where(eq(flaggedNotesTable.user_id, userId))
        .orderBy(desc(flaggedNotesTable.created_at));

      return favoriteNotesRaw.map((row) => ({
        id: row.id,
        user_id: row.user_id || "",
        note_id: row.note_id || "",
        created_at: row.created_at,
        note: {
          id: row.note_id || "",
          title: row.note_title,
          description: row.note_description || "",
          storage_path: row.note_storage_path,
          subject_id: row.note_subject_id || "",
          n_pages: row.note_n_pages || 1,
          slug: row.note_slug || "",
          created_at: row.note_created_at,
          is_favorite: true,
        },
      }));
    } catch (error) {
      console.error("Error fetching favorite notes:", error);
      throw new Error("Failed to fetch favorite notes");
    }
  }
);

/**
 * Get a specific note by slug for a subject
 */
export const getNoteBySlug = cache(
  async (
    subjectSlug: string,
    noteSlug: string,
    userId: string
  ): Promise<Note | null> => {
    try {
      // First get the subject by slug
      const subject = await db
        .select({
          id: subjectsTable.id,
        })
        .from(subjectsTable)
        .where(eq(subjectsTable.slug, subjectSlug))
        .limit(1);

      if (!subject[0]) {
        return null;
      }

      // Get the specific note by slug within the subject
      const noteResult = await db
        .select({
          id: notesTable.id,
          title: notesTable.title,
          description: notesTable.description,
          storage_path: notesTable.storage_path,
          subject_id: notesTable.subject_id,
          n_pages: notesTable.n_pages,
          slug: notesTable.slug,
          created_at: notesTable.created_at,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
        .leftJoin(
          flaggedNotesTable,
          and(
            eq(flaggedNotesTable.note_id, notesTable.id),
            eq(flaggedNotesTable.user_id, userId)
          )
        )
        .where(
          and(
            eq(notesTable.subject_id, subject[0].id),
            eq(notesTable.slug, noteSlug)
          )
        )
        .limit(1);

      if (!noteResult[0]) {
        return null;
      }

      const note = noteResult[0];
      return {
        id: note.id,
        title: note.title,
        description: note.description || "",
        storage_path: note.storage_path,
        subject_id: note.subject_id || "",
        n_pages: note.n_pages || 1,
        slug: note.slug || "",
        created_at: note.created_at,
        is_favorite: !!note.is_favorite,
      };
    } catch (error) {
      console.error("Error fetching note by slug:", error);
      return null;
    }
  }
);

/**
 * Get recent notes across all subjects for a user
 */
export const getRecentNotesAcrossAllSubjects = cache(
  async (userId: string, limit: number = 5): Promise<RecentNote[]> => {
    try {
      const recentNotesQuery = await db
        .select({
          note_id: notesTable.id,
          note_title: notesTable.title,
          note_created_at: notesTable.created_at,
          note_slug: notesTable.slug,
          subject_name: subjectsTable.name,
          subject_slug: subjectsTable.slug,
          subject_color: subjectsTable.color,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
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
        .orderBy(desc(notesTable.created_at))
        .limit(limit);

      return recentNotesQuery.map((note) => ({
        id: note.note_id,
        title: note.note_title,
        date: note.note_created_at.toLocaleDateString("it-IT"),
        subjectName: note.subject_name,
        subjectSlug: note.subject_slug,
        subjectColor: note.subject_color,
        slug: note.note_slug || "",
        type: "note" as const,
        is_favorite: !!note.is_favorite,
      }));
    } catch (error) {
      console.error("Error fetching recent notes:", error);
      return [];
    }
  }
);

/**
 * Get notes statistics for a specific user and subject
 */
export const getNotesStatistics = cache(
  async (userId: string, subjectId: string): Promise<NotesStatisticsData> => {
    try {
      // Get all notes for the user from the specific subject only
      const allUserNotesQuery = await db
        .select({
          note_id: notesTable.id,
          note_title: notesTable.title,
          note_created_at: notesTable.created_at,
          note_slug: notesTable.slug,
          subject_name: subjectsTable.name,
          subject_slug: subjectsTable.slug,
          is_favorite: flaggedNotesTable.id,
        })
        .from(notesTable)
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
        .where(eq(subjectsTable.id, subjectId))
        .orderBy(desc(notesTable.created_at));

      // Calculate statistics
      const totalNotes = allUserNotesQuery.length;
      const favoriteNotes = allUserNotesQuery.filter(
        (note) => note.is_favorite
      ).length;
      const notesWithFavorites = favoriteNotes;
      const favoritePercentage =
        totalNotes > 0 ? Math.round((favoriteNotes / totalNotes) * 100) : 0;

      // Since we're filtering by one subject, totalSubjects is always 1 if notes exist
      const totalSubjects = allUserNotesQuery.length > 0 ? 1 : 0;

      // Get recent notes (last 5)
      const recentNotes: RecentNote[] = allUserNotesQuery
        .slice(0, 5)
        .map((note) => ({
          id: note.note_id,
          title: note.note_title,
          date: note.note_created_at.toLocaleDateString("it-IT"),
          subjectName: note.subject_name,
          slug: note.note_slug || "",
          type: "note" as const,
        }));

      // Get study session statistics for this subject
      const subjectSlug = allUserNotesQuery[0]?.subject_slug || "";
      const studyStats = await getSubjectStudyStats(userId, subjectSlug);
      const monthlyStudyActivity = await getMonthlyStudyActivityBySubject(
        userId,
        subjectSlug,
        6
      );

      return {
        totalNotes,
        favoriteNotes,
        totalSubjects,
        notesWithFavorites,
        favoritePercentage,
        recentNotes,
        // Study session data
        totalStudyTimeMinutes: studyStats.totalTimeMinutes,
        totalStudySessions: studyStats.totalSessions,
        averageSessionTimeMinutes: studyStats.averageTimeMinutes,
        monthlyStudyActivity,
      };
    } catch (error) {
      console.error("Error fetching notes statistics:", error);
      throw new Error("Failed to fetch notes statistics");
    }
  }
);
