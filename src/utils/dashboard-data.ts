import { unstable_cache } from "next/cache";
import { db } from "@/db/drizzle";
import { completedSimulationsTable, simulationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getAllTopics,
  getCompletedTopics,
  getCompletedSubtopics,
} from "./topics-subtopics";

export const getDashboardData = unstable_cache(
  async (userId: string) => {
    // Parallel data fetching for better performance
    const [
      userCompletedSimulations,
      allSimulations,
      allTopics,
      completedTopics,
      completedSubtopics,
    ] = await Promise.all([
      db.query.completedSimulationsTable.findMany({
        where: eq(completedSimulationsTable.user_id, userId),
        orderBy: (simulations, { desc }) => [desc(simulations.created_at)],
      }),
      db.query.simulationsTable.findMany(),
      getAllTopics(),
      getCompletedTopics(userId),
      getCompletedSubtopics(userId),
    ]);

    // Calculate statistics
    const completedSimulationIds = userCompletedSimulations.map(
      (sim) => sim.simulation_id
    );
    const uniqueCompletedSimulations = new Set(completedSimulationIds).size;

    // Process and return structured data
    return {
      simulations: {
        completed: userCompletedSimulations,
        total: allSimulations,
        completionPercentage: Math.round(
          (uniqueCompletedSimulations / allSimulations.length) * 100
        ),
        uniqueCompleted: uniqueCompletedSimulations,
      },
      topics: {
        all: allTopics,
        completed: completedTopics,
        completionPercentage: Math.round(
          (completedTopics.length / allTopics.length) * 100
        ),
      },
      subtopics: {
        completed: completedSubtopics,
      },
      // Additional data for dashboard
      recentActivity: {
        lastCompletedSimulation: userCompletedSimulations[0] || null,
        lastCompletedTopic: completedTopics[0] || null,
        lastCompletedSubtopic: completedSubtopics[0] || null,
      },
    };
  },
  ["dashboard-data"],
  {
    revalidate: 300, // 5 minutes
    tags: ["dashboard"],
  }
);

// User-specific dashboard data with user ID in cache key
export const getUserDashboardData = (userId: string) => {
  return unstable_cache(
    () => getDashboardData(userId),
    [`dashboard-data-${userId}`],
    {
      revalidate: 300, // 5 minutes
      tags: [`user-${userId}`, "dashboard"],
    }
  )();
};
