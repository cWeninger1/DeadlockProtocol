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
- [x] Implement a pistol.
- [x] Implement an assault rifle.
- [x] Add hit detection against test targets.
- [x] Add ammunition and reloading.
- [x] Add health and death.

Deliverable: A functional single-player FPS sandbox.

## Phase 3 — Multiplayer

- [x] Create multiplayer rooms.
- [x] Add multiple connected players.
- [x] Implement authoritative movement.
- [x] Implement prediction and reconciliation.
- [x] Synchronize weapon actions.
- [x] Add server-authoritative damage.
- [x] Add deaths and respawning.
- [x] Add team assignment.

Deliverable: Two or more players can fight in the browser over a network.

## Phase 4 — Competitive match loop

- [x] Implement all round states, including halftime and match-finished.
- [x] Add attacker and defender teams.
- [x] Create objective sites.
- [x] Implement planting and standard defusing. Purchased defuse kits belong to the economy phase.
- [x] Add round victory conditions: elimination before planting, unplanted timeout, detonation and defuse.
- [x] Add team scoring for completed rounds.
- [x] Add round resets.
- [x] Add spectator mode for the two-player round test.

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

- Phase 2 pistol slice complete. Chrome verified a hit, a miss, semi-automatic trigger behavior and reserve transfer. Ten unit tests and four integration tests passed across the suite. Next up are the assault rifle and weapon switching, followed by player health and death.

- Phase 2 rifle slice complete. Added the AR30, automatic fire, independent ammunition, equip delays, reload cancellation on switch and recovering vertical recoil. Thirteen unit tests and five Chrome integration tests passed. Player health and death are the next Phase 2 slice. Weapon audio, movement-dependent spread and the full damage/armor model remain outstanding.

- Phase 2 sandbox complete. Added 100 HP player and target health, weapon damage against the practice plate, target reset, a marked hazard area, death input lockout and session respawn. Verified 16 unit tests, seven Chrome integration tests, formatting, lint, strict TypeScript and production build. Phase 3 begins with two connected players and authoritative movement. Advanced hitboxes, armor, weapon audio and movement accuracy remain planned work. Cross-browser and performance targets remain unverified.

- Phase 3 movement slice verified. Two browser sessions join Foundry, see remote movement and remove departing players. Colyseus advances shared movement at 60 Hz with 20 Hz snapshots, input validation, message limits and stale-input expiry. Verified 16 unit tests, all seven existing browser/integration flows, and three new networking tests including forged fields, burst input and failed joins. Formatting, lint, strict TypeScript and production build pass. Prediction, reconciliation and networked combat remain outstanding. Internet latency, automatic reconnection and cross-machine hosting remain unverified.

- Fixed reported camera choppiness. Replaced direct 20 Hz snapshot camera updates with local prediction, acknowledged-input replay and render interpolation. Added buffered remote interpolation and smooth crouch height. Verified 18 unit tests, the ten existing browser/integration tests, plus a new browser test with 100 ms latency in each WebSocket direction. The latency test samples 60 rendered camera positions and checks continuous progress and bounded frame displacement. Formatting, lint, strict TypeScript and build verified. Hardware performance and real internet conditions still require broader testing.

- Fixed jump stutter caused by dropped commands in frame/network bursts and server timer drift. Reproduced a six-command burst where the server acknowledged only four and dropped the jump, then verified all six are simulated. Removed the per-callback message cutoff in favor of the existing bounded queue and per-second limit. Added bounded fixed-step catch-up for delayed server callbacks. Repeated the directional-jump browser test with messages batched every 100 ms and checked camera vertical velocity.

- Jump-stutter verification passed after both fixes: 18 unit tests, 13 browser/integration tests, formatting, lint, strict TypeScript and production build. The directional jump test also passed three consecutive runs after correcting server timer drift. Existing bundle-size warning remains.

- Phase 3 combat slice complete. The two-player room assigns Attackers/Defenders and owns weapon switches, firing cadence, ammunition, reloading, recoil, cover-aware body hits, health, kills, deaths and a one-second respawn gate. Respawn preserves the room/session and score; life IDs reject delayed commands from a prior life. The client displays authoritative weapon state and team/score HUD, plus remote weapons and muzzle flashes.
- Verified 21 unit tests and all 15 Chrome browser/integration tests, including two real browser players shooting, dying and respawning; forged combat fields, burst fire limits, dead-player lockout, stale-life input, reloads and weapon switching; existing delayed/batched movement and jumping regressions. Formatting, lint, strict TypeScript and production build pass. Combat currently uses simple body boxes without armor, hit regions or lag compensation. Internet/cross-machine combat, high-latency weapon feel and production hosting remain unverified. The existing Babylon bundle-size warning remains.
- Next slice: Phase 4 round states and timed round resets. Competitive objectives, scoring rules and spectator mode remain outstanding; free respawning currently belongs to this combat test room.

