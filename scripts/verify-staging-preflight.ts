import { verifyStagingCredential } from "../src/lib/staging-preflight.ts";

try {
  await verifyStagingCredential(process.env);
  console.log("STAGING_PREFLIGHT: PASS (staging project and credential verified; no writes performed)");
} catch {
  console.error("STAGING_PREFLIGHT: BLOCKED (configuration or credential verification failed)");
  process.exitCode = 1;
}
