---
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

### Monorepo Architecture

```
packages/
├── did-jwks/                # Core implementation
│   └── src/
│       ├── index.ts         # Main export
│       ├── cli.ts           # CLI implementation
│       ├── did-jwks.ts      # Core DID:JWKS logic
│       ├── fetch.ts         # HTTP utilities
│       └── utils/
│           ├── fetch-with-schema.ts
│           └── schemas.ts   # Validation schemas
├── jwks-did-resolver/       # did-resolver integration
│   └── src/
│       ├── index.ts         # Resolver export
│       ├── resolver.ts      # DID resolver implementation
│       └── resolver.test.ts # Tests
└── test-utils/            # Shared test utilities
    ├── fixtures/            # Test data
    ├── helpers/
    └── setup.ts
```

## Development Guidelines

### Quality Assurance

Always run these commands before committing:

```bash
pnpm run check  # Runs format:check, lint, typecheck, and test
pnpm run fix    # Auto-fixes formatting and linting issues
```

### Testing

Use `pnpm test` to run tests.

```ts#example.test.ts
import { test, expect } from "vitest";

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
