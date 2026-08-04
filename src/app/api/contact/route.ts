import { json } from "@/server/http";

/** Contact intake — stores nothing until a durable mailbox is configured. */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let name = "";
    let email = "";
    let message = "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = String(body.name ?? "");
      email = String(body.email ?? "");
      message = String(body.message ?? "");
    } else {
      const form = await request.formData();
      name = String(form.get("name") ?? "");
      email = String(form.get("email") ?? "");
      message = String(form.get("message") ?? "");
    }
    if (!name.trim() || !email.trim() || !message.trim()) {
      return json({ error: "VALIDATION_FAILED" }, 400);
    }
    // No fabricated outbound email; acknowledge receipt for UX.
    return json({ ok: true, received: true }, 202);
  } catch {
    return json({ error: "REQUEST_FAILED" }, 400);
  }
}
