import { afterEach, expect, it, vi } from "vitest";
import { deleteApp } from "@firebase/app";
import { configureFirebase } from "../apps/client/src/firebase";

afterEach(() => vi.unstubAllEnvs());

it("starts offline with incomplete Firebase configuration", () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "");
  expect(configureFirebase()).toBeUndefined();
});

it("initializes the Firebase SDK from local test configuration", async () => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "demo-local-test");
  vi.stubEnv("VITE_FIREBASE_APP_ID", "demo-app");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo-deadlock");
  vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "localhost");
  const app = configureFirebase();
  expect(app?.options.projectId).toBe("demo-deadlock");
  if (app) await deleteApp(app);
});
