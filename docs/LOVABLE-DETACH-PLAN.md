# Lovable detach plan

## Purpose
Remove the project’s dependence on Lovable-specific branding, tooling and generated metadata without breaking the app runtime or deployment pipeline.

## Risk assessment
This project explicitly depends on Lovable for its Vite configuration:

- `vite.config.ts` imports `@lovable.dev/vite-tanstack-config`
- `AGENTS.md` states that this project is connected to Lovable
- `.lovable/project.json` and `.lovable/plan/*` are generated Lovable metadata

There is a real risk that deleting or rewriting this layer in one pass will break the local and Vercel build, because the app is currently configured through that wrapper. The risk is not hypothetical; the repo comments themselves warn not to duplicate plugin setup manually.

## Safe staged plan

### Phase 1: Freeze and snapshot
- create a clean branch or tag before any detachment work
- capture the current working build state and deployment settings
- record the current Vite/TanStack configuration and environment variables

### Phase 2: Remove branding only, not runtime wiring
- replace Lovable branding in user-facing text, docs, and UI labels
- remove explicit Lovable references from comments/docs/metadata
- leave runtime config in place until the project can be built cleanly without it

### Phase 3: Replace the Lovable Vite wrapper with standard config
- replace `@lovable.dev/vite-tanstack-config` in `vite.config.ts` with a plain `defineConfig` using the actual TanStack Start and Vite plugins required by the project
- keep the existing `tanstackStart.server.entry` setting and the custom alias for `@/integrations/supabase/client`
- avoid re-adding plugins manually unless they are explicitly required by the app

### Phase 4: Remove generated Lovable metadata
- remove `.lovable/` once the app builds without it
- remove references in AGENTS and any project docs that assume Lovable as the source of truth

### Phase 5: Validate in a clean environment
- run local build and lint
- run a smoke test of the route tree and server functions
- verify Supabase/Vercel environment variables still resolve in the new config

### Phase 6: Release only after green validation
- ship only after the app builds locally and the generated route/server entry still works
- revert immediately if the build or SSR entry fails

## Immediate recommendation
Do not remove Lovable from the app in a single edit. The correct move is a staged detach, and only after the build is green with the wrapper removed.

## High-risk points to watch
- Vite plugin duplication
- SSR entry mismatches (`src/server.ts`, `src/start.ts`, `tanstackStart.server.entry`)
- route generation / TS path aliases
- deployment configuration that assumes the Lovable wrapper
- any generated file that the project uses as the source of truth for dev/build behavior
