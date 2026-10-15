import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { getStore } from "@/server/context";

/**
 * Clerk Billing Webhook Handler
 * Per the clerk-billing skill:
 * - Uses verifyWebhook from @clerk/nextjs/webhooks.
 * - Handles Clerk's exact event names in camelCase / dot-notation (NOT Stripe's).
 * - Extracts subscribing entity from `payer.organization_id ?? payer.user_id`.
 * - Upserts subscription records for multi-tenant and personal subscriptions.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let evt: unknown;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[Clerk Billing Webhook] Verification failed:", err);
    return new Response("Webhook verification failed", { status: 400 });
  }

  // Type assertion for Clerk Billing Webhook events per clerk-billing spec
  const event = evt as {
    type: string;
    data: {
      id: string;
      status?: string;
      payer?: {
        organization_id?: string;
        user_id?: string;
      };
      items?: Array<{
        id?: string;
        plan?: {
          slug?: string;
        };
      }>;
      plan?: {
        slug?: string;
      };
      current_period_end?: string | number;
      canceled_at?: string | number;
    };
  };

  const store = getStore();
  const eventType = event.type;
  const data = event.data;

  try {
    if (eventType === "subscription.created" || eventType === "subscription.active") {
      const entityId = data.payer?.organization_id ?? data.payer?.user_id;
      const planSlug = data.items?.[0]?.plan?.slug ?? "free";
      const status = data.status ?? "active";
      const payerType = data.payer?.organization_id ? "organization" : "user";
      const currentPeriodEnd = data.current_period_end
        ? new Date(typeof data.current_period_end === "number" ? data.current_period_end * 1000 : data.current_period_end)
        : null;

      if (entityId) {
        await store.upsertSubscription({
          id: data.id,
          entityId,
          payerType,
          planSlug,
          status,
          currentPeriodEnd,
        });
        console.log(`[Clerk Billing Webhook] ${eventType} processed for ${payerType} ${entityId} on plan ${planSlug}`);
      }
    } else if (eventType === "subscription.updated") {
      const entityId = data.payer?.organization_id ?? data.payer?.user_id;
      const planSlug = data.items?.[0]?.plan?.slug ?? "free";
      const status = data.status ?? "active";
      const payerType = data.payer?.organization_id ? "organization" : "user";
      const currentPeriodEnd = data.current_period_end
        ? new Date(typeof data.current_period_end === "number" ? data.current_period_end * 1000 : data.current_period_end)
        : null;

      if (entityId) {
        await store.upsertSubscription({
          id: data.id,
          entityId,
          payerType,
          planSlug,
          status,
          currentPeriodEnd,
        });
        console.log(`[Clerk Billing Webhook] subscription.updated processed for ${entityId} (status: ${status})`);
      }
    } else if (eventType === "subscription.pastDue") {
      const entityId = data.payer?.organization_id ?? data.payer?.user_id;
      if (entityId) {
        const existing = await store.getSubscription(entityId);
        if (existing) {
          await store.upsertSubscription({
            ...existing,
            status: "past_due",
          });
          console.warn(`[Clerk Billing Webhook] subscription.pastDue for entity ${entityId}`);
        }
      }
    } else if (eventType === "subscriptionItem.canceled") {
      // In subscriptionItem.* events, data represents the item itself
      const entityId = data.payer?.organization_id ?? data.payer?.user_id;
      const planSlug = data.plan?.slug ?? "free";
      if (entityId) {
        await store.upsertSubscription({
          id: data.id,
          entityId,
          planSlug,
          status: "canceled",
        });
        console.log(`[Clerk Billing Webhook] subscriptionItem.canceled processed for ${entityId}`);
      }
    } else if (eventType === "subscriptionItem.pastDue") {
      const entityId = data.payer?.organization_id ?? data.payer?.user_id;
      if (entityId) {
        const existing = await store.getSubscription(entityId);
        if (existing) {
          await store.upsertSubscription({
            ...existing,
            status: "past_due",
          });
        }
      }
    }

    return NextResponse.json({ success: true, event: eventType }, { status: 200 });
  } catch (err) {
    console.error(`[Clerk Billing Webhook] Error processing event ${eventType}:`, err);
    return new Response("Internal server error handling webhook", { status: 500 });
  }
}
