import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { getStore } from "@/server/context";
import { Button } from "@/components/ui/button";
import { ReviewEditor, type DocumentDetail } from "@/components/dossier/review-editor";
import type { MembershipRole } from "@/server/documents/store";

interface DossierPageProps {
  readonly params: Promise<{ id: string }>;
}

export const instant = false;

export default async function DossierDetailPage({ params }: DossierPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const { isAuthenticated, userId, orgId, orgRole } = await auth();

  if (!isAuthenticated || !userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 text-center space-y-5 bg-background text-foreground relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[32rem] bg-[radial-gradient(circle_at_50%_16%,rgba(212,233,74,0.35)_0%,rgba(212,233,74,0.12)_28%,transparent_60%)] animate-blob-slow" />
        <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300 border border-amber-500/30 relative z-10">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-md relative z-10">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            Officer Authorization Required
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Accessing case evidence, OCR inspector, and editorial sign-off requires an authorized officer session.
          </p>
        </div>
        <div className="relative z-10">
          <SignInButton mode="modal">
            <Button variant="default" size="lg">
              Sign In to Access Case
            </Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Force Organization: If no active organization, redirect to dossiers page setup
  if (!orgId) {
    redirect("/dossiers");
  }

  const tenantId = orgId;
  const store = getStore();

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
      userRole = "approver";
    }
  }

  // Look up document strictly scoped to active department organization
  const doc = await store.get({ id, tenantId });

  if (!doc) {
    notFound();
  }

  const detail: DocumentDetail = {
    id: doc.id,
    tenantId: doc.tenantId,
    title: doc.title,
    status: doc.status,
    createdAt: doc.createdAt,
    sources: doc.sources.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      kind: s.kind,
      r2Key: s.r2Key,
      sha256: s.sha256,
      metadata: s.metadata,
      createdAt: s.createdAt,
    })),
    revisions: doc.revisions.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      revisionNumber: r.revisionNumber,
      diff: r.diff,
      factsSnapshot: r.factsSnapshot,
      bundleSnapshot: r.bundleSnapshot,
      authorId: r.authorId,
      reason: r.reason,
      approved: r.approved,
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      createdAt: r.createdAt,
    })),
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[38rem] bg-[radial-gradient(circle_at_50%_12%,rgba(212,233,74,0.36)_0%,rgba(212,233,74,0.13)_28%,transparent_60%)] animate-blob-slow" />
      <div className="relative z-10 flex-1 flex flex-col">
        <ReviewEditor initialDoc={detail} currentUserId={userId} userRole={userRole} />
      </div>
    </div>
  );
}
