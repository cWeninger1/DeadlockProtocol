# Development roadmap

Unchecked tasks are outstanding. Record evidence for each completed slice below.

Work in phases. Each phase must produce working, testable functionality.

## Phase 1 — Project foundation

- [x] Initialize monorepo.
- [x] Configure TypeScript.
- [x] Configure React and Vite.
- [x] Configure Babylon.js.
- [x] Configure Colyseus server.
- [x] Integrate Firebase.
- [x] Create development scripts.
- [x] Add automated tests.
- [x] Create a basic menu.
- [x] Create a local 3D test environment.

Deliverable: The project starts locally and a player can load a 3D scene.

## Phase 2 — FPS gameplay

- [x] Implement player movement.
- [x] Add first-person camera.
- [x] Add mouse aiming.
- [x] Implement collision.
- [x] Add jumping and crouching.
- [ ] Implement a pistol.
- [ ] Implement an assault rifle.
- [ ] Add hit detection against test targets.
- [ ] Add ammunition and reloading.
- [ ] Add health and death.

Deliverable: A functional single-player FPS sandbox.

## Phase 3 — Multiplayer

- [ ] Create multiplayer rooms.
- [ ] Add multiple connected players.
- [ ] Implement authoritative movement.
- [ ] Implement prediction and reconciliation.
- [ ] Synchronize weapon actions.
- [ ] Add server-authoritative damage.
- [ ] Add deaths and respawning.
- [ ] Add team assignment.

Deliverable: Two or more players can fight in the browser over a network.

## Phase 4 — Competitive match loop

- [ ] Implement round states.
- [ ] Add attacker and defender teams.
- [ ] Create objective sites.
- [ ] Implement planting and defusing.
- [ ] Add victory conditions.
- [ ] Add team scoring.
- [ ] Add round resets.
- [ ] Add spectator mode.

Deliverable: Players can finish an entire round-based match.

## Phase 5 — Economy and inventory

- [ ] Implement earning and spending money.
- [ ] Create buy menu.
- [ ] Add weapon purchasing.
- [ ] Add armor.
- [ ] Add weapon dropping and pickup.
- [ ] Add freeze-time purchases.
- [ ] Implement economy rewards.

Deliverable: Complete tactical round economy.

## Phase 6 — Accounts and persistence

- [ ] Firebase authentication.
- [ ] Player profiles.
- [ ] Match history.
- [ ] Statistics tracking.
- [ ] Secure data access.
- [ ] Private lobbies.
- [ ] Match invitations.

Deliverable: Players can create accounts and play persistent multiplayer matches.

## Phase 7 — Polish

- [ ] Replace placeholder models.
- [ ] Improve original map art.
- [ ] Add animations.
- [ ] Add footsteps.
- [ ] Improve gun audio.
- [ ] Improve muzzle flashes and impacts.
- [ ] Add settings.
- [ ] Refine all menus and HUD elements.

Deliverable: A visually cohesive, enjoyable game.

## Phase 8 — Production deployment

- [ ] Deploy React frontend to Firebase Hosting.
- [ ] Deploy authoritative game server independently.
- [ ] Secure WebSocket connections.
- [ ] Configure environment variables.
- [ ] Add logging and monitoring.
- [ ] Test multiplayer across different networks.
- [ ] Verify production Firebase security rules.
- [ ] Test deployment from a clean environment.

Deliverable: A browser-accessible multiplayer game.

## Execution log

- Established specification and phase gates in an empty repository.

- Phase 1 complete. Verified npm ci, formatting, ESLint, strict TypeScript, the client production build, five Vitest cases and three Playwright integration tests in desktop Chrome. Tests cover movement, collision, optional Firebase SDK initialization, menu-to-WebGL navigation, pointer lock, movement on screen, scene re-entry, server health and a real WebSocket room join/leave.
- Phase 2 starts with acceleration, friction, jumping and crouching. The basic controller already supports horizontal movement, collision and pointer-lock look.
- Verification limits: production Firebase access, cross-browser performance and networked combat are outstanding. The lazy-loaded Babylon range chunk exceeds the default 500 kB build warning threshold (about 120 kB gzipped). The runtime dependency audit passed. npm reports seven moderate development dependency findings in the ESLint/minimatch chain.

- Phase 2 movement slice complete. Foundry supports run, walk, crouch, jumping, air steering, sliding along solid cover and stepping onto a low curb. Seven unit tests and three Chrome integration tests passed across the suite. The next slice is a pistol, ammunition and a hittable range target. Combat and health remain outstanding.
