# WB-A03 — Authoritative evidence and release reconciliation

Assessed 25 November 2026. Repository sleekfash/admin-wendy. Scope is evidence reconciliation and release planning.

## Frozen evidence

| Condition | Evidence |
|---|---|
| Integration baseline | main at 20b9cb476051d4f4a8d6c089b2cd4835d3db5fad |
| Audited release candidate | fix/release-stabilization-2026-11 at 7e039d69aafa5aff911f9c7c89d5da430ad499da |
| Ancestry | Candidate 13 ahead, 0 behind main, 13 changed files |
| Open review | PR #9 remains open and its body states DRAFT — DO NOT MERGE |
| CI | Checkout security and build run 45480415061 succeeded for candidate |
| Latest observed branch preview | f27be45101dbc84b1200725e9251b1d67dc89fb2, READY, admin-wendy-ngblx106t-sleekgith-vercel.vercel.app |
| Candidate deployment | Automatic deployment disabled for stabilization branch in vercel.json |
| Staging | zwvyzfsfvfffvcfrumfa INACTIVE |
| Production | rrgusprzsfdmlzsnjixz, confirmed by owner screenshot and previously inspected deployment variables |
| Production API authorization | Both currently advertised Supabase connections still deny get_project on 25 November |
| Other visible projects | njflpholnlxtkcbafhod and qbssluvxwkauussaopma ACTIVE_HEALTHY |

This document adds a later documentation commit. CI and runtime evidence above apply to the frozen candidate. Its checks do not certify later executable changes. Mergeability, branch archival eligibility and production migration history require fresh verification before action.

## Reconciled findings

| Finding | Observed evidence and conclusion | Required acceptance |
|---|---|---|
| CA-01 pricing comparison | 09 sets 8-inch two/three layers to 17000/23000 cents. 10 changes them to 18000/25000, and both 10-inch tier extras from 32000 to 35000. Production values remain UNKNOWN. | Compare captured target rows with the approved matrix before any update |
| CA-02 duplicate 10 prefixes | Two manual SQL files share prefix 10. No version collision was executed here. Distinct full-path IDs and checksums are recorded in WB-A03-MIGRATION-MANIFEST.json. | Execution tooling must consume full IDs and dependencies, reject checksum drift, and record target-specific results. Numeric-prefix-only execution is blocked |
| CA-03 route tree | Archived committed routeTree.gen.ts at f27be45 omits pay-order. Build-generated working tree includes it. Candidate changes no route tree. | Select and enforce generated-file policy, inspect deploy artifact and directly navigate /pay-order |
| CA-04 isolation | client.server.ts invokes guard for staging ID/URL or two named branches. Other branches are outside that branch-specific condition. Browser client accepts configured public URL/key without the privileged guard. | Explicit deployment policy validating public and privileged destinations for every nonproduction deployment |
| CA-05 credentials | staging-preflight.ts checks exact URL/IDs and privileged credential through Auth admin endpoint, but omits public-key authentication. Current branch has no configured verified staging credential set. | Same-project public/privileged credentials, Auth, database grants, private Storage, disabled live payment/email effects |
| CA-06 migration guards | 10 checks choice counts and 09 configuration, not captured old prices. 11 checks base/group and 24-pack but omits complete 6/12-pack verification. | Assert exact captured state or explicitly reviewed drift, then verify all affected rows and descriptions |
| CA-07 test coverage | Four cake pricing cases in tests/custom-cake-pricing.test.ts. Earlier disposable SQL rehearsal covered pack totals, historical orders, backup restoration and targeted rollback, including the committed 11 reapply fix. This is narrower than hosted checkout verification. | Complete cupcake/quantity/deposit matrix, concurrent/retried checkout, synthetic receipt and authorized admin processing in hosted staging |
| CA-08 earlier backlog | Pricing diff does not modify the payment/admin modules listed below. File unchanged status alone does not prove a vulnerability. | Resolve each evidence-backed item below or explicitly defer it with a release impact decision |

## Security and financial remediation register

