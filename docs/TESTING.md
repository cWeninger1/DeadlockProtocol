# Verification

Run npm run format:check, npm run lint, npm run typecheck, npm test and npm run build from the root. For browser and server integration, free ports 5174 and 2568, run npx playwright install chromium and npm run test:e2e. Alternatively set PW_CHANNEL=chrome to use installed Chrome. Playwright starts and stops both services. See docs/ROADMAP.md for the last verified slice.
