export type ProductionConfig = {
  databaseUrl: string;
  objectStorageBucket: string;
  reportSigningSecret: string;
  billingWebhookSecret: string;
  appBaseUrl: string;
  environment: "development" | "test" | "production";
};

function requireValue(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing required configuration: ${key}`);
  return value;
}

export function loadProductionConfig(env: Record<string, string | undefined>): ProductionConfig {
  const environment = (env.NODE_ENV ?? "development") as ProductionConfig["environment"];
  if (!(["development", "test", "production"] as const).includes(environment)) {
    throw new Error(`Unsupported NODE_ENV: ${environment}`);
  }
  const config: ProductionConfig = {
    databaseUrl: requireValue(env, "DATABASE_URL"),
    objectStorageBucket: requireValue(env, "OBJECT_STORAGE_BUCKET"),
    reportSigningSecret: requireValue(env, "REPORT_SIGNING_SECRET"),
    billingWebhookSecret: requireValue(env, "BILLING_WEBHOOK_SECRET"),
    appBaseUrl: requireValue(env, "APP_BASE_URL"),
    environment,
  };
  if (environment === "production") {
    if (!config.databaseUrl.startsWith("postgres")) throw new Error("Production DATABASE_URL must use PostgreSQL");
    if (!config.appBaseUrl.startsWith("https://")) throw new Error("Production APP_BASE_URL must use HTTPS");
    if (config.reportSigningSecret.length < 32 || config.billingWebhookSecret.length < 32) {
      throw new Error("Production signing secrets must be at least 32 characters");
    }
  }
  return config;
}
