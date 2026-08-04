import { json } from "@/server/http";
import { liveness } from "@/production/health-endpoints";

export async function GET() {
  return json(liveness(), 200);
}
