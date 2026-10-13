import "dotenv/config";
import { buildPublicAuthConfig } from "./auth.js";
import { parseAdminEmails } from "./admin.js";
import { resolveHelpPresentationUrl } from "./help.js";

function resolveDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL?.trim() || "";
  if (!connectionString) {
    return { connectionString: "", ssl: undefined };
  }

  const sslMode = (process.env.DATABASE_SSL || "").toLowerCase();
  const useSsl =
    sslMode === "require" ||
    sslMode === "true" ||
    (!sslMode && !/localhost|127\.0\.0\.1/.test(connectionString));

  return {
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}

const database = resolveDatabaseConfig();

const assets = {
  bucket: process.env.S3_ASSETS_BUCKET?.trim() || "",
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL?.trim() || "",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  get enabled() {
    return Boolean(this.bucket);
  },
};

function envFlag(name, defaultValue = true) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  return !/^(0|false|no|off)$/i.test(raw.trim());
}

const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || "";

export const config = {
  port: Number(process.env.PORT || 3091),
  publicUrl: process.env.APP_PUBLIC_URL || "",
  helpPresentationUrl: resolveHelpPresentationUrl(process.env.APP_HELP_PRESENTATION_URL),
  mcp: {
    enabled: envFlag("MCP_ENABLED", true),
    apiKey: process.env.MCP_API_KEY?.trim() || "",
  },
  admin: {
    emails: parseAdminEmails(process.env.ADMIN_EMAILS),
  },
  public: {
    openEdit: envFlag("PUBLIC_OPEN_EDIT", false),
  },
  astroAssetsBaseUrl: process.env.ASTRO_ASSETS_BASE_URL || "https://assets.astro.space",
  database,
  assets,
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "",
    get enabled() {
      return Boolean(this.url && this.anonKey);
    },
  },
  get publicAuth() {
    return buildPublicAuthConfig({
      url: this.supabase.url,
      anonKey: this.supabase.anonKey,
    });
  },
};
