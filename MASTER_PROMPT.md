# MASTER DEVELOPMENT PROMPT — BROWSER-BASED TACTICAL FPS

## PROJECT OVERVIEW

You are the lead game developer, multiplayer networking engineer, backend architect, and technical project manager responsible for developing a complete browser-based tactical first-person shooter inspired by Counter-Strike: Global Offensive and Counter-Strike 2.

The project must be an original intellectual property. Do not copy Counter-Strike maps, weapon models, characters, sounds, logos, or other protected assets.

The objective is to create a polished, competitive, multiplayer FPS playable directly through modern desktop web browsers.

The final product should feel responsive, skill-based, tactical, and competitive.

**Development priorities:**
1. Precise and responsive FPS controls.
2. Accurate shooting and weapon handling.
3. Reliable multiplayer networking.
4. Competitive round-based gameplay.
5. Strong performance on ordinary gaming PCs.
6. Clean, maintainable architecture.
7. Extensibility for future features.
8. A functional deployed browser game.

Do not create a static demonstration or a collection of unfinished UI screens. Implement actual working gameplay systems.

---

# 1. REQUIRED TECHNOLOGY STACK

### Frontend
- React
- TypeScript
- Vite
- Babylon.js
- HTML/CSS for menus and HUD
- Zustand for lightweight application state where appropriate

### Multiplayer
- Node.js
- TypeScript
- Colyseus
- WebSockets
- Server-authoritative game simulation
- Client-side prediction
- Server reconciliation
- Entity interpolation
- Lag-compensated hit detection

### Backend
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Firebase Admin SDK
- Cloud Run or another suitable containerized server deployment

### Physics
- Babylon.js
- Havok physics where needed
- Custom character movement and collision handling when better suited to competitive FPS gameplay

### Quality Assurance
- Vitest
- Playwright
- TypeScript strict mode
- ESLint
- Automated game logic tests
- Multiplayer integration tests

Keep the architecture modular and separate rendering, networking, UI, game simulation, and persistent player data.

---

# 2. CORE GAME DESIGN

Create a competitive tactical FPS with two opposing teams:

**Attackers**
- Plant an explosive objective at designated sites.
- Eliminate defending players.
- Win when the planted explosive detonates or all defenders are eliminated before a plant.

**Defenders**
- Prevent the objective from being planted.
- Defuse the explosive once planted.
- Eliminate attackers.
- Win when the round timer expires without a plant, when the objective is defused, or when all attackers are eliminated before a plant.

The gameplay should emphasize positioning, aiming, recoil control, communication, teamwork, and economic decision-making.

The core competitive mode is 5v5, but development must initially support smaller matches for testing.

### Round system

Implement these states:
- Waiting for players
- Warmup
- Freeze time
- Round active
- Objective planted
- Round ending
- Halftime
- Match finished

Use configurable match rules.

Initial defaults:
- 5 players per team
- 12 rounds per half
- First team to 13 rounds wins, subject to tie rules
- 115-second round timer
- 20-second freeze time
- 40-second planted objective timer
- 5-second standard plant action
- 10-second standard defuse action
- 5-second defuse with a purchased defuse kit

All values must be configurable from shared gameplay settings.

Do not hardcode match rules throughout multiple systems.

---

# 3. FIRST-PERSON PLAYER CONTROLLER

Implement an FPS controller using Babylon.js.

### Movement

Supported controls:

| Key | Action |
|---|---|
| W | Forward |
| A | Left |
| S | Backward |
| D | Right |
| Mouse | Look / Aim |
| Left Mouse | Fire |
| Right Mouse | Secondary weapon action |
| Shift | Walk |
| Ctrl | Crouch |
| Space | Jump |
| R | Reload |
| E | Interact / Plant / Defuse |
| B | Buy Menu |
| 1 | Primary Weapon |
| 2 | Secondary Weapon |
| 3 | Knife |
| 4 | Utility |
| Tab | Scoreboard |
| Esc | Pause / Settings |

### Movement mechanics

