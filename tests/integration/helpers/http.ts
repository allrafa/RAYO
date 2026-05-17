// Task #234 — HTTP helper minimalista pra integration tests.
//
// Por que não supertest? Express 5 + ESM + tsx + node:test funcionam
// melhor com `app.listen(0)` + `fetch` nativo. Boot custa ~10ms por
// spec e o `withServer` fecha tudo no `finally`, evitando handles
// vazados que segurariam o `node --test`.
//
// Uso:
//   await withServer(createTestApp(), async (base) => {
//     const r = await request(base, { method: "GET", path: "/api/health" });
//     assert.equal(r.status, 200);
//   });
import type { Express } from "express";
import type { AddressInfo } from "node:net";

export interface RequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  cookie?: string;
  headers?: Record<string, string>;
}

export interface RequestResult<T = unknown> {
  status: number;
  headers: Headers;
  body: T;
  rawBody: string;
}

export async function withServer<T>(
  app: Express,
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

export async function request<T = unknown>(
  baseUrl: string,
  opts: RequestOptions,
): Promise<RequestResult<T>> {
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  let bodyInit: BodyInit | undefined;
  if (opts.body !== undefined && opts.body !== null) {
    if (typeof opts.body === "string" || opts.body instanceof Uint8Array) {
      bodyInit = opts.body as BodyInit;
    } else {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      bodyInit = JSON.stringify(opts.body);
    }
  }
  const res = await fetch(`${baseUrl}${opts.path}`, {
    method,
    headers,
    body: bodyInit,
  });
  const rawBody = await res.text();
  let parsed: unknown = rawBody;
  const ctype = res.headers.get("content-type") ?? "";
  if (ctype.includes("application/json") && rawBody.length > 0) {
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      /* leave as raw */
    }
  }
  return {
    status: res.status,
    headers: res.headers,
    body: parsed as T,
    rawBody,
  };
}
