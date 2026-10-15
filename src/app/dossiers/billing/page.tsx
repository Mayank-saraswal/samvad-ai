import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignInButton, CreateOrganization, OrganizationProfile } from "@clerk/nextjs";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  ArrowLeft,
  CreditCard,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SovereignPricingCards } from "@/components/billing/sovereign-pricing-cards";
import { ClerkPricingTable } from "@/components/billing/clerk-pricing-table";
import { resolveActiveTierName, BILLING_FEATURES, checkHasFeature } from "@/lib/billing/plans";

export const instant = false;

export default async function OrgBillingPage(): Promise<React.JSX.Element> {
  const { isAuthenticated, userId, orgId, orgRole, has } = await auth();
  const user = isAuthenticated ? await currentUser() : null;

  if (!isAuthenticated || !userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 text-center space-y-5 bg-background text-foreground relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[32rem] bg-[radial-gradient(circle_at_50%_16%,rgba(212,233,74,0.35)_0%,rgba(212,233,74,0.12)_28%,transparent_60%)] animate-blob-slow" />
        <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300 border border-amber-500/30 relative z-10">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-md relative z-10">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            Authentication Required
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Organization billing, subscription tiers, and seat limits are restricted to authorized department officers.
          </p>
        </div>
        <div className="relative z-10">
          <SignInButton mode="modal">
            <Button variant="default" size="lg">
              Sign In to Incident Desk
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Force Organization Creation if user does not belong to an active organization
  if (!orgId) {
    return (
      <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[32rem] bg-[radial-gradient(circle_at_50%_16%,rgba(212,233,74,0.35)_0%,rgba(212,233,74,0.12)_28%,transparent_60%)] animate-blob-slow" />
        <div className="relative z-10 max-w-2xl w-full mx-auto p-6 sm:p-12 flex flex-col items-center justify-center space-y-6 flex-1">
          <div className="text-center space-y-3 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300 border border-amber-500/30 mx-auto">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Department Organization Required
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Subscriptions and seat allocations are managed at the organization level. Please establish your department organization to proceed.
            </p>
          </div>

          <div className="w-full flex justify-center pt-2">
            <CreateOrganization
              afterCreateOrganizationUrl="/dossiers/billing"
              appearance={{
                elements: {
                  card: "shadow-none border border-border/80 bg-card rounded-2xl",
                  rootBox: "w-full max-w-md",
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = orgRole === "org:admin";
  const activeTier = resolveActiveTierName(has);

  const canExport = checkHasFeature(has, BILLING_FEATURES.EXPORT_DOSSIER);
  const canVoiceSTT = checkHasFeature(has, BILLING_FEATURES.VOICE_STT);
  const canStatutory = checkHasFeature(has, BILLING_FEATURES.STATUTORY_COMPLIANCE);
  const canPriority = checkHasFeature(has, BILLING_FEATURES.PRIORITY_QUEUE);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Soft Radial Luminous Green Glow Blob matching Loreline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[38rem] bg-[radial-gradient(circle_at_50%_12%,rgba(212,233,74,0.36)_0%,rgba(212,233,74,0.13)_28%,transparent_60%)] animate-blob-slow" />

      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dossiers"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Incident Dispatch Desk</span>
          </Link>

          <Badge variant={isAdmin ? "brand" : "outline"} className="text-[11px] font-mono">
            {isAdmin ? "Department Admin (Billing Enabled)" : "Member View (Read Only)"}
          </Badge>
        </div>

        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/60">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft/60 border border-brand/40 text-brand-ink text-xs font-semibold shadow-xs">
              <CreditCard className="size-3.5 text-brand-ink" />
              <span>Department Subscription Portal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-semibold tracking-tight text-foreground leading-[1.08]">
              Organization Billing &amp; Seats
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage subscription plans, seat allocations, and verified multimodal capabilities for your active department organization.
            </p>
          </div>

          {/* Active Tier Pill Card */}
          <div className="p-4 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-soft flex items-center gap-3 shrink-0">
            <div className="size-10 rounded-xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand-ink">
              <Building2 className="size-5 text-brand-ink" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Current Plan
              </span>
              <div className="text-sm font-semibold font-display text-foreground">
                {activeTier.name}
              </div>
            </div>
          </div>
        </div>

        {/* Entitlements Status Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-card/75 border border-border/80 shadow-xs space-y-1.5">
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
              <CheckCircle2 className={canExport ? "size-3.5 text-emerald-500" : "size-3.5 text-muted-foreground/50"} />
              <span>Dossier Export</span>
            </span>
            <div className="text-sm font-semibold text-foreground">
              {canExport ? "Active" : "Locked (Upgrade)"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card/75 border border-border/80 shadow-xs space-y-1.5">
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
              <CheckCircle2 className={canVoiceSTT ? "size-3.5 text-emerald-500" : "size-3.5 text-muted-foreground/50"} />
              <span>Sarvam STT Voice</span>
            </span>
            <div className="text-sm font-semibold text-foreground">
              {canVoiceSTT ? "Active" : "Locked (Upgrade)"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card/75 border border-border/80 shadow-xs space-y-1.5">
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
              <CheckCircle2 className={canStatutory ? "size-3.5 text-emerald-500" : "size-3.5 text-muted-foreground/50"} />
              <span>BSA §65B Stamping</span>
            </span>
            <div className="text-sm font-semibold text-foreground">
              {canStatutory ? "Active" : "Locked (Upgrade)"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card/75 border border-border/80 shadow-xs space-y-1.5">
            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
              <CheckCircle2 className={canPriority ? "size-3.5 text-emerald-500" : "size-3.5 text-muted-foreground/50"} />
              <span>Priority Processing</span>
            </span>
            <div className="text-sm font-semibold text-foreground">
              {canPriority ? "High Speed" : "Standard"}
            </div>
          </div>
        </div>

        {/* Section 1: In-App Organization Plan Upgrade via Sovereign Pricing Cards & Clerk Checkout */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-display font-semibold tracking-tight text-foreground">
              Available Organization Plans
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecting a plan opens Clerk&apos;s verified in-app checkout drawer. Seat caps are enforced automatically upon invitation.
            </p>
          </div>

          <SovereignPricingCards showHeader={false} />
        </div>

        {/* Section 2: Complete Organization Profile Shell (Plans, Members, Invoices) */}
        <div className="space-y-4 pt-6 border-t border-border/60">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-display font-semibold tracking-tight text-foreground">
              Department Profile &amp; Member Roster
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Invite officers, adjust department roles, and manage payment methods inside Clerk&apos;s verified organization profile shell.
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-md p-4 sm:p-6 shadow-soft flex justify-center">
            <OrganizationProfile
              appearance={{
                elements: {
                  rootBox: "w-full max-w-4xl",
                  card: "shadow-none border border-border/60 bg-transparent rounded-2xl",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