Include:
- Smooth acceleration and deceleration.
- Ground friction.
- Air movement.
- Jump physics.
- Crouching.
- Walking.
- Running.
- Movement-dependent weapon accuracy.
- Collision detection.
- Step navigation for small obstacles.
- Fall damage where configured.
- Movement penalties when hit, if enabled.

Movement should feel tight and predictable.

Keep movement physics deterministic enough to support client prediction and server reconciliation.

Do not implement character movement purely as camera translation.

---

# 4. WEAPON SYSTEM

Build a modular, data-driven weapon architecture.

Each weapon should be defined through configuration rather than duplicated weapon logic.

### Weapon categories

**Pistols**
- Standard semi-automatic pistol
- High-damage revolver
- Fast-firing machine pistol

**SMGs**
- Low-cost automatic SMG
- Fast-fire SMG

**Rifles**
- Assault rifle
- High-accuracy assault rifle
- Burst-fire rifle

**Sniper rifles**
- Bolt-action sniper rifle
- Semi-automatic marksman rifle

**Heavy weapons**
- Shotgun
- Light machine gun

**Melee**
- Knife

For the MVP, fully implement a pistol, an assault rifle, a sniper rifle, and a knife before expanding the arsenal.

### Weapon properties

Each weapon must support:
- Base damage
- Fire rate
- Magazine capacity
- Reserve ammunition
- Reload time
- Equip time
- Movement speed modifier
- Armor penetration
- Effective range
- Damage falloff
- Recoil pattern
- First-shot accuracy
- Running inaccuracy
- Jumping inaccuracy
- Crouching accuracy modifier
- Weapon price
- Kill reward
- Firing sound
- Reload sound
- Muzzle flash
- Bullet tracers
- Impact effects

### Shooting mechanics

Implement hitscan shooting for standard firearms.

Shots must originate from validated player aim information.

The server is authoritative for:
- Shot validation
- Fire rate
- Ammunition consumption
- Hit detection
- Damage
- Kills
- Deaths

The client may immediately display predicted recoil, muzzle flashes, and firing effects.

### Recoil

Create predictable recoil patterns for automatic weapons, with controlled randomness where appropriate.

Recoil should have two effects:
1. Actual shot direction changes.
2. Visual camera recoil.

Recoil recovery should occur after firing stops.

Continuous automatic fire should require player skill to control.

### Damage model

Implement configurable body hitboxes:
- Head
- Torso
- Arms
- Legs

Headshots should deal increased damage.

Armor reduces damage according to configurable weapon penetration values.

Players begin each round with 100 HP.

---

# 5. ECONOMY AND BUY SYSTEM

Implement a competitive round economy.

Players earn currency through:
- Round victories
- Round losses
- Kills
- Objective planting
- Objective defusing
- Other configurable match rewards

### Buy menu

Create a polished purchase interface containing:
- Pistols
- SMGs
- Rifles
- Snipers
- Heavy weapons
- Armor
- Utility
- Defuse kits

The buy menu must display current money, item prices, owned equipment, and available inventory slots.

Purchases must be validated by the server.

### Economy rules

Implement:
- Starting currency
- Maximum currency
- Win rewards
- Loss bonus progression
- Weapon-specific kill rewards
- Refunds during permitted buy windows
- Team-dependent equipment availability
- Buy zone restrictions
- Buy timer

All economy values should be stored in centralized configuration.

---

# 6. OBJECTIVE SYSTEM

Create two bomb sites on each competitive map.

Label them Site A and Site B.

### Planting

Only attackers can plant.

Requirements:
- Player possesses the objective.
- Player is alive.
- Player is inside a valid site.
- Player holds the interaction key for the required duration.

Cancel planting if required conditions stop being satisfied.

When planted:
- Play a sound notification.
- Update every player's HUD.
- Begin the countdown timer.
- Notify the server game-state manager.

### Defusing

Only defenders can defuse.

Requirements:
- Defender is alive.
- Defender is inside the interaction radius.
- Defender maintains the defuse action.

Cancel the defuse if conditions are violated.

A purchased defuse kit reduces defuse duration.

The planted objective must have an authoritative server timer.

---

