/**
 * Core type definitions for the MaturaMate statistics system
 */

/**
 * Monthly Activity Types
 */
export interface MonthlyActivity {
  month: string;
  year: number;
  simulations: number;
  topics: number;
  subtopics: number;
  yearMonth: string;
}

/**
 * Recent Activity Types
 */
export interface RecentSimulation {
  id: string;
  title: string;
  date: string;
  attempt: number;
  simulationId: string | null;
  slug: string | null;
  type: "simulation";
}

export interface RecentTheoryItem {
  id: string;
  title: string;
  date: string;
  type: "topic" | "subtopic";
  topicId?: string;
  slug: string;
  topicSlug?: string; // For subtopics, we need the parent topic slug
}

/**
 * Notes Statistics Types
 */
export interface NotesStatisticsData {
  totalNotes: number;
  favoriteNotes: number;
  totalSubjects: number;
  notesWithFavorites: number;
  favoritePercentage: number;
  recentNotes: RecentNote[];
}

export interface RecentNote {
  id: string;
  title: string;
  date: string;
  subjectName: string;
  subjectSlug?: string;
  subjectColor?: string;
  slug: string;
  type: "note";
  is_favorite?: boolean;
}

export interface NotesStatisticsClientProps {
  data: NotesStatisticsData;
  subjectColor: string; // Hex color code for the subject
}

/**
 * Maturità Statistics Data Types
 */
export interface StatisticsData {
  // Simulation stats
  totalSimulations: number;
  completedSimulations: number;
  completionPercentage: number;
  totalTimeSpent: number;
  // Theory stats
  totalTopics: number;
  completedTopicsCount: number;
  topicsCompletionPercentage: number;
  totalSubtopics: number;
  completedSubtopicsCount: number;
  subtopicsCompletionPercentage: number;
  // Activity data
  monthlyActivity: MonthlyActivity[];
  // Recent activity
  recentSimulations: RecentSimulation[];
  recentTheory: RecentTheoryItem[];
}

/**
 * Component Props Types
 */
export interface StatisticsClientProps {
  data: StatisticsData;
}

/**
 * Combined Statistics Props
 */
export interface CombinedStatisticsProps {
  notesData: NotesStatisticsData;
  maturitaData?: StatisticsData; // Optional, only present if subject has maturità
  hasMaturita: boolean;
}

/**
 * Database Raw Result Types (before processing)
 */
export interface RawCompletedTopic {
  topic_id: string;
  created_at: Date;
  name: string;
  slug: string;
}

export interface RawCompletedSubtopic {
  subtopic_id: string;
  created_at: Date;
  name: string;
  topic_id: string;
  slug: string;
  topic_slug: string;
}

export interface RawCompletedSimulation {
  id: string;
  user_id: string;
  simulation_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  attempt: number;
}

/**
 * Month Data Helper Types
 */
export interface MonthData {
  month: string;
  year: number;
  monthIndex: number;
  yearMonth: string;
}
