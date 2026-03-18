const crypto = require('crypto');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isLoginEnabled() {
  const u = process.env.APP_LOGIN_USERNAME;
  const p = process.env.APP_LOGIN_PASSWORD;
  return !!(u && String(u).trim() && p && String(p).length);
}

function getSecret() {
  const explicit = process.env.APP_AUTH_SECRET;
  if (explicit && String(explicit).length >= 16) return explicit;
  const u = process.env.APP_LOGIN_USERNAME || '';
  const p = process.env.APP_LOGIN_PASSWORD || '';
  return crypto.createHash('sha256').update(`sc-auth|${u}|${p}|v1`).digest('hex');
}

function createToken() {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (sig.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.exp !== 'number' || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

function credentialsMatch(username, password) {
  const u = process.env.APP_LOGIN_USERNAME;
  const p = process.env.APP_LOGIN_PASSWORD;
  return username === u && password === p;
}

module.exports = {
  isLoginEnabled,
  createToken,
  verifyToken,
  credentialsMatch,
};
