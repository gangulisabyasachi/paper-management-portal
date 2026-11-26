import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'portal_session';
const EXPIRY_DAYS = 7;

function getEncodedKey() {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error('JWT_SECRET environment variable is missing. Portal authentication will fail.');
  }
  return new TextEncoder().encode(secretKey);
}

/**
 * Encrypt a payload into a signed JWT token.
 * @param {Object} payload - Data to encode ({ userId, role, email }).
 * @returns {Promise<string>} Signed JWT string.
 */
async function encrypt(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(getEncodedKey());
}

/**
 * Decrypt and verify a JWT token, returning its payload or null.
 * @param {string} token - The JWT string to verify.
 * @returns {Promise<Object|null>} Decoded payload or null if invalid/expired.
 */
export async function decryptPortalSession(token) {
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Create a portal session by signing a JWT containing user info and setting it
 * as an httpOnly cookie.
 * @param {string} userId  - The authenticated user's ID.
 * @param {string} role    - User role (admin | editor | reviewer | submitter).
 * @param {string} email   - User email address.
 */
export async function createPortalSession(userId, role, email) {
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const token = await encrypt({ userId, role, email, expiresAt: expiresAt.toISOString() });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'strict',
    path: '/',
  });
}

/**
 * Verify the current portal session by reading the cookie and decoding the JWT.
 * @returns {Promise<Object|null>} Session payload ({ userId, role, email }) or null.
 */
export async function verifyPortalSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie?.value) {
    return null;
  }

  const session = await decryptPortalSession(cookie.value);
  if (!session?.userId) {
    return null;
  }

  return session;
}

/**
 * Delete the portal session cookie, effectively logging the user out of the portal.
 */
export async function deletePortalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
