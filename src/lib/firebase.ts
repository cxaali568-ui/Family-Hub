import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, Firestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Safely load optional fallback config if present in local workspace without breaking builds if absent
const fallbackModules = typeof (import.meta as any).glob === 'function'
  ? ((import.meta as any).glob('/*firebase-applet-config.json', { eager: true }) as Record<string, any>)
  : {};
const appletConfig: Record<string, any> = Object.values(fallbackModules)[0]?.default || Object.values(fallbackModules)[0] || {};

// Safely resolve config value: prioritize VITE_FIREBASE_* environment variables, falling back to local config
const resolveConfig = (envVal: string | undefined, defaultVal?: string): string => {
  return envVal && envVal !== '1' && envVal.trim() !== '' ? envVal : (defaultVal || '');
};

const firebaseConfig = {
  apiKey: resolveConfig(import.meta.env.VITE_FIREBASE_API_KEY, appletConfig.apiKey),
  authDomain: resolveConfig(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, appletConfig.authDomain),
  projectId: resolveConfig(import.meta.env.VITE_FIREBASE_PROJECT_ID, appletConfig.projectId),
  storageBucket: resolveConfig(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, appletConfig.storageBucket),
  messagingSenderId: resolveConfig(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appletConfig.messagingSenderId),
  appId: resolveConfig(import.meta.env.VITE_FIREBASE_APP_ID, appletConfig.appId),
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);

// Use standard Firestore with provisioned databaseId (from env or appletConfig) and auto-detect long polling
const rawDatabaseId = resolveConfig(
  import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  appletConfig.firestoreDatabaseId
).trim();

// In Google Cloud Firestore, the primary database is named '(default)' (with parentheses).
// In the Firebase JS SDK, connecting to the primary database is specified by passing undefined.
// Passing the unparenthesized string 'default' triggers: "Database 'default' not found".
const isDefaultDatabase =
  !rawDatabaseId ||
  rawDatabaseId === 'default' ||
  rawDatabaseId === '(default)' ||
  rawDatabaseId === '""' ||
  rawDatabaseId === "''";

const databaseId = isDefaultDatabase ? undefined : rawDatabaseId;

export const db: Firestore = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  databaseId
);

export const storage: FirebaseStorage = getStorage(app);

// Set local browser persistence
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not set Auth persistence:", err);
});

// Test connection helper
export async function testConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    // Permission or not-found error implies the server responded!
    return true;
  }
}

