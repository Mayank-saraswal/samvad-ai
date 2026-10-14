import { SignUp } from "@clerk/nextjs";
import { Check } from "lucide-react";
import { SamvaadLogo } from "@/components/brand/logo";

export default function SignUpPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 flex flex-col justify-center">
      {/* Left Column: Rounded Parchment Branding Card (Matches Screenshot 1) */}
      <div className="relative hidden overflow-hidden rounded-[2.5rem] bg-card p-10 lg:p-14 lg:flex lg:flex-col justify-between border border-border/80 shadow-soft">
        {/* Brand Logo & Title with Prominent Transparent Mark */}
        <SamvaadLogo size="lg" themeIntensity="auto" />

        {/* Center Editorial Messaging */}
        <div className="my-auto max-w-xl py-12">
          <p className="mb-4 text-xs font-bold tracking-wider uppercase text-brand-ink">
            Official Law Enforcement Onboarding
          </p>
          <h1 className="text-balance text-5xl xl:text-6xl font-normal leading-[1.04] tracking-[-0.05em] text-foreground font-sans">
            Equip your department with sovereign verification.
          </h1>

          <div className="mt-10 space-y-4 text-sm text-muted-foreground">
            {[
              "Role-based access for Authorized Spokespersons & CPOs",
              "Zero third-party hallucination on legal evidence files",
              "Bilingual Hindi & English distribution channels",
            ].map((point) => (
              <div key={point} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-brand-ink shrink-0">
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
                <span className="text-foreground/90 font-medium text-sm">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Tagline */}
        <p className="text-xs text-muted-foreground font-mono">
          Samvaad AI · Sovereign Disclosures. Tamper-Evident Accountability.
        </p>
      </div>

      {/* Right Column: Authentication Form Area */}
      <div className="flex min-h-[calc(100vh-2rem)] flex-col justify-center bg-background px-4 py-8 sm:px-10 lg:px-12">
        {/* Mobile Header Logo */}
        <div className="flex items-center justify-between lg:hidden mb-8">
          <SamvaadLogo size="default" themeIntensity="auto" />
        </div>

        <div className="mx-auto w-full max-w-md">
          {/* Eyebrow & Title */}
          <p className="text-xs font-bold tracking-wider uppercase text-brand-ink">
            Official Access
          </p>
          <h2 className="mt-2 text-4xl sm:text-5xl font-normal leading-[1.06] tracking-[-0.045em] text-foreground font-sans">
            Create Officer Account.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Register to begin drafting cryptographically anchored incident disclosures.
          </p>

          {/* Clerk Sign Up with Loreline Custom Theme */}
          <div className="mt-8">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-transparent shadow-none border-0 p-0 w-full rounded-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "w-full rounded-full border border-border bg-card/60 hover:bg-card text-foreground py-3 text-sm font-medium transition-all shadow-xs hover:shadow-sm cursor-pointer",
                  socialButtonsBlockButtonText: "font-sans text-sm font-medium",
                  dividerRow: "my-5 flex items-center gap-3",
                  dividerLine: "bg-border h-px flex-1",
                  dividerText: "text-xs font-mono text-muted-foreground uppercase",
                  formButtonPrimary:
                    "w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-[0_3px_0_rgba(0,0,0,0.1),0_8px_18px_rgba(212,233,74,0.3)] transition-all py-3 text-sm cursor-pointer active:scale-95",
                  formFieldInput:
                    "w-full rounded-2xl border border-border bg-card/40 focus:bg-card px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-brand focus:border-transparent transition-all placeholder:text-muted-foreground/60",
                  formFieldLabel: "text-xs font-semibold text-foreground/85 mb-1.5",
                  formFieldAction: "text-xs text-brand-ink hover:underline font-medium",
                  footerAction: "mt-6 text-center text-sm text-muted-foreground",
                  footerActionText: "text-muted-foreground",
                  footerActionLink:
                    "font-semibold text-foreground underline-offset-4 hover:underline ml-1",
                  identityPreviewText: "text-sm font-medium",
                  identityPreviewEditButton: "text-brand-ink hover:underline text-xs",
                },
              }}
            />
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to official sovereign disclosure protocols.
          </p>
        </div>
      </div>
    </div>
  );
}

