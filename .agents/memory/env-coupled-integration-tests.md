---
name: Env-coupled integration tests (Replit vs CI)
description: Integration tests that assert integration-unconfigured behavior fail in the Replit workspace because those integrations ARE configured there.
---

Some backend integration tests hard-code the CI assumption that a third-party
integration is NOT configured, and assert the "degraded" contract. In the Replit
workspace those integrations ARE configured, so the real behavior fires and the
assertion flips.

Known cases (both introduced by the launch-plan merge):
- CMS sentinels: asserts `objstore:// -> HTTPS` signed URL. Only holds when the
  Object Storage sidecar is available (Replit). In CI it degrades to the raw
  sentinel. Gate on `Boolean(process.env.PUBLIC_OBJECT_SEARCH_PATHS)`.
- Marketing `/api/contato`: asserted `delivered=false` assuming Resend unset. The
  workspace has `resend_api_key` set so the mail is actually sent (`delivered=true`).
  Gate on `Boolean(process.env.resend_api_key || process.env.RESEND_API_KEY)` —
  mirror the exact env the server reads (`server/lib/email.ts`).

**Why:** Replit injects real integration config at runtime; CI has none. A test
that pins one side of an env-dependent branch is red in the other environment.

**How to apply:** When an integration test compares against a hard-coded
"integration off" value, gate the assertion on the same env var the server
checks, so it validates the real contract in Replit and the degraded contract in
CI. Prefer this over `it({skip})` when other assertions in the same block (e.g.
rate limiting) must keep running.
