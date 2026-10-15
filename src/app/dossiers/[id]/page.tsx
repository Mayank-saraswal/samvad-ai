import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PressNoteWorkspace } from "@/components/press-note/press-note-workspace";

interface DossierPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function DossierDetailPage({ params }: DossierPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const { isAuthenticated, userId, orgId, orgRole } = await auth();

  if (!isAuthenticated || !userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 text-center space-y-5 bg-background text-foreground relative overflow-hidden">
        <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300 border border-amber-500/30 relative z-10">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-md relative z-10">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            Officer Authorization Required
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Accessing the press desk requires an authorized officer session.
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

  if (!orgId) {
    redirect("/dossiers");
  }
  if (!id) {
    notFound();
  }

  return <PressNoteWorkspace documentId={id} canApprove={orgRole === "org:admin"} />;
}
