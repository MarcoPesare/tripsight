import jwt from 'jsonwebtoken';

const devSecret = 'dev-secret-change-me';
const placeholderSecrets = new Set([devSecret, 'change-me-with-a-long-random-secret']);

export function assertAuthConfig() {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production' && (!secret || placeholderSecrets.has(secret) || secret.length < 32)) {
    throw new Error('JWT_SECRET mancante o debole: in produzione serve una stringa casuale di almeno 32 caratteri');
  }
}

function jwtSecret() {
  return process.env.JWT_SECRET || devSecret;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, pv: user.passwordVersion || 1 },
    jwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, jwtSecret());
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}