# 7. MULTIPLAYER ARCHITECTURE

Multiplayer must be designed correctly from the beginning.

Do not rely on Firestore for real-time player movement, combat, or bullet synchronization.

Use Colyseus rooms and authoritative server simulation.

### Server responsibilities
- Match creation
- Player joining and leaving
- Team assignment
- Movement validation
- Combat validation
- Damage calculation
- Economy
- Round state
- Objective state
- Scoring
- Match results

### Client responsibilities
- Input collection
- Local prediction
- Rendering
- Animation
- HUD
- Sound
- Input transmission
- Server state interpolation

### Network improvements

Implement:
- Fixed server simulation timestep
- Configurable snapshot rate
- Sequence numbers for input commands
- Client-side movement prediction
- Server reconciliation
- Remote player interpolation
- Lag compensation for shooting
- Visibility and distance-based replication optimization when necessary

Use 60 Hz simulation as an initial design target, subject to benchmarking. Allow snapshots to run at a separately configurable rate.

### Disconnects

Handle:
- Temporary disconnections
- Reconnection
- Match abandonment
- Idle players
- Server shutdown
- Player timeout

No player should gain an advantage simply by manipulating client-reported position, health, ammunition, or money.

---

# 8. MAP DESIGN

Create one original tactical map for the MVP.

Temporary name: **Foundry**

Theme: An abandoned industrial facility with concrete buildings, warehouses, machinery, and exterior passageways.

Art direction:
- Stylized realistic 3D graphics
- Readable environments
- Moderate texture resolution
- Strong player silhouette visibility
- Good frame rates
- Clean geometry

### Required map areas
- Attacker spawn
- Defender spawn
- A objective site
- B objective site
- Central contested area
- Multiple connector routes
- Elevated positions
- Cover
- Narrow passages
- Open shooting lanes

The map should provide multiple viable strategies rather than a single dominant route.

### Map workflow

Start with primitive geometry and functional collision.

Prioritize gameplay scale, sightlines, cover placement, and navigation.

Once the layout works, replace temporary geometry with optimized original models and textures.

### Optimization
- Mesh instancing
- Static geometry merging
- Frustum culling
- Texture compression
- Level-of-detail where useful
- Reasonable draw-call budgets
- Efficient collision meshes

Use glTF/GLB assets where appropriate.

---

# 9. CHARACTER MODELS AND ANIMATION

Create visually distinct attacker and defender characters.

Characters require:
- Idle
- Walking
- Running
- Crouching
- Jumping
- Firing
- Reloading
- Weapon switching
- Death

Use original or appropriately licensed assets.

Include:
- First-person viewmodels
- Third-person player models
- Weapon attachment points
- Team identification
- Equipment display

Animation should be synchronized appropriately across clients.

---

# 10. HUD AND USER INTERFACE

Build the frontend UI in React.

The game must include:

### Main menu
- Play
- Quick Match
- Server Browser
- Create Private Match
- Profile
- Inventory
- Settings

### In-game HUD
- Health
- Armor
- Ammunition
- Current money
- Current weapon
- Crosshair
- Round timer
- Team score
- Alive player count
- Kill feed
- Objective status

### Scoreboard
Show:
- Player username
- Kills
- Deaths
- Assists
- Score
- Ping
- Money where permitted
- Team

### End-of-match screen
Show:
- Winning team
- Final score
- Personal statistics
- Team statistics
- MVP awards
- Match XP

Support responsive UI layouts, prioritizing desktop.

---

# 11. PLAYER ACCOUNTS AND FIREBASE

Use Firebase Authentication for:
- Email/password registration
- Login
- Logout
- Password reset
- Persistent authentication

Structure Firestore collections for:
- Users
- Player profiles
- Player statistics
- Match history
- User settings
- Cosmetic inventory
- Progression
- Rankings

### Player profile

Store:
- Unique user ID
- Display name
- Account creation date
- Total matches
- Wins
- Losses
- Kills
- Deaths
- Assists
- Headshot percentage
- Win percentage
- Competitive rating

Use Firebase Admin SDK on the backend for trusted updates.

