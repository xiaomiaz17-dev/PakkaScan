import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBetaScanJob } from "@/lib/beta-scan-jobs";

export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> | { jobId: string } },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "NOT_SIGNED_IN", message: "Please sign in to use PakkaScan." },
      { status: 401 },
    );
  }

  const rawParams = context.params;
  const params = typeof (rawParams as Promise<{ jobId: string }>).then === "function"
    ? await (rawParams as Promise<{ jobId: string }>)
    : (rawParams as { jobId: string });
  const jobId = String(params?.jobId || "").trim();
  if (!jobId) {
    return NextResponse.json({ error: "MISSING_JOB_ID" }, { status: 400 });
  }

  const job = await getBetaScanJob(jobId);
  if (!job || job.user_id !== session.userId) {
    return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    result: job.status === "completed" ? job.result_json : undefined,
    error: job.status === "failed" ? job.error_text : undefined,
  });
}
