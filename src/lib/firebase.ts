import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function assertFirebaseConfig(): void {
  const required = [
    ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
  ] as const;
  const absent = required.filter(([, v]) => !v).map(([k]) => k);
  if (absent.length > 0) {
    throw new Error(
      `Missing Firebase env: ${absent.join(", ")}. Copy .env.example to .env.local and fill values from Firebase Console.`
    );
  }
}

assertFirebaseConfig();

export const firebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
