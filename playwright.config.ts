import { defineConfig } from "@playwright/test";
export default defineConfig({
  workers: 1,
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: [
    {
      command: "npm run dev -w @dp/client -- --port 5174 --force",
      env: { VITE_GAME_SERVER_URL: "http://127.0.0.1:2568" },
      url: "http://127.0.0.1:5174",
      timeout: 60000,
    },
    {
      command: "npm run start -w @dp/server",
      env: { PORT: "2568" },
      url: "http://127.0.0.1:2568/health",
      timeout: 60000,
    },
  ],
});
