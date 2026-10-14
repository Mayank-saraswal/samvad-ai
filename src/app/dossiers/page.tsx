import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignInButton, CreateOrganization } from "@clerk/nextjs";
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  FolderOpen,
} from "lucide-react";
import { getStore } from "@/server/context";
import { Button } from "@/components/ui/button";
import { WorkspaceSelector } from "@/components/dossier/workspace-selector";
import type { MembershipRole } from "@/server/documents/store";

export const instant = false;

export default async function DossiersPage(): Promise<React.JSX.Element> {
  const { isAuthenticated, userId, orgId, orgRole } = await auth();
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
            Authorization Required
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Access to verified incident synthesis, multimodal evidence analysis, and public disclosure generation requires an authorized officer or manager session.
          </p>
        </div>
        <div className="relative z-10">
          <SignInButton mode="modal">
            <Button variant="default" size="lg">
              Sign In to Incident Portal
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Force Organization Creation: A signed-in user MUST create or join an organization
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
              Organization Setup Required
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welcome to Samvaad AI. All incident dossiers, multimodal evidence, and sovereign disclosures are strictly scoped to verified department organizations. Please create your department organization to proceed.
            </p>
          </div>

          <div className="w-full flex justify-center pt-2">
            <CreateOrganization
              afterCreateOrganizationUrl="/dossiers"
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

  const tenantId = orgId;
  const store = getStore();

  // Map Clerk Organization role to 3-tier sovereign RBAC:
  // - org:admin -> "approver"
  // - org:member -> "contributor"
  // - org:auditor -> "auditor"
  let userRole: MembershipRole = "approver";
  if (orgRole === "org:admin") {
    userRole = "approver";
  } else if (orgRole === "org:member") {
    userRole = "contributor";
  } else if (orgRole === "org:auditor") {
    userRole = "auditor";
  } else {
    const existingMembership = await store.getMembership({ userId, tenantId });
    if (existingMembership) {
      userRole = existingMembership.role;
    } else {
      await store.addMembership({ userId, tenantId, role: "approver" });
      userRole = "approver";
    }
  }

  const documents = await store.list(tenantId, 50);

  const officerName = user?.fullName || user?.firstName || "Duty Officer";
  const draftCount = documents.filter((d) => d.status === "draft").length;
  const approvedCount = documents.filter((d) => d.status === "approved").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Soft Radial Luminous Green Glow Blob matching Loreline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[38rem] bg-[radial-gradient(circle_at_50%_12%,rgba(212,233,74,0.36)_0%,rgba(212,233,74,0.13)_28%,transparent_60%)] animate-blob-slow" />

      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 space-y-8">
        {/* Navigation Switcher Tabs: Dispatch Desk <-> Active Directory */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card/85 backdrop-blur-md border border-border/80 shadow-xs max-w-fit">
          <Link
            href="/dossiers"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-background text-foreground shadow-xs ring-1 ring-foreground/15 transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="size-3.5 text-brand" />
            <span>Incident Dispatch Desk</span>
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <Link
            href="/dossiers/directory"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="size-3.5" />
            <span>Active Directory</span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {documents.length}
            </span>
          </Link>
        </div>

        {/* Editorial Header with Eyebrow and Sleek Live Metric Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft/60 border border-brand/40 text-brand-ink text-xs font-semibold shadow-xs">
              <ShieldCheck className="size-3.5 text-brand-ink" />
              <span>Sovereign Press &amp; Incident Desk</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-semibold tracking-tight text-foreground leading-[1.08]">
              Incident Disclosure Desk
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Logged in as <strong className="text-foreground font-medium">{officerName}</strong>. Synthesize raw evidence, FIR records, and field debriefs into verified public disclosures.
            </p>
          </div>

          {/* Live Metrics Pills matching Loreline aesthetics */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
            <div className="px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md ring-1 ring-foreground/10 shadow-soft flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-foreground/30" />
              <span className="text-xs text-muted-foreground font-medium">Total Files:</span>
              <span className="text-sm font-semibold font-mono text-foreground">{documents.length}</span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md ring-1 ring-foreground/10 shadow-soft flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">In Review:</span>
              <span className="text-sm font-semibold font-mono text-amber-800 dark:text-amber-300">{draftCount}</span>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md ring-1 ring-foreground/10 shadow-soft flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground font-medium">Sealed:</span>
              <span className="text-sm font-semibold font-mono text-emerald-700 dark:text-emerald-400">{approvedCount}</span>
            </div>
          </div>
        </div>

        {/* Unified Multi-Domain Studio & Quick Creation */}
        <WorkspaceSelector tenantId={tenantId} userRole={userRole} />
      </div>
    </div>
  );
}

