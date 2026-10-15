import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { PressNoteWorkspace } from "@/components/press-note/press-note-workspace";

interface PressPageProps {
  readonly params: Promise<{ id: string }>;
}

export default async function PressNotePage({ params }: PressPageProps): Promise<React.JSX.Element> {
  const { id } = await params;
  const { isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated) redirect(`/sign-in?next=/press/${id}`);
  if (!orgId) redirect("/dossiers");
  if (!id) notFound();
  return <PressNoteWorkspace documentId={id} canApprove={orgRole === "org:admin"} />;
}
