---
name: Object Storage runtime env
description: Where Replit Object Storage config lives at runtime vs. the secret store, and how tests should gate on it.
---

# Object Storage runtime env

Replit injects the Object Storage config vars — `PUBLIC_OBJECT_SEARCH_PATHS`,
`PRIVATE_OBJECT_DIR`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID` — directly into the
running process environment. They are NOT in the workspace secret/env store, so
the `viewEnvVars` callback returns `{}` for them. Check `process.env` (e.g.
`printenv` in the app shell) to confirm provisioning, not the secret store.

The signing sidecar lives at `http://127.0.0.1:1106`; POST
`/object-storage/signed-object-url` returns a `storage.googleapis.com` signed URL.
The sidecar signs even keys that don't physically exist (only the GET 404s).

**Why:** these facts are environment-injected, not discoverable from code, and led
to a wrong "bucket not provisioned" assumption when `viewEnvVars` came back empty.

**How to apply:** integration tests that need real signing (e.g. `objstore://` →
HTTPS resolution) only work in Replit. GitHub Actions has no sidecar and no
injected vars, so `resolveStoredMediaUrl` degrades to the raw sentinel (still 200).
Gate such assertions on `Boolean(process.env.PUBLIC_OBJECT_SEARCH_PATHS)` and skip
in CI. A capability probe (attempt a sign) would be a stronger gate than the env var.
