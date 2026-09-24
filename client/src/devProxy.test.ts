// @vitest-environment node
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../../server/src/app.js';
import { openDb } from '../../server/src/db.js';

// Integration guard: the dev proxy must forward requests in a way the API's
// same-origin (CSRF) and Host (DNS-rebinding) checks accept.
let api: Server;
let vite: ViteDevServer;
let viteOrigin: string;

beforeAll(async () => {
  api = createApp({ db: openDb(':memory:') }).listen(0, '127.0.0.1');
  await new Promise((resolve) => api.once('listening', resolve));
  process.env.API_PORT = String((api.address() as AddressInfo).port);

  vite = await createServer({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), server: { port: 0 }, logLevel: 'silent' });
  await vite.listen();
  viteOrigin = `http://localhost:${(vite.httpServer!.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await vite?.close();
  api?.close();
});

it('lets the app write through the dev proxy like a browser would', async () => {
  const res = await fetch(`${viteOrigin}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: viteOrigin, 'Sec-Fetch-Site': 'same-origin' },
    body: JSON.stringify({ title: 'through proxy' }),
  });
  expect(res.status).toBe(201);
});

it('still blocks a cross-site write that arrives through the proxy', async () => {
  const res = await fetch(`${viteOrigin}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
    body: JSON.stringify({ title: 'pwned' }),
  });
  expect(res.status).toBe(403);
});
