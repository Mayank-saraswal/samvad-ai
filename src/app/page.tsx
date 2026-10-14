import Link from "next/link";
import Image from "next/image";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowRight,
  AudioLines,
  ShieldCheck,
  MousePointer2,
  Mic2,
  CheckCircle2,
  Lock,
  Layers,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { SamvaadLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { InteractiveEvidenceDesk } from "@/components/home/interactive-evidence-desk";
import { InteractiveVoiceConversation } from "@/components/home/interactive-voice-conversation";

export const instant = false;

export default async function HomePage(): Promise<React.JSX.Element> {
  const { isAuthenticated } = await auth();
  const user = isAuthenticated ? await currentUser() : null;

  const officerName =
    user?.fullName ||
    user?.firstName ||
    (user?.emailAddresses?.[0]?.emailAddress
      ? user.emailAddresses[0].emailAddress.split("@")[0]
      : null) ||
    "Officer";

  const officerEmail =
    user?.emailAddresses?.[0]?.emailAddress ?? "officer@department.gov.in";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section with Soft Luminous Green Glow Blob */}
      <section className="relative px-5 pb-20 pt-6 sm:px-8 sm:pb-28 sm:pt-8">
        {/* Soft Radial Luminous Green Glow Blob matching Loreline */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[42rem] bg-[radial-gradient(circle_at_50%_16%,rgba(212,233,74,0.42)_0%,rgba(212,233,74,0.16)_28%,transparent_60%)] animate-blob-slow" />

        <div className="relative mx-auto max-w-[76rem]">
          <div className="mx-auto max-w-[58rem] text-center">
            {/* Eyebrow matching Loreline */}
            <p className="text-sm font-semibold text-brand-ink">
              A reading companion that sees your evidence
            </p>

            {/* User's Tagline Shortened to 2 Lines — Uniform Sans Font, Loreline Leading & Tracking */}
            <h1 className="mt-6 text-balance text-[3rem] font-normal leading-[0.98] tracking-[-0.055em] text-foreground font-sans sm:text-[4.75rem] lg:text-[5.25rem]">
              <span className="block sm:whitespace-nowrap">
                Turn raw evidence
              </span>
              <span className="block sm:whitespace-nowrap mt-1">
                into verified disclosures.
              </span>
            </h1>

            {/* Subtitle matching Loreline layout */}
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Equip teams across public safety, disaster management, corporate crisis, and legal compliance to distill multimodal evidence files into dual-language releases — guaranteeing zero hallucination with cryptographic provenance and editorial sign-off.
            </p>

            {/* Hero Tactile Buttons matching Loreline */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="xl"
                variant="default"
                render={<Link href={isAuthenticated ? "/dossiers" : "/sign-in"} />}
              >
                <span>{isAuthenticated ? "Open incident workspace" : "Open incident desk"}</span>
                <ArrowRight />
              </Button>

              <Button
                size="xl"
                variant="outline"
                render={<a href="#interactive-desk" />}
              >
                <AudioLines />
                <span>How it works</span>
              </Button>
            </div>
          </div>

          {/* Signed-in Officer Quick Badge */}
          {isAuthenticated && (
            <div className="mt-10 max-w-xl mx-auto flex items-center justify-between p-4 rounded-2xl bg-card border border-border shadow-soft">
              <div className="flex items-center gap-3">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "size-10 rounded-full ring-2 ring-brand/40",
                    },
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {officerName}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-soft text-brand-ink border border-brand/30">
                      Officer Session
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {officerEmail}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="default"
                className="text-xs font-semibold px-3 py-1.5"
                render={<Link href="/dossiers" />}
              >
                Go to Dossiers →
              </Button>
            </div>
          )}

          {/* Interactive Evidence Inspection & Sideboard Hero Card */}
          <InteractiveEvidenceDesk />
        </div>
      </section>

      {/* 3-Column Steps Section — Open Border Grid matching Loreline */}
      <section id="how" className="border-y border-border px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-[76rem]">
          {/* Top Headline Statement */}
          <div className="grid gap-6 sm:gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <p className="text-sm font-semibold text-brand-ink">
              The page is the prompt
            </p>
            <h2 className="text-balance text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.04] tracking-[-0.045em] text-foreground font-sans">
              No copying passages.
              <br />
              No describing where you are.
            </h2>
          </div>

          {/* 3 Step Columns (Matches Loreline Matrix Grid) */}
          <div className="mt-12 sm:mt-16 grid border-y border-border grid-cols-1 md:grid-cols-3">
            {/* Step 01: Point */}
            <div className="border-b md:border-b-0 md:border-r border-border p-6 sm:p-7 lg:p-9 last:border-b-0 md:last:border-r-0 group hover:bg-card/30 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  01
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand-ink shadow-xs group-hover:scale-105 transition-transform duration-300">
                  <MousePointer2 className="size-5 fill-current" />
                </span>
              </div>
              <h3 className="mt-14 sm:mt-20 text-2xl sm:text-3xl font-medium tracking-[-0.035em] text-foreground font-sans">
                Point
              </h3>
              <p className="mt-3 sm:mt-4 max-w-sm leading-7 text-muted-foreground text-sm">
                Hover a word, line, diagram, or paragraph. Samvaad AI knows exactly what you mean.
              </p>
            </div>

            {/* Step 02: Ask */}
            <div className="border-b md:border-b-0 md:border-r border-border p-6 sm:p-7 lg:p-9 last:border-b-0 md:last:border-r-0 group hover:bg-card/30 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  02
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand-ink shadow-xs group-hover:scale-105 transition-transform duration-300">
                  <Mic2 className="size-5" />
                </span>
              </div>
              <h3 className="mt-14 sm:mt-20 text-2xl sm:text-3xl font-medium tracking-[-0.035em] text-foreground font-sans">
                Ask
              </h3>
              <p className="mt-3 sm:mt-4 max-w-sm leading-7 text-muted-foreground text-sm">
                Speak naturally. Interrupt, follow up, change direction, or ask for the simpler version.
              </p>
            </div>

            {/* Step 03: See */}
            <div className="border-b md:border-b-0 border-border p-6 sm:p-7 lg:p-9 last:border-b-0 group hover:bg-card/30 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  03
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand-ink shadow-xs group-hover:scale-105 transition-transform duration-300">
                  <Sparkles className="size-5" />
                </span>
              </div>
              <h3 className="mt-14 sm:mt-20 text-2xl sm:text-3xl font-medium tracking-[-0.035em] text-foreground font-sans">
                See
              </h3>
              <p className="mt-3 sm:mt-4 max-w-sm leading-7 text-muted-foreground text-sm">
                Get an answer in voice while the sideboard draws the idea, scene, or relationship beside you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Realtime Voice Section (id="about") with Warm Clean Editorial Background (No Black) */}
      <section id="about" className="bg-[#f7f6f0] dark:bg-zinc-950/70 border-y border-border/70 px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 text-foreground">
        <div className="mx-auto grid max-w-[76rem] gap-10 sm:gap-14 grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-brand-ink">Realtime voice powered by</span>
              {/* Clean Transparent Logo Badge */}
              <div className="h-7 flex items-center bg-card px-3 py-1 rounded-full border border-border shadow-xs gap-2">
                <div className="relative size-4 shrink-0 flex items-center justify-center">
                  <Image
                    src="/samvaad-symbol-dark.png"
                    alt="Logo"
                    width={16}
                    height={16}
                    className="size-full object-contain dark:hidden"
                  />
                  <Image
                    src="/samvaad-symbol-white.png"
                    alt="Logo"
                    width={16}
                    height={16}
                    className="size-full object-contain hidden dark:block"
                  />
                </div>
                <span className="text-[11px] font-mono font-medium text-foreground">Speech AI</span>
              </div>
            </div>
            <h2 className="text-balance text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.03] tracking-[-0.045em] font-sans text-foreground">
              Stay with the facts, not the paperwork.
            </h2>
            <p className="mt-5 sm:mt-6 max-w-lg text-pretty text-sm sm:text-base leading-7 text-muted-foreground">
              Ask mid-sentence. Interrupt the answer. Jump back two sections. Samvaad keeps the briefing attached to what you can see on the record.
            </p>
          </div>

          {/* Interactive Voice Conversation with Live Chat Animation */}
          <InteractiveVoiceConversation />
        </div>
      </section>

      {/* Dual Showcase Cards Section — Matches Loreline Sideboard Showcase (lines 641-683) */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="mx-auto max-w-[76rem]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-brand-ink">Visual evidence</p>
            <h2 className="mt-4 text-balance text-3xl sm:text-5xl lg:text-6xl font-normal leading-[1.03] tracking-[-0.045em] font-sans">
              Some evidence needs to be seen.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground text-sm sm:text-base">
              Extract timelines, seized assets, and conflicting testimonies. Samvaad AI keeps briefing while anchoring citations directly into official records.
            </p>
          </div>

          <div className="mt-12 sm:mt-14 grid gap-5 lg:grid-cols-2">
            {/* Card 1: Warm Parchment bg-card */}
            <article className="overflow-hidden rounded-[2rem] bg-card p-3 sm:p-4 border border-border shadow-soft">
              <div className="aspect-[3/2] w-full rounded-[1.35rem] bg-canvas p-6 flex flex-col justify-between border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-brand-ink">EVIDENCE OCR DIARY</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-brand-soft text-brand-ink">99.4% Confidence</span>
                </div>
                <div className="space-y-2 font-mono text-xs text-muted-foreground">
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <p className="text-foreground font-medium">Exhibit A-4: 12 Cellular Units Seized</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">IMEI series validated against national stolen registry</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <p className="text-foreground font-medium">Exhibit B-1: 4 Portable Computer Terminals</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Encrypted NVMe storage drives imaged under forensic supervision</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Layers className="size-3.5 text-brand-ink" />
                  <span>Citations anchored to FIR Para 3</span>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold text-brand-ink">
                  Deterministic Evidence Extraction
                </p>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.03em] text-foreground font-sans">
                  Extract confirmed facts, suppress pre-trial speculation.
                </h3>
              </div>
            </article>

            {/* Card 2: High-Contrast Dark Slate bg-foreground */}
            <article className="overflow-hidden rounded-[2rem] bg-foreground p-3 sm:p-4 text-background shadow-panel">
              <div className="aspect-[3/2] w-full rounded-[1.35rem] bg-zinc-900/90 p-6 flex flex-col justify-between border border-white/10 text-white">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-brand">SOVEREIGN SEAL PROTOCOL</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/10 text-brand">SHA-256 Merkle</span>
                </div>
                <div className="space-y-2 font-mono text-xs text-zinc-300">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                    <p className="text-white font-medium">Root Hash: 7f83b1657ff1fc53b92dc181</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Timestamp: 2026-10-15T02:40:00Z • Signer: DCP Cyber Cell</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/10">
                    <p className="text-brand font-medium">Status: Sealed & Cryptographically Verifiable</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Third-party edits permanently alter root signature</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                  <Fingerprint className="size-3.5 text-brand" />
                  <span>Publicly verifiable by media via QR code</span>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold text-brand">
                  Cryptographic Press Anchor
                </p>
                <h3 className="mt-2 text-2xl font-medium tracking-[-0.03em] font-sans">
                  Every briefing sealed with an immutable audit trail.
                </h3>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Pricing Section (id="pricing") — Clean Loreline Cards & Tactile Buttons */}
      <section id="pricing" className="border-t border-border px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 bg-card/25">
        <div className="mx-auto max-w-[76rem]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-ink">Transparent plans</p>
            <h2 className="mt-4 text-balance text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.04] tracking-[-0.045em] text-foreground font-sans">
              Simple, transparent pricing.
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-7 text-muted-foreground">
              Choose the right tier for your team or agency.
            </p>
          </div>

          <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {/* Plan 1 */}
            <div className="rounded-[2.25rem] border border-border bg-card p-6 sm:p-7 lg:p-8 flex flex-col justify-between shadow-soft hover:shadow-float transition-all duration-300">
              <div>
                <p className="text-sm font-semibold text-foreground">Officer Desk</p>
                <p className="mt-2 text-xs text-muted-foreground">For individual spokespersons and field briefing officers.</p>
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
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="w-full mt-8 text-xs font-semibold"
                render={<Link href="/sign-in" />}
              >
                Get Started
              </Button>
            </div>

            {/* Plan 2: Highlighted Department Unit */}
            <div className="rounded-[2.25rem] border-2 border-brand bg-card p-6 sm:p-7 lg:p-8 flex flex-col justify-between shadow-float relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground font-semibold text-[10px] uppercase tracking-wider shadow-xs">
                Most Popular
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Department Unit</p>
                <p className="mt-2 text-xs text-muted-foreground">For police headquarters, commissionerates, and PR divisions.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight text-foreground">₹4,999</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
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
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                variant="default"
                className="w-full mt-8 text-xs font-semibold"
                render={<Link href="/sign-in" />}
              >
                Choose Department Unit
              </Button>
            </div>

            {/* Plan 3 */}
            <div className="rounded-[2.25rem] border border-border bg-card p-6 sm:p-7 lg:p-8 flex flex-col justify-between shadow-soft hover:shadow-float transition-all duration-300">
              <div>
                <p className="text-sm font-semibold text-foreground">State Agency</p>
                <p className="mt-2 text-xs text-muted-foreground">For state home departments, central agencies, and enterprise security.</p>
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
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="w-full mt-8 text-xs font-semibold"
                render={<Link href="/sign-in" />}
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner matching Loreline */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[76rem] overflow-hidden rounded-[2.25rem] bg-brand p-6 sm:p-12 lg:p-18 text-primary-foreground shadow-float">
          <div className="grid gap-8 sm:gap-10 grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="grid size-12 place-items-center rounded-full bg-primary-foreground text-brand">
                <ShieldCheck className="size-6" />
              </span>
              <h2 className="mt-8 sm:mt-10 max-w-3xl text-balance text-3xl sm:text-5xl lg:text-7xl font-normal leading-[0.98] tracking-[-0.05em] font-sans">
                Bring raw case files.
                <br />
                Publish verified truth.
              </h2>
              <p className="mt-5 sm:mt-6 max-w-xl leading-7 text-primary-foreground/80 text-sm sm:text-base">
                Your incident logs, audio transcripts, citations, and official press releases stay cryptographically sealed and accountable.
              </p>
            </div>
            <Button
              size="xl"
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90 text-sm font-semibold px-8 py-4"
              render={<Link href={isAuthenticated ? "/dossiers" : "/sign-in"} />}
            >
              <span>{isAuthenticated ? "Open Incident Desk" : "Access Incident Desk"}</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Classy Simple Footer with Prominent SamvaadLogo */}
      <footer className="border-t border-border px-4 sm:px-6 lg:px-8 py-12 sm:py-14 bg-card/20">
        <div className="mx-auto flex max-w-[76rem] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <SamvaadLogo size="default" themeIntensity="auto" />
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Official press briefing and verification platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-muted-foreground font-medium">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <a href="#about" className="hover:text-foreground transition-colors">
              About
            </a>
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <a
              href="https://github.com/Mayank-saraswal/samvad-ai"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="mx-auto max-w-[76rem] mt-8 sm:mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-muted-foreground font-mono">
          <span>© 2026 Samvaad AI. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <Lock className="size-3 text-brand-ink" />
            <span>Verified Press Disclosures</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

