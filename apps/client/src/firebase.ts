import { initializeApp } from "@firebase/app";
export function configureFirebase() {
  const config = {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  };
  return Object.values(config).every(Boolean)
    ? initializeApp(config)
    : undefined;
}
