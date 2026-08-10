# 🆔 did:jwks Studio & W3C DID Resolver

An interactive **W3C Decentralized Identifier (DID) Resolver**, **JWKS Generator**, and **OpenID Connect Identity Bridge** for **Catena Labs `did:jwks`**.

---

## 🌟 Key Features

- 🆔 **did:jwks W3C Resolver**: Generatively transform OpenID Connect and OAuth2 JWKS endpoints directly into W3C DID Documents.
- 🔐 **JWKS Key Set Generator**: Generate Ed25519 and RSA-2048 key pairs with automatic `did:jwks` URI mapping.
- 🌐 **Interactive Web Studio**: Real-time DID Document visualizer and JWKS generator on `http://localhost:3421`.
- ⌨️ **Universal CLI (`did-jwks-cli`)**: Terminal utility for resolving DIDs and exporting key sets.

---

## 🚀 Quickstart

```bash
# Launch did:jwks Studio
npm start
# Open http://localhost:3421

# Or run via CLI
node bin/jwks-cli.js resolve "did:jwks:https:auth.catena.network:.well-known:jwks.json#key-1"
node bin/jwks-cli.js generate "agent.catena.network"
```
