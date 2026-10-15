import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  ShieldCheck,
  Building2,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  Fingerprint,
  Scale,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SovereignPricingCards } from "@/components/billing/sovereign-pricing-cards";
import { resolveActiveTierName, SOVEREIGN_PLANS } from "@/lib/billing/plans";

export const instant = false;

export default async function PricingPage(): Promise<React.JSX.Element> {
  const { isAuthenticated, orgId, has } = await auth();
  const user = isAuthenticated ? await currentUser() : null;

  const activeTier = resolveActiveTierName(has);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Soft Radial Luminous Green Glow Blob matching Loreline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[42rem] bg-[radial-gradient(circle_at_50%_14%,rgba(212,233,74,0.38)_0%,rgba(212,233,74,0.14)_28%,transparent_60%)] animate-blob-slow" />

      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 sm:p-12 space-y-12">
        {/* Editorial Eyebrow & Hero Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft/60 border border-brand/40 text-brand-ink text-xs font-semibold shadow-xs">
            <Building2 className="size-3.5 text-brand-ink" />
            <span>Sovereign Department Subscriptions</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-semibold tracking-tight text-foreground leading-[1.08]">
            Predictable Pricing for <br className="hidden sm:inline" />
            Public Safety &amp; Governance
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Equip department organizations with seat-limited plans, Sarvam STT multilingual voice briefings, and zero-hallucination evidence synthesis backed by cryptographic seals.
          </p>

          {/* Active Subscription Callout for Signed-in Officers */}
          {isAuthenticated && (
            <div className="pt-2">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-soft text-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-muted-foreground">Active Session Tier:</span>
                <strong className="text-foreground font-semibold font-mono">
                  {activeTier.name}
                </strong>
                {orgId && (
                  <Badge variant="brand" className="text-[10px] py-0.5 px-2 font-mono">
                    Department Org Active
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sovereign Pricing Cards with Clerk Billing Integration */}
        <SovereignPricingCards showHeader={false} />

        {/* Feature Comparison Matrix */}
        <div className="space-y-6 pt-8 border-t border-border/70">
          <div className="text-center space-y-1 max-w-lg mx-auto">
            <h2 className="text-2xl font-display font-semibold tracking-tight text-foreground">
              Jurisdictional Feature Matrix
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Detailed breakdown of cryptographic safeguards and multimodal synthesis quotas.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-soft">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/70 text-foreground font-semibold">
                <tr>
                  <th className="p-4 sm:w-1/3">Capability &amp; Safeguard</th>
                  <th className="p-4 text-center">Standard</th>
                  <th className="p-4 text-center">Command</th>
                  <th className="p-4 text-center">Regional Pro</th>
                  <th className="p-4 text-center">State Grid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-4 font-medium text-foreground">Authorized Officer Seats</td>
                  <td className="p-4 text-center font-mono text-muted-foreground">Up to 3</td>
                  <td className="p-4 text-center font-mono text-foreground font-medium">Up to 10</td>
                  <td className="p-4 text-center font-mono text-foreground font-medium">Up to 30</td>
                  <td className="p-4 text-center font-mono text-brand font-semibold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Sarvam AI Speech-to-Text</td>
                  <td className="p-4 text-center text-muted-foreground">Limited</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">Standard</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">Priority</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">Realtime Dedicated</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Bilingual Hindi/English Release</td>
                  <td className="p-4 text-center text-muted-foreground">English only</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Dual-language</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Dual-language</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Dual-language</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">SHA-256 Merkle Provenance Seal</td>
                  <td className="p-4 text-center text-muted-foreground">Basic hash</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified Seal</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Verified Seal</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Merkle Tree Proof</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">BSA §65B Court Certificates</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center text-muted-foreground">—</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Included</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Custom Templates</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Multi-tenant Air Gap Isolation</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Included</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Included</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Included</td>
                  <td className="p-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">✓ Dedicated VPC</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6 pt-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-muted-foreground">
              Everything you need to know about departmental billing and seat management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-card/75 border border-border/80 space-y-2">
              <h3 className="font-semibold text-sm text-foreground">
                How do B2B seat limits work in Samvaad AI?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Organization plans have a fixed monthly price with an enforced officer membership cap. When your department reaches its limit, Clerk prevents new invitations until you upgrade to the next tier.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/75 border border-border/80 space-y-2">
              <h3 className="font-semibold text-sm text-foreground">
                Can we switch between monthly and annual billing?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes. Department administrators can switch billing cycles or manage payment methods directly through the Clerk in-app checkout drawer or your department settings page.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/75 border border-border/80 space-y-2">
              <h3 className="font-semibold text-sm text-foreground">
                Are public verification links affected by subscription changes?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No. Once an incident disclosure is sealed, its SHA-256 certificate and public verification URL remain permanently valid on the public registry even if the department tier changes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card/75 border border-border/80 space-y-2">
              <h3 className="font-semibold text-sm text-foreground">
                How do we request custom government or state-level SLA?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For state police headquarters, national disaster response forces, and judicial tribunals requiring on-premise air-gapping, select the State Sovereign Grid tier or contact dispatch support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
