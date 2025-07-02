import { db } from "@/db/drizzle";
import {
  completedSimulationsTable,
  simulationsTable,
  simulationsCardsTable,
  completedTopicsTable,
  completedSubtopicsTable,
  topicsTable,
  subtopicsTable,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  getAllTopics,
  getAllSubtopics,
  getTopicsBySubjectId,
} from "@/utils/topics-subtopics";
import type {
  StatisticsData,
  MonthlyActivity,
  RecentSimulation,
  RecentTheoryItem,
  RawCompletedTopic,
  RawCompletedSubtopic,
  RawCompletedSimulation,
  MonthData,
} from "@/types/statisticsTypes";

/**
 * Get user's completed simulations data
 */
export async function getUserCompletedSimulations(
  userId: string
): Promise<RawCompletedSimulation[]> {
  return (await db.query.completedSimulationsTable.findMany({
    where: eq(completedSimulationsTable.user_id, userId),
    orderBy: (simulations, { desc }) => [desc(simulations.created_at)],
  })) as RawCompletedSimulation[];
}

/**
 * Get all available simulations
 */
export async function getAllSimulations() {
  return await db.query.simulationsTable.findMany();
}

/**
 * Get simulations filtered by subject
 */
export async function getSimulationsBySubject(subjectId: string) {
  return await db
    .select()
    .from(simulationsTable)
    .innerJoin(
      simulationsCardsTable,
      eq(simulationsTable.card_id, simulationsCardsTable.id)
    )
    .where(eq(simulationsCardsTable.subject_id, subjectId));
}

/**
 * Calculate simulation statistics
 */
export async function getSimulationStatistics(userId: string) {
  const [userCompletedSimulations, allSimulations] = await Promise.all([
    getUserCompletedSimulations(userId),
    getAllSimulations(),
  ]);

  // Calculate simulation statistics
  const completedSimulationIds = userCompletedSimulations.map(
    (sim) => sim.simulation_id
  );
  const uniqueCompletedSimulations = new Set(completedSimulationIds).size;
  const totalSimulations = allSimulations.length;
  const completionPercentage =
    totalSimulations > 0
      ? Math.round((uniqueCompletedSimulations / totalSimulations) * 100)
      : 0;

  // Calculate time spent on simulations (in minutes)
  const totalTimeSpent = userCompletedSimulations.reduce((total, sim) => {
    if (sim.completed_at && sim.started_at) {
      const start = new Date(sim.started_at);
      const end = new Date(sim.completed_at);
      const durationInMinutes = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60)
      );
      return total + durationInMinutes;
    }
    return total;
  }, 0);

  return {
    userCompletedSimulations,
    totalSimulations,
    completedSimulations: uniqueCompletedSimulations,
    completionPercentage,
    totalTimeSpent,
  };
}

/**
 * Calculate simulation statistics filtered by subject
 */
export async function getSimulationStatisticsBySubject(
  userId: string,
  subjectId: string
) {
  const [userCompletedSimulations, subjectSimulations] = await Promise.all([
    getUserCompletedSimulations(userId),
    getSimulationsBySubject(subjectId),
  ]);

  // Extract simulation IDs from the subject simulations
  const subjectSimulationIds = subjectSimulations.map(
    (sim) => sim.simulations.id
  );

  // Filter user completed simulations to only those from this subject
  const subjectUserCompletedSimulations = userCompletedSimulations.filter(
    (sim) =>
      sim.simulation_id && subjectSimulationIds.includes(sim.simulation_id)
  );

  // Calculate simulation statistics for this subject only
  const completedSimulationIds = subjectUserCompletedSimulations.map(
    (sim) => sim.simulation_id
  );
  const uniqueCompletedSimulations = new Set(completedSimulationIds).size;
  const totalSimulations = subjectSimulations.length;
  const completionPercentage =
    totalSimulations > 0
      ? Math.round((uniqueCompletedSimulations / totalSimulations) * 100)
      : 0;

  // Calculate time spent on simulations (in minutes)
  const totalTimeSpent = subjectUserCompletedSimulations.reduce(
    (total, sim) => {
      if (sim.completed_at && sim.started_at) {
        const start = new Date(sim.started_at);
        const end = new Date(sim.completed_at);
        const durationInMinutes = Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60)
        );
        return total + durationInMinutes;
      }
      return total;
    },
    0
  );

  return {
    userCompletedSimulations: subjectUserCompletedSimulations,
    totalSimulations,
    completedSimulations: uniqueCompletedSimulations,
    completionPercentage,
    totalTimeSpent,
  };
}

