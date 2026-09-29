import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import config from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

let firestoreInstance: Firestore;

try {
  // Use persistent cache with experimentalForceLongPolling for robust connectivity in iframes and proxies
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    },
    config.firestoreDatabaseId || "(default)"
  );
} catch {
  try {
    firestoreInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true
      },
      config.firestoreDatabaseId || "(default)"
    );
  } catch {
    firestoreInstance = getFirestore(app, config.firestoreDatabaseId || "(default)");
  }
}

export const db = firestoreInstance;

/**
 * Recursively strips undefined values, because Firestore throws on any undefined field.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized as T;
}
