---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

# did-method-jwks Project

This project implements a DID method that bridges OAuth2/OIDC infrastructure with the DID ecosystem by making JWKS endpoints directly usable as DID identifiers.

## Project Overview

The `did:jwks` method allows existing OAuth2 providers to become DID-compatible without infrastructure changes. It transforms JWKS endpoints into standard DID documents with proper verification methods.

### Key Components

- **DID Resolution**: Resolves `did:jwks:domain.com` to `https://domain.com/.well-known/jwks.json`
- **Fallback Discovery**: Falls back to OAuth2/OIDC discovery (`/.well-known/openid-configuration`) if JWKS endpoint 404s
- **DID Document Generation**: Transforms JWKS into standard DID documents with verification methods
- **Standard Integration**: Works with existing DID resolution libraries

### Architecture

```
src/
├── index.ts           # Main export (resolver)
├── resolver.ts        # Core DID resolver implementation
├── did-document.ts    # DID document generation from JWKS
├── did-jwks.ts        # DID:JWKS specific logic
├── fetch.ts           # HTTP fetching utilities
├── schemas.ts         # Validation schemas
└── resolver.test.ts   # Tests
```

## Development Guidelines

### Runtime

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

### Quality Assurance

Always run these commands before committing:

```bash
bun run check  # Runs format:check, lint, typecheck, and test
bun run fix    # Auto-fixes formatting and linting issues
```

### Testing

Use `bun test` to run tests.

```ts#example.test.ts
import { test, expect } from "bun:test";

test("did:jwks resolution", async () => {
  const result = await resolve("did:jwks:example.com");
  expect(result).toBeTruthy();
});
```

### Dependencies

Key dependencies:

- `valibot`: Schema validation (preferred over Zod in this project)
- `web-identity-schemas`: Common web identity schemas
- `did-resolver`: Standard DID resolution interface

### APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Use Cases

This method is designed for:

- JWT verification where issuer is `did:jwks:mycompany.com`
- Verifiable credentials issued by OAuth2 providers
- DID-Comm using corporate key management
- Domain-based cryptographic verification

### Security Considerations

- Always validate JWKS responses against schemas
- Implement proper error handling for network requests
- Follow standard DID document security practices
- Validate domain ownership through standard web mechanisms

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.
