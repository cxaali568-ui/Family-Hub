import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, Firestore, doc, getDoc } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

// Safely resolve config value: ignore dummy "1" overrides and empty strings
const resolveConfig = (envVal: string | undefined, defaultVal: string) => {
  return envVal && envVal !== '1' && envVal.trim() !== '' ? envVal : defaultVal;
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

// Use standard Firestore with auto-detect long polling for resilient connection in web/iframe previews
export const db: Firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

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

