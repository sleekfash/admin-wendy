# Pricing release rollback gates

Do not execute against production without explicit approval. Verify target identity and migration 09 prerequisites. Rehearse on isolated staging first.

Before migrations 10 and 11, capture a restorable database backup and export exact pre-change rows for the four cake choices, cupcake product, cupcake category, and all cupcake box choices (including whether box-24 exists). Store securely outside Git. Record application deployment SHA, migration checksums, and timestamp. Verify backup restoration on staging.

Apply migrations in order; verify each transaction and compare all expected prices, availability, deposit rules, RPC grants, and historical order snapshots. Stop on any mismatch.

Rollback: pause new checkout writes through an approved maintenance procedure; restore only affected pricing fields from captured pre-change rows in a reviewed transaction, using fresh updated_at values where applicable. If box-24 did not exist, disable it rather than delete it. Preserve all orders created after release and reconcile any affected customer quotes separately. Never restore the entire live database over newer orders merely to revert pricing. Verify exact restored values and application compatibility before resuming checkout. Roll back application deployment separately if needed. Do not assume historical migration literals equal actual pre-release data.

This is a procedure, not an executable rollback script. Generate and rehearse exact SQL from verified pre-change evidence before production release.
