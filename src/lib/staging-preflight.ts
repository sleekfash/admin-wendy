/**
 * Fail-closed staging identity preflight. Never logs credentials or responses.
 * Run before any staging write-based integration test.
 */
export const STAGING_PROJECT_REF = "zwvyzfsfvfffvcfrumfa";

export function validateStagingConfig(env: Record<string, string | undefined>): {
  url: string;
  key: string;
} {
  const expected = STAGING_PROJECT_REF;
  const url = `https://${expected}.supabase.co`;
  const required = ["SUPABASE_URL", "SUPABASE_PROJECT_ID", "VITE_SUPABASE_URL", "VITE_SUPABASE_PROJECT_ID", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  for (const name of required) {
    if (!env[name]?.trim()) throw new Error(`STAGING_PREFLIGHT: missing ${name}`);
  }
  if (env.SUPABASE_URL !== url || env.VITE_SUPABASE_URL !== url ||
      env.SUPABASE_PROJECT_ID !== expected || env.VITE_SUPABASE_PROJECT_ID !== expected) {
    throw new Error("STAGING_PREFLIGHT: project identity mismatch");
  }
  const key = env.SUPABASE_SERVICE_ROLE_KEY!;
  if (key.startsWith("sb_publishable_")) throw new Error("STAGING_PREFLIGHT: privileged key required");
  if (!key.startsWith("sb_secret_")) {
    // Legacy Supabase service_role credentials are JWTs; reject anon/user JWTs.
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString("utf8"));
      if (payload.role !== "service_role") throw new Error("wrong role");
    } catch {
      throw new Error("STAGING_PREFLIGHT: expected service_role JWT or sb_secret key");
    }
  }
  return { url, key };
}

export async function verifyStagingCredential(
  env: Record<string, string | undefined>,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const { url, key } = validateStagingConfig(env);
  const opaque = key.startsWith("sb_secret_");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: key,
        ...(!opaque ? { Authorization: `Bearer ${key}` } : {}),
      },
      redirect: "error",
      signal: controller.signal,
    });
    // The root REST endpoint returns the PostgREST OpenAPI document.
    // A 2xx response proves the credential is accepted by this exact staging host.
    if (!response.ok) throw new Error("STAGING_PREFLIGHT: credential rejected by staging");
  } catch {
    throw new Error("STAGING_PREFLIGHT: credential verification failed; writes blocked");
  } finally {
    clearTimeout(timeout);
  }
}
