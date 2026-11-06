# Development roadmap

Unchecked tasks are outstanding. Record evidence for each completed slice below.

Work in phases. Each phase must produce working, testable functionality.

## Phase 1 — Project foundation

- [ ] Initialize monorepo.
- [ ] Configure TypeScript.
- [ ] Configure React and Vite.
- [ ] Configure Babylon.js.
- [ ] Configure Colyseus server.
- [ ] Integrate Firebase.
- [ ] Create development scripts.
- [ ] Add automated tests.
- [ ] Create a basic menu.
- [ ] Create a local 3D test environment.

Deliverable: The project starts locally and a player can load a 3D scene.

## Phase 2 — FPS gameplay

- [ ] Implement player movement.
- [ ] Add first-person camera.
- [ ] Add mouse aiming.
- [ ] Implement collision.
- [ ] Add jumping and crouching.
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
