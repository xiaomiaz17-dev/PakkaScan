/**
 * Neon Postgres client.
 *
 * Uses @neondatabase/serverless which is optimized for serverless
 * environments (Vercel functions) - opens/closes connections per
 * request instead of maintaining a persistent pool.
 */

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// Convenience row types
export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  last_login_at: Date | null;
  email_verified_at: Date | null;
};

export type SessionRow = {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  last_seen_at: Date;
  ip_address: string | null;
  user_agent: string | null;
};

export type MagicLinkRow = {
  id: string;
  email: string;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
};
