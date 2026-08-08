# TSCOnline Agent Instructions

This file is the repository-level instruction source for coding agents working in this repo.

## Purpose

Use these instructions to avoid generic monorepo behavior and follow the actual operating constraints of TSCOnline. This repo has several coupled systems: a React frontend, a Fastify backend, a shared contract package, a standalone MCP server, Java-based chart generation, supporting asset downloads, translation generation, and help-content processing. Agents that treat it like a normal TypeScript web app will miss important constraints.

## Repo Overview

- This repo is a Yarn 4 workspace monorepo.
- Main workspaces:
  - `app`: React + Vite frontend
  - `server`: Fastify backend
  - `shared`: shared types, assertions, constants, and cross-package contracts
  - `mcp`: standalone Fastify MCP server
- Main backend runs on port `3000`.
- MCP server runs on port `3001`.
- Root scripts orchestrate multiple workspaces and some setup steps are network- and asset-dependent.

## Core Principles

- Prefer the existing repo structure and conventions over introducing new patterns.
- Make the smallest change that actually solves the task.
- Inspect the relevant source files before changing behavior. Do not infer repo policy from `package.json` alone.
- Avoid unrelated refactors.
- Preserve cross-workspace compatibility whenever you touch shared contracts.
- Assume there may be external runtime dependencies not obvious from the current code diff.

## What To Read First

When working in a given area, inspect these files first:

- Frontend routes and app shell: `app/src/App.tsx`
- Frontend state wiring: `app/src/state/index.ts`, `app/src/state/state.ts`, `app/src/state/actions/`
- Frontend theme system: `app/src/theme.ts`
- Backend bootstrap and route registration: `server/src/index.ts`
- Backend route handlers: `server/src/routes/`, `server/src/admin/`, `server/src/workshop/`, `server/src/crossplot/`
- Shared contracts: `shared/src/index.ts`, `shared/src/settings-types.ts`
- MCP bootstrap and transport/session logic: `mcp/src/index.ts`, `mcp/src/fastify.ts`, `mcp/src/mcp.ts`
- Runtime asset config: `server/assets/config.json`

## Common Commands

- Install dependencies: `yarn`
- Build all workspaces: `yarn build`
- Start full local dev stack: `yarn dev`
- Start compiled backend: `yarn start`
- Run unit/integration tests: `yarn test`
- Run coverage: `yarn coverage`
- Run chart end-to-end tests: `yarn test:charts`
- Run formatting and lint checks: `yarn quality`
- Run combined quality/build/test flow: `yarn qc`
- Start Playwright stack: `yarn dev:playwright`

## Important Operational Facts

- `yarn dev` is not a lightweight frontend-only command. It runs `yarn setup-files` first, then starts several long-running processes.
- `yarn setup-files` pulls supporting files, configures dev config, initializes translations, migrates datapacks, and pulls help content.
- Some setup steps depend on Dropbox credentials and other environment variables. Do not assume a clean local run is always possible in a restricted environment.
- The backend uses runtime files configured in `server/assets/config.json`, including JAR paths, datapack directories, uploads, translations, and help-content paths.
- Java JAR presence is verified at backend startup.
- Playwright startup depends on the backend and frontend both becoming available, and indirectly on setup-file behavior.

## Validation Rules

- Run the smallest relevant validation for the files you changed.
- Prefer targeted validation over full-repo validation when the task is localized.
- For docs-only changes, path/link/fact verification is often enough.
- For shared contract changes, at minimum consider the affected consumers in `app`, `server`, and `mcp`.
- If you do not run validation, say so explicitly.

## Files And Directories To Treat Carefully

Avoid hand-editing generated, derived, or runtime-output directories unless the task explicitly requires it:

- `app/dist/`
- `server/dist/`
- `shared/dist/`
- `mcp/dist/`
- `coverage/`
- `test-results/`
- `server/public/charts/`
- `server/decryptedCache/`

These are usually build outputs, caches, or runtime artifacts rather than source-of-truth files.

## Frontend Rules

- The frontend uses MobX with `configure({ enforceActions: "observed" })` in `app/src/state/state.ts`.
- Do not mutate observable state ad hoc from arbitrary components. Follow the existing actions/state pattern in `app/src/state/actions/`.
- Before changing state behavior, inspect the relevant action modules instead of writing direct mutations in UI code.
- Reusable UI belongs in `app/src/components/` when it is not feature-specific.
- Main route definitions are in `app/src/App.tsx`; keep new route work consistent with that file’s pattern.
- The theme system in `app/src/theme.ts` is extensive and customized. Do not bypass it casually with new hardcoded color systems.
- If you must add styling, first check whether the surrounding feature uses CSS modules, plain CSS, MUI theme tokens, or wrapped components, and stay consistent with that local pattern.

## Backend Rules

- The backend source of truth for route registration is `server/src/index.ts`.
- Do not update docs or assumptions about routes without checking `server/src/index.ts`.
- Backend behavior is spread across:
  - `server/src/routes/`
  - `server/src/admin/`
  - `server/src/workshop/`
  - `server/src/crossplot/`
  - `server/src/help/`
