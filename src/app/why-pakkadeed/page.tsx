import { redirect } from "next/navigation";

/** Backward-compatible path after PakkaScan rebrand. */
export default function Page() {
  redirect("/why-pakkascan");
}
