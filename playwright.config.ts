import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel: process.env.PW_CHANNEL || undefined,
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
  },
  webServer: [
    {
      command: "npm run dev -w @dp/client",
      url: "http://127.0.0.1:5173",
      timeout: 60000,
    },
    {
      command: "npm run start -w @dp/server",
      url: "http://127.0.0.1:2567/health",
      timeout: 60000,
    },
  ],
});