- The backend is not just REST + static files. It also includes:
  - WebSocket chart generation
  - WebSocket MCP chart-state sync
  - session-based auth
  - rate limiting
  - chart caching
  - workshop/file/datapack download flows
  - bug report submission
  - translation generation
  - help markdown processing
  - scheduled background cleanup and email jobs
- Be careful when changing route behavior that is also used by the frontend and MCP server.

## Shared Package Rules

- `shared` is the contract layer between the frontend, backend, and MCP server.
- If you change types in `shared`, assume all three consumers may need updates.
- Do not move cross-package contracts into `app`, `server`, or `mcp`.
- Prefer existing assertion helpers and established contract patterns where available.
- MCP chart-state types and sync message types already live in `shared/src/index.ts`; keep that centralized.

## MCP Rules

- `mcp` is a standalone Fastify service, not a utility folder under `server`.
- Treat it as an independent runtime with its own auth token, transport lifecycle, and session model.
- MCP transport/session wiring lives in `mcp/src/fastify.ts`.
- MCP tool/resource/session logic lives in `mcp/src/mcp.ts`.
- The main backend also exposes `/mcp/*` helper routes in `server/src/routes/mcp-routes.ts`.
- Do not confuse the standalone MCP server with the main backend helper routes:
  - `mcp/` owns the MCP protocol surface on port `3001`
  - `server/` owns the app/backend helper routes on port `3000`
- If you change MCP-related shared messages or session flow, verify both sides of the integration.

## Assets, Datapacks, And Supporting Files

- `server/assets/config.json` is the runtime path/config source of truth.
- Datapacks, charts, uploads, translations, help content, and JAR paths are config-driven.
- Do not hardcode replacement asset paths if the config is supposed to control them.
- `server/src/pull-supporting-files.ts` downloads datapacks and JARs from Dropbox. Changes here can affect local setup and CI/operator workflows.
- Be conservative with anything that deletes, replaces, or migrates datapack-related directories.

## Translations Rules

- Translation data is split across:
  - `server/assets/translations/*.csv`
  - `shared/translations/*.json`
- There is an explicit warning flow in `server/src/translations/warn-modify-translations.ts` because direct edits can be overwritten.
- Agents can easily miss this: do not casually edit one side of the translation pipeline without understanding the generation flow.
- If you change translation-related behavior, inspect:
  - `server/src/translations/create-translations-from-csv.ts`
  - `server/src/translations/modify-translations.ts`
  - `server/src/translations/warn-modify-translations.ts`

## Help Content Rules

- Help content is not just static markdown in `docs/`.
- The backend also processes help markdown trees through `server/src/help/`.
- If you change help-content behavior, inspect:
  - `server/src/help/process-markdown-tree.ts`
  - `server/src/help/help-routes.ts`
- Do not assume documentation changes and help-system changes are the same thing.

## Testing Notes

- Root `yarn test` uses Vitest.
- Playwright tests live under `app/__tests__/app/`.
- `yarn test:charts` uses `playwright.config.ts` and starts a local stack through `yarn dev:playwright`.
- Playwright startup depends on the backend and frontend both becoming available, so failures may be environment/setup related, not just test logic.

## Documentation Rules

- For docs work, prefer additive edits over rewrites unless explicitly asked.
- Keep style consistent with the file you are editing.
- Verify repo structure, routes, commands, ports, and workspace counts against source files.
- Do not “clean up” docs structure unless the user explicitly wants a rewrite.

## Pitfalls Agents Might Overlook

- Thinking `package.json` alone defines the system. It does not; `server/assets/config.json`, route registration, and shared contracts matter just as much.
- Treating `mcp` as a helper package instead of a standalone service.
- Updating only one side of a shared contract used by `app`, `server`, and `mcp`.
- Mutating MobX state directly from components instead of going through the established actions flow.
- Introducing hardcoded colors or a parallel styling system instead of using the existing theme conventions.
- Editing generated or derived outputs in `dist`, `coverage`, `test-results`, or cached chart folders.
- Documenting backend routes from old markdown instead of `server/src/index.ts`.
- Forgetting that `yarn dev` and Playwright startup may depend on networked setup files and external credentials.
- Editing translation JSON or CSV in isolation and breaking the translation generation pipeline.
- Confusing repo docs in `docs/` with backend help-content processing under `server/src/help/`.
- Changing MCP message/session flow on one side only and breaking live chart sync.
- Assuming backend file paths are fixed when they are actually config-driven.
- Forgetting that some backend routes are session-protected, IP-restricted, or WebSocket-based.

## Preferred Change Style

- Keep changes local and explainable.
- Preserve naming and structure unless there is a concrete reason to change them.
- If a change spans multiple workspaces, make the coupling explicit in your reasoning and validation.
- When in doubt, choose the more conservative implementation that matches existing repo patterns.
