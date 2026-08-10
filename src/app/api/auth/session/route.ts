import { tokenFrom } from "@/commercial/auth";
import { resolveCustomerApp } from "@/server/customer-app";
import { errorResponse, json } from "@/server/http";

export async function GET(request: Request) {
  try {
    const token = tokenFrom(request);
    const user = resolveCustomerApp().authenticate(token);
    return json({ user }, 200);
  } catch (error) {
    return errorResponse(error);
  }
}