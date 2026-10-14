import Link from "next/link";
import { CreateOrganization } from "@clerk/nextjs";
import { ArrowLeft, Building2 } from "lucide-react";

export const instant = false;

export default function CreateOrganizationPage(): React.JSX.Element {
  return (
    <div className="flex-1 max-w-2xl w-full mx-auto p-6 sm:p-12 flex flex-col space-y-6">
      <Link
        href="/dossiers"
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium w-fit"
      >
        <ArrowLeft className="size-3" /> Back to Incident Dossiers
      </Link>

      <div className="space-y-2 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Building2 className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            Create Department Organization
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Establish an isolated multi-tenant organization for your police commissionerate, disaster response unit, or civic governance bureau.
        </p>
      </div>

      <div className="flex justify-center pt-2">
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
  );
}
