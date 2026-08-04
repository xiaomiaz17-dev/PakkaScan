/**
 * Founder closed-beta invitations — codes only; no fabricated customer lists.
 */

export type BetaInvite = {
  code: string;
  planHint: "free" | "pro" | "team";
  maxRedemptions: number;
  redeemed: number;
  expiresAt?: string;
  note?: string;
};

const invites = new Map<string, BetaInvite>();

export function seedInvite(invite: BetaInvite): void {
  invites.set(invite.code.toUpperCase(), { ...invite, code: invite.code.toUpperCase() });
}

export function redeemInvite(code: string): { ok: true; invite: BetaInvite } | { ok: false; error: string } {
  const key = code.trim().toUpperCase();
  const invite = invites.get(key);
  if (!invite) return { ok: false, error: "INVALID_INVITE" };
  if (invite.expiresAt && new Date(invite.expiresAt) <= new Date()) return { ok: false, error: "INVITE_EXPIRED" };
  if (invite.redeemed >= invite.maxRedemptions) return { ok: false, error: "INVITE_EXHAUSTED" };
  invite.redeemed += 1;
  invites.set(key, invite);
  return { ok: true, invite };
}

export function listInviteStats(): Array<{ code: string; redeemed: number; maxRedemptions: number }> {
  return [...invites.values()].map((i) => ({
    code: i.code,
    redeemed: i.redeemed,
    maxRedemptions: i.maxRedemptions,
  }));
}