| Item | Current source evidence | Classification and next check |
|---|---|---|
| Admin route roles | _authenticated/admin.tsx lacks role beforeLoad; admin.functions.ts defines server-side is_admin/is_staff checks | Confirm route defense gap, retain existing server authorization. Enumerate endpoints and test anonymous/customer/staff/admin before assigning exploit impact |
| Public payment lookup | orders.functions.ts getOrderPaymentStatus looks up reference alone and returns amounts/status | Confirmed reference-only disclosure surface. Require order capability and negative enumeration tests |
| Duplicate checkout | createPricedOrder generates a random reference on every call; create_order inserts atomically, with a unique reference constraint | No inspected request-idempotency mechanism. Atomic insert and reference uniqueness do not establish retry deduplication |
| Stripe reconciliation | Webhook validates payment status, matches stored session and filters optimistic updates. Inspected code has no amount_total/currency reconciliation | Existing webhook controls observed. Add amount/currency/order reconciliation and duplicate/out-of-order event tests |
| Payment access | order-access.server.ts HMAC binds id/reference, compares timing-safe, has no expiry and falls back to service-role key | Confirmed missing expiry and dedicated-secret enforcement. Design compatibility for previously issued links |
| Password recovery | auth.tsx uses origin-based redirect and updateUser | Recovery flow exists. Hosted redirect/session/reuse checks remain UNKNOWN |
| Dashboard completeness | admin.functions.ts caps queries at 500 orders and 2000 items | Confirmed query limits. Verify pagination, count and aggregation correctness beyond caps |
| Business timezone | Date handling requires full call-site review | UNKNOWN. Inventory order references, pickup dates, lead times and dashboard grouping against America/Toronto |
| Deposit accounting | Payment statuses include paid and refunded; order rows contain due_now and balance | Meaning of paid for deposit collection requires explicit business acceptance and tested balance collection workflow |

## Authoritative release acceptance

All amounts below are CAD integer cents. Cake sizes must match migration 09 plus the four migration 10 adjustments. Cake base stays zero, deposit 70%, and the retired 6-inch one-layer choice stays unavailable. Cupcake base is 3500 with box deltas 0/2500/7300 for 6/12/24, yielding 3500/6000/10800 per pack. Box-20 is rejected. Quantities multiply exact server totals. Test rounding and balance using the actual pricing implementation.

Capture target project, schema, privileges, migration ledger, affected rows and backup before applying changes. Verify backup restoration and targeted rollback while preserving new orders. Reapply 11 must re-enable only the expected disabled 24-pack and reject conflicting prices. Use private synthetic receipts. Verify cross-order token rejection, unauthorized admin access, storage access, retry/concurrency behavior and payment state transitions.

## Staging resolution and release order

WB-A03 records the manifest and reconciled register. Target application states in the manifest remain UNKNOWN until verified from that target.

WB-A04 must establish access to the owning account and active isolated staging. Existing staging remains preferred. Capacity resolution may use an approved pause of an unused project, support resolution, or an approved paid/replacement environment. No project deletion is authorized by this assessment. Reusing the production credential in staging is outside the accepted isolation model.

WB-A05 addresses CA-03 through CA-07 and financial blockers with narrow changes and regression coverage. WB-A06 executes hosted apply/rollback/reapply and the runtime matrix against the exact commit. WB-A07 requires explicit production migration clearance and a release decision based on all outstanding financial/security findings. WB-A08 reviews secondary repository and deployed branch dependencies before archival.

## Evidence limitations

No hosted integration test or migration ran during WB-A03. The local rehearsal used PGlite PostgreSQL 17.5 and minimal Auth scaffolding, repository schema and a historical main catalogue fixture with contact/payment settings excluded. Hosted Supabase is a different runtime and its rows are authoritative. The screenshot's empty migration/backups widgets do not establish empty schema or absence of all backup mechanisms.

GitHub CI https://github.com/sleekfash/admin-wendy/actions/runs/45480415061
PR https://github.com/sleekfash/admin-wendy/pull/9
Comparison https://github.com/sleekfash/admin-wendy/compare/20b9cb476051d4f4a8d6c089b2cd4835d3db5fad...7e039d69aafa5aff911f9c7c89d5da430ad499da
