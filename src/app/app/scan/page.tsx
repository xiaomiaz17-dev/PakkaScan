/**
 * Old /app/scan URL now redirects to the homepage.
 * The homepage IS the scan page as of this consolidation.
 * This route exists to preserve old bookmarks and shared links.
 */
import { redirect } from "next/navigation";

export default function OldScanRoute() {
  redirect("/");
}
