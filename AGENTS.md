# AGENTS.md

This project holds the spec and implementation for the `jwks` DID method.

## Commands

```bash
pnpm run check          # Full CI check: format:check, lint, typecheck, test
pnpm run fix            # Auto-fix formatting and lint issues
pnpm test               # Run all tests across all packages
pnpm run build          # Build all packages

# Single package tests
pnpm --filter=did-jwks test
pnpm --filter=jwks-did-resolver test

# Run a specific test file
pnpm --filter=did-jwks exec vitest run src/did-jwks.test.ts

# CLI (resolves a DID and prints the document)
pnpm run cli -- did:jwks:accounts.google.com

# Typecheck
pnpm run typecheck      # Single tsconfig.json at root, covers all packages
```

## Architecture

pnpm monorepo with three packages under `packages/`:

- **did-jwks** — Core implementation. Exports `fetchJwks`,
  `fetchJwksDidDocument`, `createDidJwksDidDocument`, `isDidJwks`. Contains the
  CLI (`cli.ts`).
- **jwks-did-resolver** — Thin adapter wrapping `did-jwks` for the standard
  `did-resolver` library. Exports `getResolver()`.
- **test-utils** (`@repo/test-utils`) — Shared test fixtures, mocks, and custom
  matchers. Private package, not published.

### Resolution flow

`did:jwks:domain.com` resolves as:

1. Parse DID into base URL (`https://domain.com`)
2. Fetch `/.well-known/jwks.json` (or `{path}/jwks.json` for path DIDs)
3. If 404, fall back to OIDC discovery (`/.well-known/openid-configuration`) to
   find `jwks_uri`
4. Transform JWKS keys into DID document verification methods using JWK
   thumbprints as fragment IDs
5. Keys with `use: "enc"` go to `keyAgreement`; all others go to
   `authentication` + `assertionMethod`

Path DIDs (e.g., `did:jwks:example.com:path:segment`) use RFC 8414-style
discovery where `.well-known/openid-configuration` is inserted between origin
and path.

## Conventions

- **Validation**: Use `valibot` (not zod). Schemas from `web-identity-schemas`
  and `web-identity-schemas/valibot`.
- **Linting/Formatting**: `oxlint` and `oxfmt` (not eslint/prettier). Config in
  `.oxlintrc.json`.
- **Bundling**: `tsdown` per-package (ESM only).
- **TypeScript**: Strict mode, `noUncheckedIndexedAccess`, bundler module
  resolution. `any` is banned (except in test files).
- **Testing**: Vitest with shared setup from `test-utils/setup.ts`. Tests
  colocated with source (`*.test.ts`).
- **Types**: Use `Did<"jwks">` from `web-identity-schemas` for typed DID
  strings. Use `standard-parse` for parsing.
- **Publishing**: Changesets (`@changesets/cli`). Run `pnpm run publint` to
  verify package exports before publishing.
