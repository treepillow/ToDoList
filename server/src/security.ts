import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

const hostname = (host: string) => host.replace(/:\d+$/, '').toLowerCase();

/**
 * DNS-rebinding defence: a malicious site can point its own domain at 127.0.0.1,
 * making its requests "same-origin". Only accept requests addressed to loopback names.
 */
export const requireLoopbackHost: RequestHandler = (req, res, next) => {
  if (LOOPBACK_HOSTS.has(hostname(req.headers.host ?? ''))) return next();
  res.status(403).json({ error: 'Forbidden host' });
};

/**
 * CSRF defence for state-changing requests. Browsers attach Sec-Fetch-Site and/or
 * Origin to these; anything not from this same origin is refused. Non-browser
 * clients (curl, tests) send neither and are allowed, as they carry no ambient
 * credentials an attacker could ride on.
 */
export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    return res.status(403).json({ error: 'Cross-site request blocked' });
  }

  const origin = req.headers.origin;
  if (origin) {
    let sameOrigin = false;
    try {
      sameOrigin = new URL(origin).host === req.headers.host;
    } catch {
      // "null" or malformed Origin — treat as foreign.
    }
    if (!sameOrigin) return res.status(403).json({ error: 'Cross-site request blocked' });
  }
  next();
};

/** Bodies must be JSON: this forces a CORS preflight for any cross-site attempt. */
export const requireJsonBody: RequestHandler = (req, res, next) => {
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (!hasBody || req.is('application/json')) return next();
  res.status(415).json({ error: 'Content-Type must be application/json' });
};

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

/** Caps writes per client; generous enough for rapid drag-reordering by one user. */
export const writeRateLimiter = ({ windowMs, limit }: RateLimitOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => SAFE_METHODS.has(req.method),
    message: { error: 'Too many requests, slow down' },
  });

/**
 * Security headers. The CSP allows only same-origin scripts/styles (no inline code),
 * plus data: images for the checkbox tick SVG.
 */
export const securityHeaders = () =>
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  });
