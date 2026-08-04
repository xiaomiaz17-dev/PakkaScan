import { FixedWindowRateLimiter } from "../production/rate-limit";

const loginLimiter = new FixedWindowRateLimiter(5, 60_000);

export function assertLoginAllowed(key: string): void {
  const result = loginLimiter.attempt(key);
  if (!result.allowed) throw new Error("RATE_LIMITED");
}

export function resetLoginRateLimiterForTests(): void {
  loginLimiter.reset();
}
