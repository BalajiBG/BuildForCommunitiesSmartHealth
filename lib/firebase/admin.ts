import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * Lazy-initialized Firebase Admin SDK.
 * Only initializes when first accessed at runtime (not during build).
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin SDK credentials not configured. Set FIREBASE_ADMIN_* env vars.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

/** Lazy getter for admin Auth */
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getAuth(getAdminApp()) as unknown as Record<string, unknown>)[prop as string];
  },
});

/** Lazy getter for admin Database */
export const adminDatabase: Database = new Proxy({} as Database, {
  get(_, prop) {
    return (getDatabase(getAdminApp()) as unknown as Record<string, unknown>)[prop as string];
  },
});

export default getAdminApp;
