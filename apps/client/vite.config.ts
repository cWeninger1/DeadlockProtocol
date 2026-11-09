import { defineConfig } from "vite";

export default defineConfig({
  // Scan the lazy scene before the first join so new Babylon imports cannot
  // trigger a dependency-optimizer reload in the middle of a game session.
  optimizeDeps: {
    entries: ["index.html", "src/range.ts"],
    include: ["@babylonjs/core/Materials/Textures/dynamicTexture"],
  },
});
