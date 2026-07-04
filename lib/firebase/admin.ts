import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';
import { getAuth, Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

const adminApp = getAdminApp();

/**
 * Firebase Admin Auth instance for server-side token verification and custom claims.
 */
export const adminAuth: Auth = getAuth(adminApp);

/**
 * Firebase Admin Realtime Database instance for server-side data access.
 */
export const adminDatabase: Database = getDatabase(adminApp);

export default adminApp;
