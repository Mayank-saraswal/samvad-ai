"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth, useOrganization, Show } from "@clerk/nextjs";
import { CheckoutButton } from "@clerk/nextjs/experimental";
import { CheckCircle2, ShieldCheck, ExternalLink, AlertCircle, Building2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SovereignPricingCardsProps {
  readonly showHeader?: boolean;
  readonly className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class CheckoutErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: (error: string) => React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: (error: string) => React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Billing checkout unavailable",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[Clerk Billing] Checkout initialization fallback:", error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.errorMessage ?? "");
    }
    return this.props.children;
  }
}

export function SovereignPricingCards({
  showHeader = true,
  className,
}: SovereignPricingCardsProps): React.JSX.Element {
  const { isLoaded, isSignedIn, orgId, has } = useAuth();
  const { organization } = useOrganization();
  const [activationModalOpen, setActivationModalOpen] = React.useState(false);

  // Check if current organization already has an active tier
  const isSubscribedToDeptUnit =
    isSignedIn &&
    orgId &&
    (has?.({ plan: "org:starter" }) || has?.({ plan: "org:pro" }) || has?.({ plan: "department_unit" }));

  return (
    <div className={cn("w-full", className)}>
      {showHeader && (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-brand-ink uppercase tracking-wider">
            Transparent plans
          </p>
          <h2 className="mt-4 text-balance text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.04] tracking-[-0.045em] text-foreground font-sans">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-7 text-muted-foreground">
            Choose the right tier for your team or agency.
          </p>
        </div>
      )}

      {/* Pricing Cards Grid (Matches Screenshot 2) */}
      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch", showHeader ? "mt-12 sm:mt-16" : "mt-6")}>
        {/* Card 1: Officer Desk (Free) */}
        <div className="rounded-[2.25rem] border border-border bg-card p-6 sm:p-7 lg:p-8 flex flex-col justify-between shadow-soft hover:shadow-float transition-all duration-300">
          <div>
            <p className="text-sm font-semibold text-foreground">Officer Desk</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              For individual spokespersons and field briefing officers.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-foreground">Free</span>
            </div>
            <div className="mt-8 space-y-3.5 text-xs text-muted-foreground">
              {[
                "Up to 50 evidence pages / month",
                "Basic OCR & claim extraction",
                "Dual-language press drafts (EN + HI)",
                "Standard verification reports",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-brand-ink shrink-0" />
                  <span className="text-foreground/80">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {isSignedIn ? (
              <Button
                size="lg"
                variant="outline"
                className="w-full text-xs font-semibold rounded-full bg-white hover:bg-neutral-50 text-foreground border border-border shadow-xs"
                render={<Link href="/dossiers" />}
              >
                Go to Incident Desk
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="w-full text-xs font-semibold rounded-full bg-white hover:bg-neutral-50 text-foreground border border-border shadow-xs"
                render={<Link href="/sign-in" />}
              >
                Get Started
              </Button>
            )}
          </div>
        </div>

        {/* Card 2: Department Unit (MOST POPULAR - $49/month with Clerk Billing) */}
        <div className="rounded-[2.25rem] border-2 border-brand bg-card p-6 sm:p-7 lg:p-8 flex flex-col justify-between shadow-float relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider shadow-xs">
            Most Popular
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Department Unit</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              For police headquarters, commissionerates, and PR divisions.
            </p>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tracking-tight text-foreground">$49</span>
              <span className="text-xs text-muted-foreground font-medium">/ month</span>
            </div>
            <div className="mt-8 space-y-3.5 text-xs text-foreground/85">
              {[
                "Unlimited evidence ingest (PDFs & audio)",
                "Real-time voice & speech extraction",
                "Dual-agent consensus verification",
                "Multi-officer role-based approvals",
                "Priority support & fast processing",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-brand-ink shrink-0" />
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            {!isLoaded ? (
              <div className="h-11 w-full animate-pulse rounded-full bg-primary/20" />
            ) : !isSignedIn ? (
              <Button
                size="lg"
                variant="default"
                className="w-full text-xs font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                render={<Link href="/sign-in?redirect_url=/pricing" />}
              >
                Choose Department Unit
              </Button>
            ) : !orgId ? (
              <div className="space-y-2">
                <Button
                  size="lg"
                  variant="default"
                  className="w-full text-xs font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                  render={<Link href="/create-organization" />}
                >
                  Create Organization First
                </Button>
                <p className="text-[11px] text-center text-muted-foreground">
                  B2B subscriptions require an active department precinct.
                </p>
              </div>
            ) : isSubscribedToDeptUnit ? (
              <div className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-brand-soft border border-brand text-brand-ink font-semibold text-xs">
                <Check className="size-4 stroke-[2.5]" />
                <span>Active Subscription</span>
              </div>
            ) : (
              <CheckoutErrorBoundary
                fallback={() => (
                  <Button
                    size="lg"
                    variant="default"
                    onClick={() => setActivationModalOpen(true)}
                    className="w-full text-xs font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                  >
                    Choose Department Unit
                  </Button>
                )}
              >
                <Show when="signed-in">
                  <CheckoutButton
                    planId="org:starter"
                    planPeriod="month"
                    for="organization"
                    newSubscriptionRedirectUrl="/dossiers"
                  >
                    <button
                      type="button"
                      className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      Choose Department Unit
                    </button>
                  </CheckoutButton>
                </Show>
              </CheckoutErrorBoundary>
            )}
          </div>
        </div>

        {/* Card 3: State Agency (Custom / Enterprise) */}
        <div className="rounded-[2.25rem] border border-border bg-card p-6 sm:p-7 lg:p-8 flex flex-col justify-between shadow-soft hover:shadow-float transition-all duration-300">
          <div>
            <p className="text-sm font-semibold text-foreground">State Agency</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              For state home departments, central agencies, and enterprise security.
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-foreground">Custom</span>
            </div>
            <div className="mt-8 space-y-3.5 text-xs text-muted-foreground">
              {[
                "Dedicated sovereign VPC deployment",
                "Custom legal & statutory concordances",
                "Cryptographic audit archives",
                "Custom SLA & onboarding",
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-brand-ink shrink-0" />
                  <span className="text-foreground/80">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Button
              size="lg"
              variant="outline"
              className="w-full text-xs font-semibold rounded-full bg-white hover:bg-neutral-50 text-foreground border border-border shadow-xs"
              render={
                <a
                  href="mailto:contact@samvaad.gov.in?subject=Samvaad%20AI%20State%20Agency%20Deployment%20Inquiry"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </div>

      {/* Clerk Billing Dashboard Activation Guidance Modal */}
      {activationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-background border border-border p-6 shadow-float animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-foreground">Connect Clerk Billing</h3>
                <p className="text-xs text-muted-foreground">Organization Plan: Department Unit ($49/mo)</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-card/60 p-4 border border-border/70 text-xs text-muted-foreground space-y-2">
              <p>
                To enable live payments in your application, activate <strong>Clerk Billing</strong> in your Clerk Dashboard:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-foreground/80">
                <li>Go to <strong>Clerk Dashboard → Billing → Settings</strong></li>
                <li>Turn on Billing for <strong>Organizations</strong></li>
                <li>In <strong>Plans → Organization Plans</strong>, create <code>org:starter</code> at <strong>$49/mo</strong></li>
              </ol>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActivationModalOpen(false)}
                className="rounded-full text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                className="rounded-full text-xs bg-primary text-primary-foreground gap-1.5"
                render={
                  <a
                    href="https://dashboard.clerk.com/last-active?path=billing/settings"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <span>Open Clerk Dashboard</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
