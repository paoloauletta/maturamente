import { db } from "@/db/drizzle";
import {
  subscriptions,
  relationSubjectsUserTable,
  subjectsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateCustomPrice } from "@/lib/subscription-plans";
import type {
  SubscriptionStatus,
  UserSubjectAccess,
  SubscriptionData,
} from "@/types/subscriptionTypes";

export async function getUserSubscription(
  userId: string
): Promise<SubscriptionData | null> {
  const userSubscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.user_id, userId))
    .limit(1);

  return userSubscription.length > 0 ? userSubscription[0] : null;
}

export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus | null> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return null;
  }

  // All subscriptions are now custom plans with dynamic pricing
  const actualPrice = subscription.custom_price
    ? parseFloat(subscription.custom_price.toString())
    : calculateCustomPrice(subscription.subject_count || 0);

  return {
    isActive: subscription.status === "active",
    isPastDue: subscription.status === "past_due",
    isCanceled: subscription.status === "canceled",
    willCancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    currentPeriodEnd: subscription.current_period_end,
    subjectCount: subscription.subject_count || 0,
    price: actualPrice,
  };
}

export async function getUserSubjectAccess(
  userId: string
): Promise<UserSubjectAccess> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return {
      hasAccess: false,
      subjectsCount: 0,
      maxSubjects: 0,
      availableSlots: 0,
      selectedSubjects: [],
    };
  }

  // Get user's selected subjects
  const userSubjects = await db
    .select({
      subject_id: relationSubjectsUserTable.subject_id,
    })
    .from(relationSubjectsUserTable)
    .where(eq(relationSubjectsUserTable.user_id, userId));

  const selectedSubjects = userSubjects
    .map((s) => s.subject_id)
    .filter(Boolean) as string[];

  // The maxSubjects is based on what they paid for
  const maxSubjects = subscription.subject_count || selectedSubjects.length;

  return {
    hasAccess: true,
    subjectsCount: selectedSubjects.length,
    maxSubjects,
    availableSlots: Math.max(0, maxSubjects - selectedSubjects.length),
    selectedSubjects,
  };
}

export async function hasSubjectAccess(
  userId: string,
  subjectId: string
): Promise<boolean> {
  const userAccess = await getUserSubjectAccess(userId);

  if (!userAccess.hasAccess) {
    return false;
  }

  return userAccess.selectedSubjects.includes(subjectId);
}

export async function getAllAvailableSubjects(userId: string) {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return [];
  }

  // Get all subjects
  const allSubjects = await db.select().from(subjectsTable);

  return allSubjects;
}

export async function updateUserSubjectAccess(
  userId: string,
  subjectIds: string[]
): Promise<void> {
  // Remove all existing subject access for the user
  await db
    .delete(relationSubjectsUserTable)
    .where(eq(relationSubjectsUserTable.user_id, userId));

  // Add new subject access
  for (const subjectId of subjectIds) {
    await db.insert(relationSubjectsUserTable).values({
      user_id: userId,
      subject_id: subjectId,
    });
  }
}

export function canAccessFeature(
  subscription: SubscriptionData | null,
  feature: string
): boolean {
  if (!subscription || subscription.status !== "active") {
    return false;
  }

  // Since all plans are now custom, access is based on having an active subscription
  return true;
}

export function getSubscriptionLimits(subscription: SubscriptionData | null) {
  if (!subscription || subscription.status !== "active") {
    return {
      maxSubjects: 0,
      hasUnlimitedAccess: false,
    };
  }

  return {
    maxSubjects: subscription.subject_count || 0,
    hasUnlimitedAccess: false, // Could be changed if you want unlimited plans
  };
}

export async function validateSubjectAccess(
  userId: string,
  subjectIds: string[]
): Promise<{ isValid: boolean; error?: string }> {
  const subscription = await getUserSubscription(userId);

  if (!subscription || subscription.status !== "active") {
    return {
      isValid: false,
      error: "No active subscription found",
    };
  }

  const maxSubjects = subscription.subject_count || 0;

  if (subjectIds.length > maxSubjects) {
    return {
      isValid: false,
      error: `Cannot select more than ${maxSubjects} subjects`,
    };
  }

  return { isValid: true };
}

export async function getSubscriptionMetrics(userId: string) {
  const subscription = await getUserSubscription(userId);
  const userAccess = await getUserSubjectAccess(userId);

  if (!subscription) {
    return null;
  }

  return {
    isActive: subscription.status === "active",
    subjectsUsed: userAccess.subjectsCount,
    subjectsLimit: subscription.subject_count || 0,
    utilizationPercentage: subscription.subject_count
      ? (userAccess.subjectsCount / subscription.subject_count) * 100
      : 0,
    monthlyPrice: subscription.custom_price
      ? parseFloat(subscription.custom_price.toString())
      : 0,
    nextBillingDate: subscription.current_period_end,
  };
}