Clients must not be allowed to modify authoritative match statistics or rankings.

Implement secure Firestore rules and validate Firebase ID tokens before allowing authenticated match participation.

---

# 12. LOBBIES AND MATCHMAKING

Implement a lobby system.

### Private matches
Players can:
- Create a room
- Generate an invite code
- Join with a code
- Select teams if allowed
- Start a match with host permissions

### Public matchmaking
Support:
- Casual queue
- Competitive queue in a later phase
- Available server selection
- Regional selection if multiple server regions are deployed

For the MVP, prioritize reliable private matches and small casual matches before implementing advanced ranked matchmaking.

---

# 13. ANTI-CHEAT AND SECURITY

Implement practical server-side cheating prevention.

Validate:
- Player speed
- Acceleration
- Jump restrictions
- Fire rate
- Ammunition
- Reloads
- Inventory changes
- Purchases
- Damage
- Weapon ownership
- Round state
- Objective interactions

Never trust client-submitted kills or damage.

Implement rate limiting, request validation, and secure authentication.

Use lag compensation without accepting impossible historical hit claims.

Do not claim the game is cheat-proof. Build robust foundations and maintain server-side enforcement.

---

# 14. AUDIO AND VISUAL FEEDBACK

Add:
- Weapon firing audio
- Reload audio
- Footsteps
- Surface-dependent footsteps
- Bullet impacts
- Objective planting sounds
- Objective timer alerts
- Round victory sounds
- Damage indicators
- Death feedback
- Hit effects
- Weapon muzzle flashes

Include settings for:
- Master volume
- Effects volume
- Music volume
- Mouse sensitivity
- Invert mouse
- Graphics quality
- Resolution scaling
- Frame-rate limit

Use positional audio where it improves spatial awareness.

---

# 15. PERFORMANCE TARGETS

Optimize for desktop Chrome, Firefox, and Edge.

Initial targets:
- 60 FPS at 1080p on a reasonable gaming PC
- Consistent input responsiveness
- Stable multiplayer simulation
- Low unnecessary memory allocations
- Minimal garbage collection spikes during combat
- Efficient asset loading

Benchmark performance rather than assuming targets have been achieved.

Provide graphics presets:
- Low
- Medium
- High

Support the browser Pointer Lock API for mouse aiming.

Handle lost focus, Pointer Lock cancellation, and browser resizing gracefully.

---

# 16. PROJECT STRUCTURE

Use a monorepo containing:

```text
/
├── apps/
│   ├── client/
│   │   ├── src/
│   │   │   ├── game/
│   │   │   ├── rendering/
│   │   │   ├── input/
│   │   │   ├── networking/
│   │   │   ├── audio/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── styles/
│   │   └── public/
│   └── server/
│       └── src/
│           ├── rooms/
│           ├── simulation/
│           ├── combat/
│           ├── economy/
│           ├── objectives/
│           ├── matchmaking/
│           └── security/
├── packages/
│   ├── shared/
│   ├── game-config/
│   └── protocol/
├── firebase/
├── tests/
├── docs/
└── README.md
```

Shared packages should contain common types, protocol definitions, weapon configuration, and reusable gameplay constants.

Avoid unnecessary circular dependencies.

---

# 17. DEVELOPMENT ROADMAP

Work in phases. Each phase must produce working, testable functionality.

## Phase 1 — Project foundation

- Initialize monorepo.
- Configure TypeScript.
- Configure React and Vite.
- Configure Babylon.js.
- Configure Colyseus server.
- Integrate Firebase.
- Create development scripts.
- Add automated tests.
- Create a basic menu.
- Create a local 3D test environment.

Deliverable: The project starts locally and a player can load a 3D scene.

## Phase 2 — FPS gameplay

- Implement player movement.
- Add first-person camera.
- Add mouse aiming.
- Implement collision.
- Add jumping and crouching.
- Implement a pistol.
- Implement an assault rifle.
- Add hit detection against test targets.
- Add ammunition and reloading.
- Add health and death.

Deliverable: A functional single-player FPS sandbox.