/**
 * Get user's completed topics and subtopics
 */
export async function getTheoryCompletionData(userId: string) {
  const [allTopics, allSubtopics] = await Promise.all([
    getAllTopics(),
    getAllSubtopics(),
  ]);

  const [completedTopics, completedSubtopics] = await Promise.all([
    db
      .select({
        topic_id: completedTopicsTable.topic_id,
        created_at: completedTopicsTable.created_at,
        name: topicsTable.name,
        slug: topicsTable.slug,
      })
      .from(completedTopicsTable)
      .innerJoin(topicsTable, eq(completedTopicsTable.topic_id, topicsTable.id))
      .where(eq(completedTopicsTable.user_id, userId))
      .orderBy(desc(completedTopicsTable.created_at)) as Promise<
      RawCompletedTopic[]
    >,

    db
      .select({
        subtopic_id: completedSubtopicsTable.subtopic_id,
        created_at: completedSubtopicsTable.created_at,
        name: subtopicsTable.name,
        topic_id: subtopicsTable.topic_id,
        slug: subtopicsTable.slug,
        topic_slug: topicsTable.slug,
      })
      .from(completedSubtopicsTable)
      .innerJoin(
        subtopicsTable,
        eq(completedSubtopicsTable.subtopic_id, subtopicsTable.id)
      )
      .innerJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
      .where(eq(completedSubtopicsTable.user_id, userId))
      .orderBy(desc(completedSubtopicsTable.created_at)) as Promise<
      RawCompletedSubtopic[]
    >,
  ]);

  // Calculate theory completion percentages
  const totalTopics = allTopics.length;
  const totalSubtopics = allSubtopics.length;
  const completedTopicsCount = completedTopics.length;
  const completedSubtopicsCount = completedSubtopics.length;

  const topicsCompletionPercentage = Math.round(
    (completedTopicsCount / totalTopics) * 100
  );
  const subtopicsCompletionPercentage = Math.round(
    (completedSubtopicsCount / totalSubtopics) * 100
  );

  return {
    allTopics,
    allSubtopics,
    completedTopics,
    completedSubtopics,
    totalTopics,
    totalSubtopics,
    completedTopicsCount,
    completedSubtopicsCount,
    topicsCompletionPercentage,
    subtopicsCompletionPercentage,
  };
}

/**
 * Get user's completed topics and subtopics filtered by subject
 */
export async function getTheoryCompletionDataBySubject(
  userId: string,
  subjectId: string
) {
  const [subjectTopics, allSubtopics] = await Promise.all([
    getTopicsBySubjectId(subjectId),
    getAllSubtopics(),
  ]);

  // Filter subtopics to only those belonging to subject topics
  const subjectTopicIds = subjectTopics.map((topic) => topic.id);
  const subjectSubtopics = allSubtopics.filter((subtopic) =>
    subjectTopicIds.includes(subtopic.topic_id)
  );

  const [completedTopics, completedSubtopics] = await Promise.all([
    db
      .select({
        topic_id: completedTopicsTable.topic_id,
        created_at: completedTopicsTable.created_at,
        name: topicsTable.name,
        slug: topicsTable.slug,
      })
      .from(completedTopicsTable)
      .innerJoin(topicsTable, eq(completedTopicsTable.topic_id, topicsTable.id))
      .where(
        and(
          eq(completedTopicsTable.user_id, userId),
          eq(topicsTable.subject_id, subjectId)
        )
      )
      .orderBy(desc(completedTopicsTable.created_at)) as Promise<
      RawCompletedTopic[]
    >,

    db
      .select({
        subtopic_id: completedSubtopicsTable.subtopic_id,
        created_at: completedSubtopicsTable.created_at,
        name: subtopicsTable.name,
        topic_id: subtopicsTable.topic_id,
        slug: subtopicsTable.slug,
        topic_slug: topicsTable.slug,
      })
      .from(completedSubtopicsTable)
      .innerJoin(
        subtopicsTable,
        eq(completedSubtopicsTable.subtopic_id, subtopicsTable.id)
      )
      .innerJoin(topicsTable, eq(subtopicsTable.topic_id, topicsTable.id))
      .where(
        and(
          eq(completedSubtopicsTable.user_id, userId),
          eq(topicsTable.subject_id, subjectId)
        )
      )
      .orderBy(desc(completedSubtopicsTable.created_at)) as Promise<
      RawCompletedSubtopic[]
    >,
  ]);

  // Calculate theory completion percentages for this subject
  const totalTopics = subjectTopics.length;
  const totalSubtopics = subjectSubtopics.length;
  const completedTopicsCount = completedTopics.length;
  const completedSubtopicsCount = completedSubtopics.length;

  const topicsCompletionPercentage =
    totalTopics > 0
      ? Math.round((completedTopicsCount / totalTopics) * 100)
      : 0;
  const subtopicsCompletionPercentage =
    totalSubtopics > 0
      ? Math.round((completedSubtopicsCount / totalSubtopics) * 100)
      : 0;

  return {
    allTopics: subjectTopics,
    allSubtopics: subjectSubtopics,
    completedTopics,
    completedSubtopics,
    totalTopics,
    totalSubtopics,
    completedTopicsCount,
    completedSubtopicsCount,
    topicsCompletionPercentage,
    subtopicsCompletionPercentage,
  };
}

