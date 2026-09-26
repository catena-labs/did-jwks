---
"did-jwks": patch
---

feat(cli): add --help, configurable http-allowed hosts, and cleaner error output

The CLI previously hard-coded `localhost`/`0.0.0.0` as http-allowed hosts, printed usage only after a failed parse (with a stray space in `Invalid DID: `), and dumped raw error objects on fatal failures. It now supports `--help`/`-h` (usage to stdout, exit 0), `--allow-http=<host,...>` and a `DID_JWKS_ALLOW_HTTP_HOSTS` env var for extending the http allowlist, rejects unknown flags/extra positionals with usage on stderr, and prints fatal errors as messages instead of stack dumps.