## Phase 3 — Multiplayer

- Create multiplayer rooms.
- Add multiple connected players.
- Implement authoritative movement.
- Implement prediction and reconciliation.
- Synchronize weapon actions.
- Add server-authoritative damage.
- Add deaths and respawning.
- Add team assignment.

Deliverable: Two or more players can fight in the browser over a network.

## Phase 4 — Competitive match loop

- Implement round states.
- Add attacker and defender teams.
- Create objective sites.
- Implement planting and defusing.
- Add victory conditions.
- Add team scoring.
- Add round resets.
- Add spectator mode.

Deliverable: Players can finish an entire round-based match.

## Phase 5 — Economy and inventory

- Implement earning and spending money.
- Create buy menu.
- Add weapon purchasing.
- Add armor.
- Add weapon dropping and pickup.
- Add freeze-time purchases.
- Implement economy rewards.

Deliverable: Complete tactical round economy.

## Phase 6 — Accounts and persistence

- Firebase authentication.
- Player profiles.
- Match history.
- Statistics tracking.
- Secure data access.
- Private lobbies.
- Match invitations.

Deliverable: Players can create accounts and play persistent multiplayer matches.

## Phase 7 — Polish

- Replace placeholder models.
- Improve original map art.
- Add animations.
- Add footsteps.
- Improve gun audio.
- Improve muzzle flashes and impacts.
- Add settings.
- Refine all menus and HUD elements.

Deliverable: A visually cohesive, enjoyable game.

## Phase 8 — Production deployment

- Deploy React frontend to Firebase Hosting.
- Deploy authoritative game server independently.
- Secure WebSocket connections.
- Configure environment variables.
- Add logging and monitoring.
- Test multiplayer across different networks.
- Verify production Firebase security rules.
- Test deployment from a clean environment.

Deliverable: A browser-accessible multiplayer game.

---

# 18. DEVELOPMENT RULES FOR CODEX

Follow these requirements throughout development.

1. Write real production-oriented TypeScript, not pseudocode.
2. Do not introduce mock functionality without identifying it.
3. Do not leave nonfunctional buttons presented as completed features.
4. Prefer reusable systems over duplicated implementation.
5. Keep gameplay configuration data-driven.
6. Use server-side authority for multiplayer gameplay.
7. Document major architectural decisions.
8. Include automated tests for important game systems.
9. Verify existing functionality before changing it.
10. Fix compilation and TypeScript errors before proceeding.
11. Maintain a clear distinction between completed, partial, and planned features.
12. Commit work in logically organized Git commits.
13. Never commit Firebase credentials, private keys, or secrets.
14. Keep local setup simple and reproducible.
15. Do not mark a phase complete until its acceptance criteria are met.

### Project tracking

Maintain:

- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/GAME_DESIGN.md`
- `docs/NETWORKING.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT.md`

Update these documents as implementation progresses.

### Important implementation principle

Prioritize a playable vertical slice over attempting to implement every game feature simultaneously.

Build the core FPS controls and combat first, introduce multiplayer authority early, and then layer competitive systems on top.

Do not spend excessive development time on cosmetics, inventory menus, or advanced matchmaking before multiplayer gunplay works.

---

# 19. INITIAL EXECUTION INSTRUCTIONS

Begin by examining the existing GitHub repository.

If it is empty, initialize the project using the architecture above.

Then:

1. Create the project structure.
2. Install and configure required dependencies.
3. Initialize the React application.
4. Initialize Babylon.js with a playable 3D test scene.
5. Implement the basic FPS controller.
6. Create the initial Colyseus server.
7. Add a health-check endpoint.
8. Create shared game configuration packages.
9. Add local development scripts.
10. Create and update project documentation.
11. Test the complete local startup procedure.

At the end of the first development phase, provide:
- A summary of implemented systems.
- A list of modified files.
- Instructions to launch the client and server.
- Test results.
- Outstanding issues.
- The next recommended development task.

Begin implementation immediately. Make reasonable architectural decisions autonomously and document them. Only request clarification when a missing external credential or irreversible infrastructure decision makes proceeding impossible.
