const COOKIE = 'gi_demo_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const ALLOW = new Set(['/login.html', '/login.css', '/login.js', '/icon.svg', '/auth', '/favicon.ico']);

function readCookie(header, name) {
  const key = `${name}=`;
  for (const item of (header || '').split(';')) {
    const segment = item.trim();
    if (segment.startsWith(key)) return segment.slice(key.length);
  }
  return '';
}

function decodeBase64url(value) {
  const base = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base.padEnd(Math.ceil(base.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function isAuthenticated(cookie, secret) {
  if (!cookie || cookie.length > 500 || !secret) return false;
  const parts = cookie.split('.');
  if (parts.length !== 4) return false;
  const [version, expiry, nonce, signature] = parts;
  const exp = Number(expiry);
  if (version !== 'v1' || !/^\d{13}$/.test(expiry) || !/^[A-Za-z0-9_-]{24}$/.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  if (!Number.isSafeInteger(exp) || Date.now() >= exp || exp - Date.now() > SESSION_MS) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, decodeBase64url(signature), new TextEncoder().encode(`${version}.${expiry}.${nonce}`));
  } catch { return false; }
}

export default async function guard(req, context) {
  const path = new URL(req.url).pathname;
  if (ALLOW.has(path)) return context.next();
  const secret = Netlify.env.get('GI_SESSION_SECRET');
  const email = Netlify.env.get('GI_DEMO_EMAIL');
  const password = Netlify.env.get('GI_DEMO_PASSWORD');
  if (!secret || !email || !password || secret.length < 32 || password.length < 14) {
    return new Response('Acceso pendiente de configurar.', { status: 503, headers: { 'cache-control': 'no-store' } });
  }
  if (await isAuthenticated(readCookie(req.headers.get('cookie'), COOKIE), secret)) return context.next();
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Acceso restringido.', { status: 401, headers: { 'cache-control': 'no-store' } });
  }
  return Response.redirect(new URL('/login.html', req.url), 302);
}

export const config = { path: '/*' };
export const __test = { isAuthenticated, readCookie };
