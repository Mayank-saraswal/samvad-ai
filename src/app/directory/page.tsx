import { redirect } from "next/navigation";

export default function DirectoryRedirectPage(): never {
  redirect("/dossiers/directory");
}
