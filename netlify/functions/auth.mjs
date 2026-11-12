import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'gi_demo_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = createHash('sha256').update(a, 'utf8').digest();
  const y = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(x, y);
}

function cookieFromHeader(header, name) {
  const prefix = `${name}=`;
  for (const field of (header || '').split(';')) {
    const item = field.trim();
    if (item.startsWith(prefix)) return item.slice(prefix.length);
  }
  return '';
}

function signSession(secret) {
  const exp = Date.now() + SESSION_MS;
  const nonce = randomBytes(18).toString('base64url');
  const content = `v1.${exp}.${nonce}`;
  const sig = createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${sig}`;
}

function validSession(token, secret) {
  if (!token || !secret || token.length > 500) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [version, expiry, nonce, sig] = parts;
  const exp = Number(expiry);
  if (version !== 'v1' || !/^\d{13}$/.test(expiry) || !Number.isSafeInteger(exp) || !/^[A-Za-z0-9_-]{24}$/.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
  if (Date.now() >= exp || exp - Date.now() > SESSION_MS) return false;
  const expected = createHmac('sha256', secret).update(`${version}.${expiry}.${nonce}`).digest('base64url');
  return secureCompare(sig, expected);
}

function reply(body, status = 200, cookie = '') {
  const headers = new Headers(jsonHeaders);
  if (cookie) headers.set('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

export default async function handler(req) {
  const email = process.env.GI_DEMO_EMAIL;
  const password = process.env.GI_DEMO_PASSWORD;
  const secret = process.env.GI_SESSION_SECRET;
  if (!email || !password || !secret || password.length < 14 || secret.length < 32) {
    return reply({ ok: false, configured: false, error: 'Configuracion privada pendiente en Netlify.' }, 503);
  }
  if (req.method === 'GET') {
    return reply({ ok: true, authenticated: validSession(cookieFromHeader(req.headers.get('cookie'), COOKIE), secret) });
  }
  if (req.method !== 'POST') return reply({ ok: false, error: 'Metodo no permitido.' }, 405);
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(req.url).origin) return reply({ ok: false, error: 'Origen no permitido.' }, 403);
  if (!(req.headers.get('content-type') || '').startsWith('application/json')) return reply({ ok: false, error: 'Formato incorrecto.' }, 415);
  const body = await req.text();
  if (body.length > 2048) return reply({ ok: false, error: 'Solicitud demasiado grande.' }, 413);
  let data;
  try { data = JSON.parse(body); } catch { return reply({ ok: false, error: 'Solicitud incorrecta.' }, 400); }
  if (data.action === 'logout') return reply({ ok: true, authenticated: false }, 200, `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  if (data.action !== 'login') return reply({ ok: false, error: 'Accion desconocida.' }, 400);
  const suppliedEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const suppliedPassword = typeof data.password === 'string' ? data.password : '';
  const validEmail = secureCompare(suppliedEmail, email.trim().toLowerCase());
  const validPassword = secureCompare(suppliedPassword, password);
  if (!validEmail || !validPassword) return reply({ ok: false, error: 'Correo o contrasena incorrectos.' }, 401);
  const session = signSession(secret);
  return reply({ ok: true, authenticated: true }, 200, `${COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(SESSION_MS / 1000)}`);
}

export const config = { path: '/auth' };
export const __test = { signSession, validSession, secureCompare, cookieFromHeader };
