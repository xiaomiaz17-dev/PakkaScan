/**
 * Legacy /app/scan URL redirect to new /scan location.
 * Kept for backward-compatibility with early beta bookmarks.
 */
import { redirect } from "next/navigation";

export default function LegacyScanRedirect() {
  redirect("/scan");
}
