import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

const newApp = (options: Partial<Parameters<typeof createApp>[0]> = {}) =>
  createApp({ db: openDb(':memory:'), ...options });

describe('DNS rebinding protection (Host header allow-list)', () => {
  it('rejects requests addressed to a foreign host name', async () => {
    const res = await request(newApp()).get('/api/tasks').set('Host', 'evil.example:3001');
    expect(res.status).toBe(403);
  });

  it.each(['localhost:3001', '127.0.0.1:5173', '[::1]:3001'])('allows loopback host %s', async (host) => {
    const res = await request(newApp()).get('/api/tasks').set('Host', host);
    expect(res.status).toBe(200);
  });
});

describe('CSRF protection on state-changing requests', () => {
  const post = (app = newApp()) => request(app).post('/api/tasks').set('Host', 'localhost:5173');

  it('rejects a cross-origin form/fetch from another site', async () => {
    const res = await post().set('Origin', 'https://evil.example').send({ title: 'pwned' });
    expect(res.status).toBe(403);
  });

  it('rejects browsers that flag the request as cross-site', async () => {
    const res = await post().set('Sec-Fetch-Site', 'cross-site').send({ title: 'pwned' });
    expect(res.status).toBe(403);
  });

  it('allows same-origin requests from the app itself', async () => {
    const res = await post()
      .set('Origin', 'http://localhost:5173')
      .set('Sec-Fetch-Site', 'same-origin')
      .send({ title: 'legit' });
    expect(res.status).toBe(201);
  });

  it('requires a JSON content type (blocks simple cross-site form posts)', async () => {
    const res = await post().set('Content-Type', 'text/plain').send('{"title":"x"}');
    expect(res.status).toBe(415);
  });
});

describe('rate limiting', () => {
  it('returns 429 once the write budget is spent, without limiting reads', async () => {
    const app = newApp({ writeRateLimit: { windowMs: 60_000, limit: 2 } });
    await request(app).post('/api/tasks').send({ title: '1' });
    await request(app).post('/api/tasks').send({ title: '2' });

    const blocked = await request(app).post('/api/tasks').send({ title: '3' });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['ratelimit-policy']).toBeDefined();
    expect((await request(app).get('/api/tasks')).status).toBe(200);
  });
});

describe('API caching', () => {
  it('marks API responses as non-cacheable', async () => {
    const res = await request(newApp()).get('/api/tasks');
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('serving the built client', () => {
  const dir = mkdtempSync(join(tmpdir(), 'todolist-static-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Tasks</title>');
  writeFileSync(join(dir, 'assets', 'app.js'), 'console.log(1)');
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const app = newApp({ staticDir: dir });

  it('serves index.html with a strict Content-Security-Policy', async () => {
    const res = await request(app).get('/');
    const csp = res.headers['content-security-policy'];

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Tasks</title>');
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('falls back to index.html for client routes but not for unknown API paths', async () => {
    expect((await request(app).get('/some/page')).text).toContain('<title>Tasks</title>');
    expect((await request(app).get('/api/nope')).status).toBe(404);
  });

  it('serves hashed assets and blocks path traversal', async () => {
    expect((await request(app).get('/assets/app.js')).status).toBe(200);
    const traversal = await request(app).get('/assets/..%2f..%2f..%2fetc%2fpasswd');
    expect(traversal.text).not.toContain('root:');
  });
});
