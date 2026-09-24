import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('app security baseline', () => {
  const app = createApp();

  it('does not leak the framework via X-Powered-By', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sends hardening headers (nosniff, frame protection, CSP)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('rejects oversized JSON bodies instead of buffering them', async () => {
    const huge = { title: 'x'.repeat(200_000) };
    const res = await request(app).post('/api/health').send(huge);
    expect(res.status).toBe(413);
  });

  it('returns JSON 404 for unknown API routes without stack traces', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
