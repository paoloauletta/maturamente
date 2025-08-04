import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  calculateCustomPrice,
  getStripeLineItemsForCustom,
} from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newSubjectIds } = await request.json();

    if (
      !newSubjectIds ||
      !Array.isArray(newSubjectIds) ||
      newSubjectIds.length === 0
    ) {
      return NextResponse.json(
        { error: "newSubjectIds is required and must be a non-empty array" },
        { status: 400 }
      );
    }

    // Get user's current subscription
    const userSubscription = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.user_id, session.user.id))
      .limit(1);

    if (
      !userSubscription.length ||
      !userSubscription[0].stripe_subscription_id
    ) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const currentSubscription = userSubscription[0];
    const stripeSubscriptionId = currentSubscription.stripe_subscription_id;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "Invalid subscription ID" },
        { status: 400 }
      );
    }

    const currentSubjectCount = currentSubscription.subject_count || 0;
    const newSubjectCount = newSubjectIds.length;

    // Calculate pricing
    const currentPrice = parseFloat(currentSubscription.custom_price || "0");
    const newPrice = calculateCustomPrice(newSubjectCount);

    // Determine change type
    const changeType =
      newSubjectCount > currentSubjectCount
        ? "upgrade"
        : newSubjectCount < currentSubjectCount
        ? "downgrade"
        : "no_change";

    if (changeType === "no_change") {
      return NextResponse.json({
        currentPrice,
        newPrice,
        prorationAmount: 0,
        isUpgrade: false,
        isDowngrade: false,
        changeType: "no_change",
        effectiveDate: new Date().toISOString(),
      });
    }

    try {
      // Get the current Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      // Get the new line items for the target subscription
      const newLineItems = getStripeLineItemsForCustom(newSubjectCount);

      // Calculate proration manually since we want to provide an accurate preview
      // This calculates how much of the billing period remains and prorates accordingly
      const periodProgress = getCurrentPeriodProgress(currentSubscription);
      const priceDifference = newPrice - currentPrice;
      // For downgrades, no proration credit is given - user keeps access until period end
      const prorationAmount =
        changeType === "downgrade" ? 0 : priceDifference * (1 - periodProgress);

      console.log("Preview calculation:", {
        currentPrice,
        newPrice,
        currentSubjectCount,
        newSubjectCount,
        changeType,
        prorationAmount,
        periodProgress,
        priceDifference,
      });

      return NextResponse.json({
        currentPrice,
        newPrice,
        prorationAmount,
        isUpgrade: changeType === "upgrade",
        isDowngrade: changeType === "downgrade",
        changeType,
        effectiveDate: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error calculating preview:", error);

      // Fallback calculation if Stripe preview fails
      const periodProgress = getCurrentPeriodProgress(currentSubscription);
      const priceDifference = newPrice - currentPrice;
      // For downgrades, no proration credit is given - user keeps access until period end
      const estimatedProration =
        changeType === "downgrade" ? 0 : priceDifference * (1 - periodProgress);

      console.log("Using fallback calculation:", {
        periodProgress,
        priceDifference,
        estimatedProration,
      });

      return NextResponse.json({
        currentPrice,
        newPrice,
        prorationAmount: estimatedProration,
        isUpgrade: changeType === "upgrade",
        isDowngrade: changeType === "downgrade",
        changeType,
        effectiveDate: new Date().toISOString(),
        estimated: true,
      });
    }
  } catch (error) {
    console.error("Error processing plan change preview:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate how far through the current billing period we are
function getCurrentPeriodProgress(subscription: any): number {
  if (!subscription.current_period_start || !subscription.current_period_end) {
    return 0;
  }

  const now = new Date().getTime();
  const periodStart = new Date(subscription.current_period_start).getTime();
  const periodEnd = new Date(subscription.current_period_end).getTime();

  const totalPeriod = periodEnd - periodStart;
  const elapsed = now - periodStart;

  return Math.max(0, Math.min(1, elapsed / totalPeriod));
}
