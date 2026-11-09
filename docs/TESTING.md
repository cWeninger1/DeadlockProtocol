# Verification

Run npm run format:check, npm run lint, npm run typecheck, npm test and npm run build from the root. For browser and server integration, free ports 5174 and 2568, run npx playwright install chromium and npm run test:e2e. Alternatively set PW_CHANNEL=chrome to use installed Chrome. Playwright starts and stops both services. See docs/ROADMAP.md for the last verified slice.

Networking tests run two isolated browser contexts against the real local Colyseus server, observe remote movement and departure, and exercise forged input, message bursts, stale input expiry and failed joins. Integration files run with one worker so room membership assertions remain isolated.

The prediction tests replay delayed and varied snapshot delivery. A Chrome regression test delays real WebSocket messages by 100 ms each direction and samples the active Babylon camera over 60 rendered frames, checking for movement plateaus and abrupt position jumps.

Combat unit tests cover nearest hits, range, aim, crouching, cover occlusion and malformed intent. Real-server tests cover fire-rate limits, ammo/reload/switch transitions, elimination, dead-player lockout, same-session respawn and rejection of prior-life commands. A two-browser gameplay test fires the pistol to eliminate the other player, verifies the score, respawns and fires the rifle. These are local Chrome checks; cross-machine internet play and high-latency combat feel remain unverified.

Round unit tests cover exact deadlines, both elimination outcomes, timeout precedence, one-time scoring, disconnect recovery and epoch validation. Round integration tests exercise real-time default durations, frozen movement/ammo, stale-epoch rejection, no manual respawn, automatic health/loadout reset, score persistence and replacement players. A two-browser flow verifies HUD state changes, firing restrictions, an elimination and the next round. The long active-timeout path is verified in deterministic unit tests; the browser flow ends rounds by elimination.