- Phase 4 first slice: separate round-test room with two players, five-second warmup, 20-second freeze, 115-second active timer and five-second result display. Shared configurable rules control pure transitions. Elimination awards the surviving team; timeout awards defenders. Scores update once, players automatically respawn with fresh loadouts, and individual statistics persist between rounds. Manual respawn is disabled in this mode.
- Round boundaries clear queued actions, stop velocity and use a phase epoch to reject delayed inputs from earlier states. Prediction resets on phase transitions and life changes. Losing a team returns the room to waiting and clears team scores; replacement players restart warmup. Training modes remain available.
- Phase 4 remains incomplete: objective sites, planting/defusing, objective wins, halftime, match completion/tie rules and spectator mode are outstanding. The current round test repeats indefinitely on the existing training layout.

- Verified this slice with 26 unit tests and all 17 Chrome browser/integration tests. The real server and two-browser round tests both used the default warmup/freeze durations and completed elimination, score display and automatic reset. Existing movement/jump smoothness and training combat checks pass. Formatting, lint, strict TypeScript and production build pass; the existing Babylon bundle-size warning remains. Timeout precedence is verified with deterministic unit tests; a full 115-second browser timeout, cross-browser behavior and internet play remain unverified.
- Next Phase 4 slice: objective sites and server-authoritative planting/defusing, including cancellation and objective victory conditions.

- Phase 4 objective slice: marked Site A and Site B, server-assigned attacker carrier, hold-E planting (5 seconds), standard defusing (10 seconds), a 40-second planted clock, replicated progress/device and original synthesized result cues. Alive, grounded, stationary players must stay in the site/interaction radius; releasing E, moving, dying, leaving range or stale input cancels progress. Holding E suppresses gunfire.
- Planted rounds continue after either team is eliminated. Defuse wins for defenders; detonation wins for attackers. Expiry wins exact deadline ties. Objective state and carrier reset with each new round. Disconnects retain the existing abort-to-waiting policy. One attacker per test room means carrier drop/pickup is not yet needed; larger teams, purchased kits, full map balancing, halftime, match completion and spectator mode remain outstanding.

- Objective verification: 34 unit tests and all 19 Chrome browser/integration tests pass. The server test waits through the real 40-second fuse after attacker death; the two-browser flow verifies canceled/restarted planting and defusing, shared progress, defender score and next-round reset. Existing jump/movement regressions pass. Formatting, lint, strict TypeScript and production build pass. The initial browser run exposed a dependency-optimizer reload on first join; explicit Vite scene scanning fixed it, and the full suite passes with forced fresh optimization. The existing bundle-size warning remains. Audio quality, cross-browser behavior and internet objective play remain unverified.
- Next Phase 4 slice: halftime, team-side switching and full match completion/tie rules, followed by spectator mode.

- Phase 4 match progression slice: stable Alpha/Bravo squad scores, 12 rounds per half, first to 13 and a regulation 12-12 draw. A ten-second halftime swaps attacker/defender roles once, resets health/loadouts/spawns, preserves personal stats and assigns the objective to the new attacker at the next freeze. The HUD shows squad scores, roles and match format.
- Match-finished is terminal: combat, movement, objective actions and respawn stay blocked. The client releases the mouse and shows winner/draw, final score and personal kills/deaths/hits with Main menu navigation. Completed rooms stop accepting new players and preserve results if someone leaves. Mid-match disconnects retain the existing abort-to-waiting policy, resetting side assignment and team scores.
- Phase 4 remains open for spectator mode. Overtime, larger teams, reconnect/forfeit policy, account-backed match history, MVP/XP awards and full tactical map balancing remain later work.

- Match verification: 39 unit tests and all 21 Chrome browser/integration tests pass. Default-length 13-win and 24-round draw histories are covered by deterministic tests. Shortened server-owned match tests verify halftime roles/spawns/life reset, objective reassignment, score/stat preservation, blocked halftime/finished input, finished-room matchmaking exclusion, mouse release and both clients' result screens. Existing full-duration objectives and movement smoothness regressions pass. Formatting, lint, strict TypeScript and production build pass; the existing Babylon bundle warning remains. A complete regulation-length browser match, cross-browser behavior and internet play remain unverified.
- Next Phase 4 slice: spectator mode for eliminated players. Phase 4 remains open until that behavior is implemented and tested.

- Phase 4 spectator slice: eliminated round players enter a live overview with Auto, Foundry, Site A and Site B controls. Auto watches the planted device when present and otherwise shows Foundry. The bottom panel keeps the scene visible. Weapons and gameplay controls remain disabled while dead; new lives restore the player camera and Resume flow, and finished matches retain their results screen.
- These overview cameras serve the current one-player-per-team test mode. Team-restricted follow cameras, visibility filtering and delayed observers for larger competitive teams remain future work.

- Spectator verification: 41 unit tests and all 23 Chrome browser/integration tests pass. Browser checks exercise live objective and opponent updates, all fixed camera selections, disabled dead-player controls, automatic player-camera restoration, pointer-lock behavior and cleanup. Reviewed the overview screenshot and widened framing to include the near spawn. Formatting, lint, strict TypeScript and production build pass; the existing Babylon bundle-size warning remains. Cross-browser and internet spectator play remain unverified.
- Phase 4 is complete for the initial two-player test mode. Larger-team spectator restrictions and the broader competitive map/team work remain outstanding as noted above. Next slice: Phase 5 server-authoritative currency and buy flow.
