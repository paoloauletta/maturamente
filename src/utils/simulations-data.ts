import { db } from "@/db/drizzle";
import {
  simulationsTable,
  simulationsCardsTable,
  completedSimulationsTable,
  flaggedSimulationsTable,
  simulationsSolutionsTable,
  relationSimulationSolutionTable,
  subjectsTable,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { cache } from "react";
import {
  Simulation,
  Solution,
  SimulationCard,
  SimulationCardRow,
} from "@/types/simulationsTypes";

// Cache simulations and cards data - these change very infrequently
export const getSimulationData = cache(async () => {
  // Get all simulation cards with subject names
  const cards = await db
    .select({
      id: simulationsCardsTable.id,
      title: simulationsCardsTable.title,
      description: simulationsCardsTable.description,
      year: simulationsCardsTable.year,
      subject_id: simulationsCardsTable.subject_id,
      subject_name: subjectsTable.name,
      order_index: simulationsCardsTable.order_index,
      slug: simulationsCardsTable.slug,
      created_at: simulationsCardsTable.created_at,
    })
    .from(simulationsCardsTable)
    .leftJoin(
      subjectsTable,
      eq(simulationsCardsTable.subject_id, subjectsTable.id)
    )
    .orderBy(simulationsCardsTable.year, simulationsCardsTable.title);

  // Get all simulations
  const simulations = await db
    .select()
    .from(simulationsTable)
    .orderBy(simulationsTable.title);

  return { cards, simulations };
});

// Get simulations and cards data filtered by subject_id
export const getSimulationDataBySubjectId = cache(async (subjectId: string) => {
  // Get simulation cards filtered by subject_id with subject names
  const cards = await db
    .select({
      id: simulationsCardsTable.id,
      title: simulationsCardsTable.title,
      description: simulationsCardsTable.description,
      year: simulationsCardsTable.year,
      subject_id: simulationsCardsTable.subject_id,
      subject_name: subjectsTable.name,
      order_index: simulationsCardsTable.order_index,
      slug: simulationsCardsTable.slug,
      created_at: simulationsCardsTable.created_at,
    })
    .from(simulationsCardsTable)
    .leftJoin(
      subjectsTable,
      eq(simulationsCardsTable.subject_id, subjectsTable.id)
    )
    .where(eq(simulationsCardsTable.subject_id, subjectId))
    .orderBy(simulationsCardsTable.year, simulationsCardsTable.title);

  // Get all simulations (we'll filter these by card_id later)
  const simulations = await db
    .select()
    .from(simulationsTable)
    .orderBy(simulationsTable.title);

  return { cards, simulations };
});

// Get all simulation cards (for static generation)
export const getAllSimulationCards = cache(async () => {
  const cards = await db
    .select({
      slug: simulationsCardsTable.slug,
    })
    .from(simulationsCardsTable);

  return cards;
});

// Get user's completed and flagged simulations
export async function getUserSimulationStatus(userId: string) {
  // Get user's completed simulations
  const completedSimulations = await db
    .select({
      simulation_id: completedSimulationsTable.simulation_id,
      completed_at: completedSimulationsTable.completed_at,
      started_at: completedSimulationsTable.started_at,
    })
    .from(completedSimulationsTable)
    .where(eq(completedSimulationsTable.user_id, userId));

  // Get user's flagged (favorited) simulations
  const flaggedSimulations = await db
    .select({
      simulation_id: flaggedSimulationsTable.simulation_id,
    })
    .from(flaggedSimulationsTable)
    .where(eq(flaggedSimulationsTable.user_id, userId));

  // Create maps for completed, started, and flagged simulations
  const completedSimulationMap: Record<string, boolean> = {};
  const startedSimulationMap: Record<string, boolean> = {};
  const flaggedSimulationMap: Record<string, boolean> = {};

  completedSimulations.forEach((sim) => {
    if (sim.simulation_id) {
      // Mark as completed if completed_at is not null
      if (sim.completed_at !== null) {
        completedSimulationMap[sim.simulation_id] = true;
      }

      // Mark as started but not completed if completed_at is null but started_at is not
      if (sim.completed_at === null && sim.started_at !== null) {
        startedSimulationMap[sim.simulation_id] = true;
      }
    }
  });

  // Mark flagged simulations
  flaggedSimulations.forEach((sim) => {
    if (sim.simulation_id) {
      flaggedSimulationMap[sim.simulation_id] = true;
    }
  });

  return {
    completedSimulationMap,
    startedSimulationMap,
    flaggedSimulationMap,
  };
}

// Get a single simulation by ID or slug
export const getSimulation = cache(
  async (idOrSlug: string): Promise<Simulation | null> => {
    // First try to find by slug since that's the primary use case
    const simulationBySlug = await db
      .select()
      .from(simulationsTable)
      .where(eq(simulationsTable.slug, idOrSlug));

    if (simulationBySlug.length > 0) {
      return simulationBySlug[0];
    }

    return null;
  }
);

// Get a completed simulation entry for a user and simulation
export async function getCompletedSimulation(
  userId: string,
  simulationId: string
) {
  const completedSimulation = await db
    .select({
      id: completedSimulationsTable.id,
      started_at: completedSimulationsTable.started_at,
      completed_at: completedSimulationsTable.completed_at,
    })
    .from(completedSimulationsTable)
    .where(
      and(
        eq(completedSimulationsTable.user_id, userId),
        eq(completedSimulationsTable.simulation_id, simulationId)
      )
    )
    .orderBy(desc(completedSimulationsTable.started_at));

  const hasStarted = completedSimulation.length > 0;
  const isCompleted =
    hasStarted && completedSimulation[0].completed_at !== null;

  // Format date for client component
  const startedAt = hasStarted
    ? completedSimulation[0].started_at?.toISOString()
    : null;

  return {
    hasStarted,
    isCompleted,
    completedSimulationId: hasStarted ? completedSimulation[0].id : null,
    startedAt,
  };
}

// Get solutions for a simulation
export const getSolutions = cache(
  async (simulationId: string): Promise<Solution[]> => {
    // Get solutions
    const allSolutions = await db
      .select()
      .from(simulationsSolutionsTable)
      .innerJoin(
        relationSimulationSolutionTable,
        eq(
          simulationsSolutionsTable.id,
          relationSimulationSolutionTable.solution_id
        )
      )
      .where(eq(relationSimulationSolutionTable.simulation_id, simulationId))
      .orderBy(relationSimulationSolutionTable.order_index);

    // Map to the expected Solution interface
    return allSolutions.map((sol) => ({
      id: sol.simulations_solutions.id,
      simulation_id: simulationId,
      title: sol.simulations_solutions.title,
      pdf_url: sol.simulations_solutions.pdf_url,
      order_index: sol.relation_simulations_solutions.order_index,
    }));
  }
);

// Get a simulation card by slug (for metadata generation)
export const getSimulationCardBySlug = cache(
  async (slug: string): Promise<SimulationCardRow | null> => {
    const card = await db
      .select({
        id: simulationsCardsTable.id,
        slug: simulationsCardsTable.slug,
        title: simulationsCardsTable.title,
        description: simulationsCardsTable.description,
        year: simulationsCardsTable.year,
        subject_id: simulationsCardsTable.subject_id,
        subject_name: subjectsTable.name,
        order_index: simulationsCardsTable.order_index,
      })
      .from(simulationsCardsTable)
      .leftJoin(
        subjectsTable,
        eq(simulationsCardsTable.subject_id, subjectsTable.id)
      )
      .where(eq(simulationsCardsTable.slug, slug))
      .limit(1);

    return card.length > 0 ? card[0] : null;
  }
);

// Get a single simulation card by ID with all its simulations
export async function getSimulationCardWithSimulations(
  cardId: string,
  userId: string | null
) {
  // Get the simulation card with subject name
  const card = await db
    .select({
      id: simulationsCardsTable.id,
      title: simulationsCardsTable.title,
      description: simulationsCardsTable.description,
      year: simulationsCardsTable.year,
      subject_id: simulationsCardsTable.subject_id,
      subject_name: subjectsTable.name,
      order_index: simulationsCardsTable.order_index,
      slug: simulationsCardsTable.slug,
      created_at: simulationsCardsTable.created_at,
    })
    .from(simulationsCardsTable)
    .leftJoin(
      subjectsTable,
      eq(simulationsCardsTable.subject_id, subjectsTable.id)
    )
    .where(eq(simulationsCardsTable.id, cardId));

  if (card.length === 0) {
    return null;
  }

  // Get all simulations for this card
  const simulations = await db
    .select()
    .from(simulationsTable)
    .where(eq(simulationsTable.card_id, cardId))
    .orderBy(simulationsTable.title);

  let simulationsWithUserInfo;

  if (userId) {
    // Get user's simulation status
    const {
      completedSimulationMap,
      startedSimulationMap,
      flaggedSimulationMap,
    } = await getUserSimulationStatus(userId);

    // Add user-specific info to each simulation
    simulationsWithUserInfo = simulations.map((sim) => ({
      ...sim,
      is_completed: completedSimulationMap[sim.id] || false,
      is_started: startedSimulationMap[sim.id] || false,
      is_flagged: flaggedSimulationMap[sim.id] || false,
    }));
  } else {
    // For unauthenticated users, set all statuses to false
    simulationsWithUserInfo = simulations.map((sim) => ({
      ...sim,
      is_completed: false,
      is_started: false,
      is_flagged: false,
    }));
  }

  // Return card with its simulations
  return {
    ...card[0],
    simulations: simulationsWithUserInfo,
  };
}

// Get simulation card data by slug with user-specific information
export async function getSimulationCardDataBySlug(
  slug: string,
  userId: string | null
) {
  // First get the card by slug
  const card = await getSimulationCardBySlug(slug);

  if (!card) {
    return null;
  }

  // Then get the full card data with simulations
  return await getSimulationCardWithSimulations(card.id, userId);
}

// Get simulation cards that contain at least one flagged simulation for a user
export async function getFavoriteSimulationCards(
  userId: string,
  subjectId?: string
): Promise<SimulationCard[]> {
  if (!userId) {
    return [];
  }

  // Get all flagged simulations for the user
  const flaggedSimulations = await db
    .select({
      simulation_id: flaggedSimulationsTable.simulation_id,
      card_id: simulationsTable.card_id,
    })
    .from(flaggedSimulationsTable)
    .innerJoin(
      simulationsTable,
      eq(flaggedSimulationsTable.simulation_id, simulationsTable.id)
    )
    .where(eq(flaggedSimulationsTable.user_id, userId));

  if (flaggedSimulations.length === 0) {
    return [];
  }

  // Get unique card IDs that contain flagged simulations
  const flaggedCardIds = Array.from(
    new Set(
      flaggedSimulations
        .filter((fs) => fs.card_id)
        .map((fs) => fs.card_id as string)
    )
  );

  if (flaggedCardIds.length === 0) {
    return [];
  }

  // Get simulation cards that contain flagged simulations
  const whereConditions = [inArray(simulationsCardsTable.id, flaggedCardIds)];

  if (subjectId) {
    whereConditions.push(eq(simulationsCardsTable.subject_id, subjectId));
  }

  const cards = await db
    .select({
      id: simulationsCardsTable.id,
      title: simulationsCardsTable.title,
      description: simulationsCardsTable.description,
      year: simulationsCardsTable.year,
      subject_id: simulationsCardsTable.subject_id,
      subject_name: subjectsTable.name,
      order_index: simulationsCardsTable.order_index,
      slug: simulationsCardsTable.slug,
      created_at: simulationsCardsTable.created_at,
    })
    .from(simulationsCardsTable)
    .leftJoin(
      subjectsTable,
      eq(simulationsCardsTable.subject_id, subjectsTable.id)
    )
    .where(and(...whereConditions))
    .orderBy(
      desc(simulationsCardsTable.year),
      simulationsCardsTable.order_index
    );

  if (cards.length === 0) {
    return [];
  }

  // Get all simulations for these cards
  const cardIds = cards.map((card) => card.id);
  const simulations = await db
    .select()
    .from(simulationsTable)
    .where(inArray(simulationsTable.card_id, cardIds))
    .orderBy(simulationsTable.title);

  // Get user's simulation status
  const { completedSimulationMap, startedSimulationMap, flaggedSimulationMap } =
    await getUserSimulationStatus(userId);

  // Add user-specific info to simulations
  const simulationsWithStatus = simulations.map((sim) => ({
    ...sim,
    is_completed: completedSimulationMap[sim.id] || false,
    is_started: startedSimulationMap[sim.id] || false,
    is_flagged: flaggedSimulationMap[sim.id] || false,
  }));

  // Group simulations by card ID
  const simulationsByCardId = simulationsWithStatus.reduce((map, sim) => {
    if (sim.card_id) {
      if (!map[sim.card_id]) {
        map[sim.card_id] = [];
      }
      map[sim.card_id].push(sim);
    }
    return map;
  }, {} as Record<string, typeof simulationsWithStatus>);

  // Construct simulation cards with their simulations
  const favoriteSimulationCards = cards.map((card) => ({
    ...card,
    simulations: simulationsByCardId[card.id] || [],
  })) as SimulationCard[];

  return favoriteSimulationCards;
}
