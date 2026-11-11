import assert from "node:assert/strict";
import { test } from "node:test";
import { STAGING_PROJECT_REF, validateStagingConfig, verifyStagingCredential } from "../src/lib/staging-preflight.ts";

const url = `https://${STAGING_PROJECT_REF}.supabase.co`;
const env = {
  SUPABASE_URL: url,
  SUPABASE_PROJECT_ID: STAGING_PROJECT_REF,
  VITE_SUPABASE_URL: url,
  VITE_SUPABASE_PROJECT_ID: STAGING_PROJECT_REF,
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test-only",
};

test("staging config requires exact matching server and client project", () => {
  assert.equal(validateStagingConfig(env).url, url);
  for (const name of ["SUPABASE_URL", "SUPABASE_PROJECT_ID", "VITE_SUPABASE_URL", "VITE_SUPABASE_PROJECT_ID", "SUPABASE_SERVICE_ROLE_KEY"]) {
    assert.throws(() => validateStagingConfig({ ...env, [name]: "" }), /STAGING_PREFLIGHT/);
  }
  assert.throws(() => validateStagingConfig({ ...env, SUPABASE_URL: "https://another.supabase.co" }), /mismatch/);
  assert.throws(() => validateStagingConfig({ ...env, SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_fake" }), /privileged/);
});

test("preflight accepts only successful authentication against staging host", async () => {
  let calls = 0;
  const mock = (async (input: string | URL | Request, init?: RequestInit) => {
    calls++;
    assert.equal(String(input), `${url}/rest/v1/`);
    assert.equal(init?.method, "GET");
    assert.equal(new Headers(init?.headers).get("apikey"), env.SUPABASE_SERVICE_ROLE_KEY);
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    return { ok: true } as Response;
  }) as typeof fetch;
  await verifyStagingCredential(env, mock);
  assert.equal(calls, 1);
  await assert.rejects(verifyStagingCredential(env, (async () => ({ ok: false })) as typeof fetch), /verification failed/);
  await assert.rejects(verifyStagingCredential({ ...env, SUPABASE_URL: "https://production.supabase.co" }, mock), /mismatch/);
  assert.equal(calls, 1);
});
