import { db } from "@/db/drizzle";
import {
  flaggedSimulationsTable,
  simulationsTable,
  simulationsCardsTable,
  completedSimulationsTable,
  subjectsTable,
} from "@/db/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import {
  type FlaggedSimulation,
  type RawFlaggedSimulation,
} from "@/types/favoritesTypes";

/**
 * Fetch all flagged simulations with card details for a user
 */
export async function getFlaggedSimulations(
  userId: string
): Promise<FlaggedSimulation[]> {
  // Fetch flagged simulations with card details and subject names
  const flaggedSimulationsRaw = await db
    .select({
      id: simulationsTable.id,
      title: simulationsTable.title,
      description: simulationsTable.description,
      pdf_url: simulationsTable.pdf_url,
      time_in_min: simulationsTable.time_in_min,
      is_complete: simulationsTable.is_complete,
      card_id: simulationsTable.card_id,
      card_title: simulationsCardsTable.title,
      year: simulationsCardsTable.year,
      subject_id: simulationsCardsTable.subject_id,
      subject_name: subjectsTable.name,
      created_at: flaggedSimulationsTable.created_at,
      slug: simulationsTable.slug,
    })
    .from(flaggedSimulationsTable)
    .innerJoin(
      simulationsTable,
      eq(flaggedSimulationsTable.simulation_id, simulationsTable.id)
    )
    .innerJoin(
      simulationsCardsTable,
      eq(simulationsTable.card_id, simulationsCardsTable.id)
    )
    .leftJoin(
      subjectsTable,
      eq(simulationsCardsTable.subject_id, subjectsTable.id)
    )
    .where(eq(flaggedSimulationsTable.user_id, userId))
    .orderBy(desc(simulationsCardsTable.year));

  // Process simulations to add completion status
  const flaggedSimulations = await Promise.all(
    flaggedSimulationsRaw.map(async (simulation: RawFlaggedSimulation) => {
      // Check if user has completed the simulation
      const completedQuery = await db
        .select({ id: completedSimulationsTable.id })
        .from(completedSimulationsTable)
        .where(
          and(
            eq(completedSimulationsTable.user_id, userId),
            eq(completedSimulationsTable.simulation_id, simulation.id),
            isNotNull(completedSimulationsTable.completed_at)
          )
        );

      const isCompleted = completedQuery.length > 0;

      // Check if user has started the simulation
      const startedQuery = await db
        .select({ id: completedSimulationsTable.id })
        .from(completedSimulationsTable)
        .where(
          and(
            eq(completedSimulationsTable.user_id, userId),
            eq(completedSimulationsTable.simulation_id, simulation.id)
          )
        );

      const isStarted = startedQuery.length > 0;

      return {
        ...simulation,
        is_completed: isCompleted,
        is_started: isStarted || isCompleted,
        is_flagged: true, // Always true since these are favorites
      };
    })
  );

  return flaggedSimulations;
}

/**
 * Fetch all user's favorites data in one function
 */
export async function getAllFavoritesData(userId: string) {
  const [flaggedSimulations] = await Promise.all([
    getFlaggedSimulations(userId),
  ]);

  return {
    flaggedSimulations,
  };
}
