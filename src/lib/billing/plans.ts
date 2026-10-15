/**
 * Clerk Billing configuration, plan definitions, and feature entitlements.
 * Per the clerk-billing skill:
 * - Plans are defined in Clerk Dashboard -> Billing -> Plans (User Plans vs Organization Plans).
 * - B2B SaaS uses Organization Plans with seat limits (prefixed with `org:`).
 * - Capabilities are checked using `has({ feature: 'slug' })`.
 * - Tiers are checked using `has({ plan: 'slug' })`.
 */

export const PLAN_TIERS = {
  FREE: "free",
  ORG_STARTER: "org:starter",
  ORG_PRO: "org:pro",
  ORG_ENTERPRISE: "org:enterprise",
  USER_PRO: "pro",
} as const;

export type PlanTier = (typeof PLAN_TIERS)[keyof typeof PLAN_TIERS];

export const BILLING_FEATURES = {
  EXPORT_DOSSIER: "export_dossier",
  VOICE_STT: "voice_stt",
  STATUTORY_COMPLIANCE: "statutory_compliance",
  PRIORITY_QUEUE: "priority_queue",
  AUDIT_LOGS: "audit_logs",
} as const;

export type BillingFeature = (typeof BILLING_FEATURES)[keyof typeof BILLING_FEATURES];

export interface PlanConfig {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly for: "organization" | "user";
  readonly priceMonthly: number;
  readonly priceCurrency: string;
  readonly seatLimit?: number;
  readonly description: string;
  readonly badge?: string;
  readonly isPopular?: boolean;
  readonly features: readonly string[];
  readonly entitlements: readonly BillingFeature[];
}

export const SOVEREIGN_PLANS: readonly PlanConfig[] = [
  {
    id: "plan_free",
    name: "Officer Desk",
    slug: "free",
    for: "organization",
    priceMonthly: 0,
    priceCurrency: "USD",
    seatLimit: 3,
    description: "For individual spokespersons and field briefing officers.",
    features: [
      "Up to 50 evidence pages / month",
      "Basic OCR & claim extraction",
      "Dual-language press drafts (EN + HI)",
      "Standard verification reports",
    ],
    entitlements: [],
  },
  {
    id: "plan_org_starter",
    name: "Department Unit",
    slug: "org:starter",
    for: "organization",
    priceMonthly: 49,
    priceCurrency: "USD",
    seatLimit: 10,
    description: "For police headquarters, commissionerates, and PR divisions.",
    badge: "Most Popular",
    isPopular: true,
    features: [
      "Unlimited evidence ingest (PDFs & audio)",
      "Real-time voice & speech extraction",
      "Dual-agent consensus verification",
      "Multi-officer role-based approvals",
      "Priority support & fast processing",
    ],
    entitlements: [
      BILLING_FEATURES.VOICE_STT,
      BILLING_FEATURES.EXPORT_DOSSIER,
      BILLING_FEATURES.PRIORITY_QUEUE,
    ],
  },
  {
    id: "plan_org_enterprise",
    name: "State Agency",
    slug: "org:enterprise",
    for: "organization",
    priceMonthly: 0,
    priceCurrency: "USD",
    description: "For state home departments, central agencies, and enterprise security.",
    features: [
      "Dedicated sovereign VPC deployment",
      "Custom legal & statutory concordances",
      "Cryptographic audit archives",
      "Custom SLA & onboarding",
    ],
    entitlements: [
      BILLING_FEATURES.VOICE_STT,
      BILLING_FEATURES.EXPORT_DOSSIER,
      BILLING_FEATURES.STATUTORY_COMPLIANCE,
      BILLING_FEATURES.PRIORITY_QUEUE,
      BILLING_FEATURES.AUDIT_LOGS,
    ],
  },
];

/**
 * Evaluates whether an active session (user or organization) has entitlement
 * to a specific capability or feature slug.
 */
export function checkHasFeature(
  hasFn: ((params: { feature: string } | { plan: string }) => boolean) | undefined | null,
  feature: BillingFeature,
): boolean {
  if (!hasFn) return false;
  // Check granular feature entitlement first (preferred per clerk-billing)
  if (hasFn({ feature })) return true;
  // Fallback checks for higher-tier plans
  if (hasFn({ plan: PLAN_TIERS.ORG_ENTERPRISE })) return true;
  if (hasFn({ plan: PLAN_TIERS.ORG_PRO })) {
    return (
      feature === BILLING_FEATURES.VOICE_STT ||
      feature === BILLING_FEATURES.EXPORT_DOSSIER ||
      feature === BILLING_FEATURES.STATUTORY_COMPLIANCE ||
      feature === BILLING_FEATURES.PRIORITY_QUEUE
    );
  }
  if (hasFn({ plan: PLAN_TIERS.ORG_STARTER })) {
    return feature === BILLING_FEATURES.VOICE_STT || feature === BILLING_FEATURES.EXPORT_DOSSIER;
  }
  return false;
}

/**
 * Returns the human-readable tier label for an active session.
 */
export function resolveActiveTierName(
  hasFn: ((params: { plan: string }) => boolean) | undefined | null,
): { slug: string; name: string } {
  if (!hasFn) return { slug: "free", name: "Standard Bureau (Free)" };
  if (hasFn({ plan: PLAN_TIERS.ORG_ENTERPRISE })) {
    return { slug: PLAN_TIERS.ORG_ENTERPRISE, name: "State Sovereign Grid" };
  }
  if (hasFn({ plan: PLAN_TIERS.ORG_PRO })) {
    return { slug: PLAN_TIERS.ORG_PRO, name: "Regional Commissionerate" };
  }
  if (hasFn({ plan: PLAN_TIERS.ORG_STARTER })) {
    return { slug: PLAN_TIERS.ORG_STARTER, name: "Command Division" };
  }
  if (hasFn({ plan: PLAN_TIERS.USER_PRO })) {
    return { slug: PLAN_TIERS.USER_PRO, name: "Pro Officer" };
  }
  return { slug: "free", name: "Standard Bureau (Free)" };
}
