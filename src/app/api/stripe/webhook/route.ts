import { NextRequest, NextResponse } from "next/server";
import { stripe, SUBSCRIPTION_PLANS, calculateCustomPrice } from "@/lib/stripe";
import { db } from "@/db/drizzle";
import {
  subscriptions,
  relationSubjectsUserTable,
  pendingSubscriptionChanges,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("Webhook received:", {
      type: event.type,
      id: event.id,
      objectType: (event.data.object as any).object,
    });
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        console.log("Processing checkout.session.completed webhook");
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
        console.log("Processing customer.subscription.updated webhook");
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        console.log("Processing customer.subscription.deleted webhook");
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        console.log("Processing invoice.payment_succeeded webhook");
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "subscription_schedule.completed":
        console.log("Processing subscription_schedule.completed webhook");
        await handleSubscriptionScheduleCompleted(
          event.data.object as Stripe.SubscriptionSchedule
        );
        break;

      case "subscription_schedule.canceled":
        console.log("Processing subscription_schedule.canceled webhook");
        await handleSubscriptionScheduleCanceled(
          event.data.object as Stripe.SubscriptionSchedule
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log(`Successfully processed webhook: ${event.type} - ${event.id}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata!;

  console.log("Handling checkout session completed:", {
    sessionId: session.id,
    mode: session.mode,
    paymentStatus: session.payment_status,
    metadata: metadata,
  });

  // Check if this is an immediate upgrade checkout
  if (metadata.action === "immediate_upgrade") {
    console.log("Detected immediate upgrade checkout, processing...");
    await handleImmediateUpgradeCheckout(session);
    return;
  }

  console.log("Processing regular subscription checkout");

  // Handle regular subscription checkout
  const { userId, selectedSubjects, customPrice, subjectCount } = metadata;
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ["items.data.price"] }
  );

  // Calculate subject count and price
  const actualSubjectCount = subjectCount
    ? parseInt(subjectCount)
    : JSON.parse(selectedSubjects).length;
  const actualCustomPrice = customPrice
    ? parseFloat(customPrice)
    : calculateCustomPrice(actualSubjectCount);

  // Create or update subscription record
  await db
    .insert(subscriptions)
    .values({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0].price.id,
      status: subscription.status,
      subject_count: actualSubjectCount,
      custom_price: actualCustomPrice.toString(),
      current_period_start: new Date(
        (subscription as any).current_period_start * 1000
      ),
      current_period_end: new Date(
        (subscription as any).current_period_end * 1000
      ),
      cancel_at_period_end: (subscription as any).cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.user_id,
      set: {
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        subject_count: actualSubjectCount,
        custom_price: actualCustomPrice.toString(),
        current_period_start: new Date(
          (subscription as any).current_period_start * 1000
        ),
        current_period_end: new Date(
          (subscription as any).current_period_end * 1000
        ),
        cancel_at_period_end: (subscription as any).cancel_at_period_end,
        updated_at: new Date(),
      },
    });

  // Add selected subjects to user's access
  const subjects = JSON.parse(selectedSubjects);
  for (const subjectId of subjects) {
    await db
      .insert(relationSubjectsUserTable)
      .values({
        user_id: userId,
        subject_id: subjectId,
      })
      .onConflictDoNothing();
  }
}

async function handleImmediateUpgradeCheckout(
  session: Stripe.Checkout.Session
) {
  const { userId, newSubjectIds, newSubjectCount, subscriptionId } =
    session.metadata!;

  console.log("Processing immediate upgrade checkout completion:", {
    userId,
    newSubjectIds,
    newSubjectCount,
    subscriptionId,
    sessionId: session.id,
    paymentStatus: session.payment_status,
  });

  try {
    // Verify payment was successful
    if (session.payment_status !== "paid") {
      console.error(
        "Payment not completed for immediate upgrade:",
        session.payment_status
      );
      return;
    }

    // Get the subscription to update
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscriptionId!
    );

    console.log("Current subscription details:", {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      currentItems: stripeSubscription.items.data.map((item) => ({
        id: item.id,
        priceId: item.price.id,
        quantity: item.quantity,
      })),
    });

    // Calculate new pricing
    const newSubjectCountNum = parseInt(newSubjectCount!);
    const newPrice = calculateCustomPrice(newSubjectCountNum);

    console.log("Upgrade calculations:", {
      newSubjectCount: newSubjectCountNum,
      newPrice: newPrice,
    });

    // Get new line items
    const { getStripeLineItemsForCustom } = await import("@/lib/stripe");
    const newLineItems = getStripeLineItemsForCustom(newSubjectCountNum);

    console.log("New line items for subscription:", newLineItems);

    // Update subscription items using a more robust approach
    try {
      // First, remove all existing items
      const itemsToDelete = stripeSubscription.items.data.map((item) => ({
        id: item.id,
        deleted: true,
      }));

      // Then add new items
      const itemsToAdd = newLineItems.map((item) => ({
        price: item.price,
        quantity: item.quantity,
      }));

      const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [...itemsToDelete, ...itemsToAdd],
        proration_behavior: "none", // We already handled proration via checkout
      };

      console.log("Updating subscription with params:", updateParams);

      const updatedSubscription = await stripe.subscriptions.update(
        stripeSubscription.id,
        updateParams
      );

      console.log("Subscription updated successfully:", {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        newItems: updatedSubscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity,
        })),
      });
    } catch (subscriptionError) {
      console.error("Failed to update Stripe subscription:", subscriptionError);
      throw new Error(
        `Stripe subscription update failed: ${subscriptionError}`
      );
    }

    // Update our local database
    try {
      console.log("Updating local database for user:", userId);

      const dbResult = await db
        .update(subscriptions)
        .set({
          subject_count: newSubjectCountNum,
          custom_price: newPrice.toString(),
          updated_at: new Date(),
        })
        .where(eq(subscriptions.user_id, userId));

      console.log("Database subscription updated:", dbResult);

      // Update user's subject access
      await db
        .delete(relationSubjectsUserTable)
        .where(eq(relationSubjectsUserTable.user_id, userId));

      const subjectIds = JSON.parse(newSubjectIds!);
      console.log("Updating subject access for subjects:", subjectIds);

      for (const subjectId of subjectIds) {
        await db.insert(relationSubjectsUserTable).values({
          user_id: userId,
          subject_id: subjectId,
        });
      }

      console.log("Subject access updated successfully");
    } catch (dbError) {
      console.error("Failed to update local database:", dbError);
      throw new Error(`Database update failed: ${dbError}`);
    }

    console.log("Immediate upgrade completed successfully for user:", userId);
  } catch (error) {
    console.error("Error processing immediate upgrade checkout:", {
      error: error,
      userId,
      sessionId: session.id,
      subscriptionId,
    });

    // Re-throw to ensure webhook fails and gets retried
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const sub = subscription as any;
  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      current_period_start: new Date(sub.current_period_start * 1000),
      current_period_end: new Date(sub.current_period_end * 1000),
      cancel_at_period_end: sub.cancel_at_period_end || false,
      updated_at: new Date(),
    })
    .where(eq(subscriptions.stripe_subscription_id, subscription.id));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Update subscription status to canceled
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      updated_at: new Date(),
    })
    .where(eq(subscriptions.stripe_subscription_id, subscription.id));

  // Remove user's subject access
  const userSubscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripe_subscription_id, subscription.id))
    .limit(1);

  if (userSubscription.length > 0 && userSubscription[0].user_id) {
    await db
      .delete(relationSubjectsUserTable)
      .where(
        eq(relationSubjectsUserTable.user_id, userSubscription[0].user_id!)
      );
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as any;
  if (invoiceWithSubscription.subscription) {
    // Update subscription status to active
    await db
      .update(subscriptions)
      .set({
        status: "active",
        updated_at: new Date(),
      })
      .where(
        eq(
          subscriptions.stripe_subscription_id,
          invoiceWithSubscription.subscription as string
        )
      );

    // Process any pending subscription changes that should take effect now
    await processPendingSubscriptionChanges(
      invoiceWithSubscription.subscription as string
    );
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceWithSubscription = invoice as any;
  if (invoiceWithSubscription.subscription) {
    // Update subscription status to past_due
    await db
      .update(subscriptions)
      .set({
        status: "past_due",
        updated_at: new Date(),
      })
      .where(
        eq(
          subscriptions.stripe_subscription_id,
          invoiceWithSubscription.subscription as string
        )
      );
  }
}

async function handleSubscriptionScheduleUpdated(
  schedule: Stripe.SubscriptionSchedule
) {
  console.log("Subscription schedule updated:", schedule.id);

  // Update the pending change status if needed
  await db
    .update(pendingSubscriptionChanges)
    .set({
      status: schedule.status === "active" ? "pending" : schedule.status,
      updated_at: new Date(),
    })
    .where(eq(pendingSubscriptionChanges.stripe_schedule_id, schedule.id));
}

async function handleSubscriptionScheduleCompleted(
  schedule: Stripe.SubscriptionSchedule
) {
  console.log("Subscription schedule completed:", schedule.id);

  try {
    // Find the pending change associated with this schedule
    const pendingChange = await db
      .select()
      .from(pendingSubscriptionChanges)
      .where(eq(pendingSubscriptionChanges.stripe_schedule_id, schedule.id))
      .limit(1);

    if (!pendingChange.length) {
      console.warn(
        "No pending change found for completed schedule:",
        schedule.id
      );
      return;
    }

    const change = pendingChange[0];

    if (!change.user_id) {
      console.error("No user ID found for pending change:", change.id);
      return;
    }

    const userId = change.user_id as string;

    // Get the subscription from the schedule
    const subscription = schedule.subscription
      ? await stripe.subscriptions.retrieve(schedule.subscription as string)
      : null;

    if (!subscription) {
      console.error(
        "No subscription found for completed schedule:",
        schedule.id
      );
      return;
    }

    // Ensure we have valid values for required fields
    const newSubjectCount = change.new_subject_count || 0;
    const newPrice = change.new_price || "0";

    // Update the subscription record with new details
    await db
      .update(subscriptions)
      .set({
        subject_count: newSubjectCount,
        custom_price: newPrice,
        stripe_price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: new Date(
          (subscription as any).current_period_start * 1000
        ),
        current_period_end: new Date(
          (subscription as any).current_period_end * 1000
        ),
        updated_at: new Date(),
      })
      .where(eq(subscriptions.user_id, userId));

    // Update user's subject access if we have new subject IDs
    if (change.new_subject_ids && Array.isArray(change.new_subject_ids)) {
      // Remove old subject access
      await db
        .delete(relationSubjectsUserTable)
        .where(eq(relationSubjectsUserTable.user_id, userId));

      // Add new subject access
      for (const subjectId of change.new_subject_ids) {
        await db.insert(relationSubjectsUserTable).values({
          user_id: userId,
          subject_id: subjectId,
        });
      }
    }

    // Mark the pending change as applied
    await db
      .update(pendingSubscriptionChanges)
      .set({
        status: "applied",
        updated_at: new Date(),
      })
      .where(eq(pendingSubscriptionChanges.id, change.id));

    console.log(
      `Successfully applied scheduled plan change for user ${userId}`
    );
  } catch (error) {
    console.error("Error processing completed subscription schedule:", error);

    // Mark the change as failed
    await db
      .update(pendingSubscriptionChanges)
      .set({
        status: "failed",
        updated_at: new Date(),
      })
      .where(eq(pendingSubscriptionChanges.stripe_schedule_id, schedule.id));
  }
}

async function handleSubscriptionScheduleCanceled(
  schedule: Stripe.SubscriptionSchedule
) {
  console.log("Subscription schedule canceled:", schedule.id);

  // Mark the pending change as cancelled
  await db
    .update(pendingSubscriptionChanges)
    .set({
      status: "cancelled",
      updated_at: new Date(),
    })
    .where(eq(pendingSubscriptionChanges.stripe_schedule_id, schedule.id));
}

// Helper function to process pending subscription changes
async function processPendingSubscriptionChanges(stripeSubscriptionId: string) {
  console.log(
    "Checking for pending subscription changes for:",
    stripeSubscriptionId
  );

  // Get the subscription from our database
  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripe_subscription_id, stripeSubscriptionId))
    .limit(1);

  if (!subscription.length) {
    console.log("No subscription found for:", stripeSubscriptionId);
    return;
  }

  const userSubscription = subscription[0];

  // Find pending changes for this subscription that should be applied now
  const pendingChanges = await db
    .select()
    .from(pendingSubscriptionChanges)
    .where(
      and(
        eq(pendingSubscriptionChanges.subscription_id, userSubscription.id),
        eq(pendingSubscriptionChanges.status, "pending"),
        eq(pendingSubscriptionChanges.timing, "next_period")
      )
    );

  console.log("Found pending changes:", pendingChanges.length);

  for (const change of pendingChanges) {
    try {
      if (change.change_type === "downgrade") {
        console.log("Processing downgrade for user:", userSubscription.user_id);

        // Remove all current subject access
        await db
          .delete(relationSubjectsUserTable)
          .where(
            eq(relationSubjectsUserTable.user_id, userSubscription.user_id!)
          );

        // Add new subject access based on the downgraded plan
        const newSubjectIds = change.new_subject_ids as string[];
        for (const subjectId of newSubjectIds) {
          await db.insert(relationSubjectsUserTable).values({
            user_id: userSubscription.user_id!,
            subject_id: subjectId,
          });
        }

        // Mark the change as applied
        await db
          .update(pendingSubscriptionChanges)
          .set({
            status: "applied",
            updated_at: new Date(),
          })
          .where(eq(pendingSubscriptionChanges.id, change.id));

        console.log(
          "Successfully processed downgrade for user:",
          userSubscription.user_id
        );
      }
    } catch (error) {
      console.error("Error processing pending change:", error);

      // Mark the change as failed
      await db
        .update(pendingSubscriptionChanges)
        .set({
          status: "failed",
          updated_at: new Date(),
        })
        .where(eq(pendingSubscriptionChanges.id, change.id));
    }
  }
}