/**
 * Generate monthly activity data for the last 6 months
 */
export function generateMonthlyActivity(
  userCompletedSimulations: RawCompletedSimulation[],
  completedTopics: RawCompletedTopic[],
  completedSubtopics: RawCompletedSubtopic[]
): MonthlyActivity[] {
  // Get the monthly activity data (last 6 months)
  const last6Months: MonthData[] = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: date.toLocaleString("it-IT", { month: "short" }),
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`,
    };
  }).reverse();

  // Calculate monthly activity for both simulations and theory
  return last6Months.map((monthData) => {
    // Count simulations in this month
    const simulationsInMonth = userCompletedSimulations.filter((sim) => {
      const simDate = new Date(sim.completed_at || sim.created_at);
      return (
        simDate.getMonth() === monthData.monthIndex &&
        simDate.getFullYear() === monthData.year
      );
    });

    // Count topics and subtopics completed in this month
    const topicsInMonth = completedTopics.filter((topic) => {
      const topicDate = new Date(topic.created_at);
      return (
        topicDate.getMonth() === monthData.monthIndex &&
        topicDate.getFullYear() === monthData.year
      );
    });

    const subtopicsInMonth = completedSubtopics.filter((subtopic) => {
      const subtopicDate = new Date(subtopic.created_at);
      return (
        subtopicDate.getMonth() === monthData.monthIndex &&
        subtopicDate.getFullYear() === monthData.year
      );
    });

    return {
      month: monthData.month,
      year: monthData.year,
      simulations: simulationsInMonth.length,
      topics: topicsInMonth.length,
      subtopics: subtopicsInMonth.length,
      yearMonth: monthData.yearMonth,
    };
  });
}

/**
 * Generate recent activity data (last 5 activities)
 */
export async function getRecentActivity(
  userCompletedSimulations: RawCompletedSimulation[],
  completedTopics: RawCompletedTopic[],
  completedSubtopics: RawCompletedSubtopic[]
): Promise<{
  recentSimulations: RecentSimulation[];
  recentTheory: RecentTheoryItem[];
}> {
  // Get recent activities (combine simulations and theory before limiting)
  const recentSimulations = await Promise.all(
    userCompletedSimulations.map(async (sim) => {
      const simulation = await db.query.simulationsTable.findFirst({
        where: sim.simulation_id
          ? eq(simulationsTable.id, sim.simulation_id)
          : undefined,
      });

      return {
        id: sim.id,
        title: simulation?.title || "Simulazione",
        date: sim.completed_at || sim.created_at, // Keep as Date for sorting
        attempt: sim.attempt,
        simulationId: sim.simulation_id,
        slug: simulation?.slug || null,
        type: "simulation" as const,
      };
    })
  );

  // Prepare theory completions without limiting
  const recentTheory = [
    ...completedTopics
      .filter((topic) => topic.topic_id)
      .map((topic) => ({
        id: topic.topic_id!,
        title: topic.name,
        date: topic.created_at,
        type: "topic" as const,
        slug: topic.slug,
      })),
    ...completedSubtopics
      .filter((subtopic) => subtopic.subtopic_id)
      .map((subtopic) => ({
        id: subtopic.subtopic_id!,
        title: subtopic.name,
        date: subtopic.created_at,
        type: "subtopic" as const,
        topicId: subtopic.topic_id,
        slug: subtopic.slug,
        topicSlug: subtopic.topic_slug,
      })),
  ];

  // Combine all activities, sort globally, then take top 5
  const allActivities = [...recentSimulations, ...recentTheory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((activity) => ({
      ...activity,
      date: new Date(activity.date).toLocaleDateString("it-IT"), // Format date after sorting
    }));

  // Split back into separate arrays for the client component
  const finalRecentSimulations = allActivities.filter(
    (activity) => activity.type === "simulation"
  ) as RecentSimulation[];

  const finalRecentTheory = allActivities.filter(
    (activity) => activity.type === "topic" || activity.type === "subtopic"
  ) as RecentTheoryItem[];

  return {
    recentSimulations: finalRecentSimulations,
    recentTheory: finalRecentTheory,
  };
}

/**
 * Get all statistics data for a user
 */
export async function getAllStatisticsData(
  userId: string
): Promise<StatisticsData> {
  // Get simulation statistics
  const simulationStats = await getSimulationStatistics(userId);

  // Get theory completion data
  const theoryData = await getTheoryCompletionData(userId);

  // Generate monthly activity
  const monthlyActivity = generateMonthlyActivity(
    simulationStats.userCompletedSimulations,
    theoryData.completedTopics,
    theoryData.completedSubtopics
  );

  // Get recent activity
  const { recentSimulations, recentTheory } = await getRecentActivity(
    simulationStats.userCompletedSimulations,
    theoryData.completedTopics,
    theoryData.completedSubtopics
  );

  return {
    // Simulation stats
    totalSimulations: simulationStats.totalSimulations,
    completedSimulations: simulationStats.completedSimulations,
    completionPercentage: simulationStats.completionPercentage,
    totalTimeSpent: simulationStats.totalTimeSpent,
    // Theory stats
    totalTopics: theoryData.totalTopics,
    completedTopicsCount: theoryData.completedTopicsCount,
    topicsCompletionPercentage: theoryData.topicsCompletionPercentage,
    totalSubtopics: theoryData.totalSubtopics,
    completedSubtopicsCount: theoryData.completedSubtopicsCount,
    subtopicsCompletionPercentage: theoryData.subtopicsCompletionPercentage,
    // Activity data
    monthlyActivity,
    // Recent activity
    recentSimulations,
    recentTheory,
  };
}

/**
 * Get all statistics data for a user filtered by subject
 */
export async function getAllStatisticsDataBySubject(
  userId: string,
  subjectId: string
): Promise<StatisticsData> {
  // Get simulation statistics for this subject
  const simulationStats = await getSimulationStatisticsBySubject(
    userId,
    subjectId
  );

  // Get theory completion data for this subject
  const theoryData = await getTheoryCompletionDataBySubject(userId, subjectId);

  // Generate monthly activity
  const monthlyActivity = generateMonthlyActivity(
    simulationStats.userCompletedSimulations,
    theoryData.completedTopics,
    theoryData.completedSubtopics
  );

  // Get recent activity
  const { recentSimulations, recentTheory } = await getRecentActivity(
    simulationStats.userCompletedSimulations,
    theoryData.completedTopics,
    theoryData.completedSubtopics
  );

  return {
    // Simulation stats
    totalSimulations: simulationStats.totalSimulations,
    completedSimulations: simulationStats.completedSimulations,
    completionPercentage: simulationStats.completionPercentage,
    totalTimeSpent: simulationStats.totalTimeSpent,
    // Theory stats
    totalTopics: theoryData.totalTopics,
    completedTopicsCount: theoryData.completedTopicsCount,
    topicsCompletionPercentage: theoryData.topicsCompletionPercentage,
    totalSubtopics: theoryData.totalSubtopics,
    completedSubtopicsCount: theoryData.completedSubtopicsCount,
    subtopicsCompletionPercentage: theoryData.subtopicsCompletionPercentage,
    // Activity data
    monthlyActivity,
    // Recent activity
    recentSimulations,
    recentTheory,
  };
}
