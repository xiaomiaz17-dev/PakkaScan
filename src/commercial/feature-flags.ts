/**
 * Feature flags for beta and commercial rollout.
 */

export type FlagName =
  | "beta_invite_required"
  | "stripe_checkout"
  | "team_workspaces"
  | "ai_assistant"
  | "reviewer_workspace"
  | "sample_property";

const defaults: Record<FlagName, boolean> = {
  beta_invite_required: false,
  stripe_checkout: false, // requires credentials
  team_workspaces: false,
  ai_assistant: false,
  reviewer_workspace: false,
  sample_property: true,
};

export function isEnabled(flag: FlagName, env: Record<string, string | undefined> = process.env): boolean {
  const key = `PAKKASCAN_FLAG_${flag.toUpperCase()}`;
  if (env[key] === "1") return true;
  if (env[key] === "0") return false;
  return defaults[flag];
}

export function flagSnapshot(env: Record<string, string | undefined> = process.env): Record<FlagName, boolean> {
  const out = {} as Record<FlagName, boolean>;
  for (const name of Object.keys(defaults) as FlagName[]) {
    out[name] = isEnabled(name, env);
  }
  return out;
}
