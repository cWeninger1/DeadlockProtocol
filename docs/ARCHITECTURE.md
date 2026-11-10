# Architecture

Use npm workspaces. The React client owns menus and session lifecycle. Babylon owns the scene, input and frame loop. Dispose the scene and input handlers when returning to the menu. Keep gameplay configuration in packages/game-config and room identifiers in packages/protocol.
The Node Colyseus server owns network room membership. The initial range is local. Multiplayer clients send sequenced input to an authoritative fixed-step simulation. Keep transient gameplay off Firestore. Firebase Authentication and Firestore will support identity and durable player data in Phase 6.

The controller advances serializable player state at 60 Hz. Babylon samples input, queues jump presses until the next tick and renders the camera at the simulated foot position plus stance height. Both collision and scene geometry use the shared range obstacle definitions. Pointer release pauses simulation and clears pending input.

Shared weapon rules use simulation tick deadlines for firing and reloading. The local range casts a ray from the camera and scores the nearest pickable surface only when it belongs to the target. React receives ammunition and hit updates on weapon transitions. Multiplayer shots resolve on the server.

The serializable loadout stores ammunition and deadlines per weapon plus the active weapon ID and equip deadline. Shared loadout transitions enforce equip timing, firing mode and reload cancellation. The client clears held fire on blur and pointer release. Local training applies rifle recoil in its camera controller. Multiplayer keeps recoil on the server; clients send base aim and display the replicated recoil offset.

Health and hazard timing are pure shared rules. Hazard and target reset deadlines advance on the simulation clock, so pausing freezes them. Death blocks input and simulation before any further weapon actions. Local training respawn disposes the current Babylon session and creates a fresh session through the React lifecycle.

The initial network slice adds a separate movement room entry point. Shared protocol types and input validation live in packages/protocol. Colyseus owns player positions, simulation timing and room membership. The same Babylon range geometry renders both modes. React owns joining and leaving, reports errors and disposes the connection when navigating away.

Movement prediction uses the shared pure controller and a bounded list of unacknowledged commands. Server acknowledgements refer to consumed commands. Reconciliation replays pending commands, with visual correction kept separate from physics. A render-time interpolation step smooths the local camera in both modes, and remote rendering uses a 100 ms snapshot buffer.

The multiplayer combat room retains the internal foundry-movement identifier. Each slot receives a stable attacker/defender assignment with a team spawn. Commands contain bounded aim, trigger, reload, switch and life-generation intent; clients cannot supply damage, health or hit results. The server consumes at most one queued command per player per 60 Hz step, moves players first, then resolves combat. Server tick deadlines enforce fire cadence, equip/reload time and recoil recovery. Paused clients continue sending idle movement and no combat actions; opponents can still damage them.

Shared ray/body-box intersection uses authoritative standing/crouched player positions and freight geometry to choose the nearest unobstructed target. Hits apply weapon damage once. Dead players cannot move or fire. After 60 ticks the respawn request restores health/loadout at the team spawn, increments life generation and clears queued input while preserving scores and session identity. The client resets prediction on death/new life and clears held controls. Replicated combat snapshots drive HUD transitions, local weapon visuals and remote weapon/flash rendering. This initial implementation has no lag compensation or regional hitboxes; simultaneous shots resolve in member iteration order.

## Round lifecycle

RoundRoom extends the existing authoritative simulation with optional round state, keeping the free-respawn combat range separate. The pure advanceRound function in packages/game-config/round.ts owns tick deadlines, phase changes, elimination/timeout outcomes and team scoring. Shared defaults use the specified 20-second freeze and 115-second active duration. The room checks transitions before simulation (including timeout) and after combat (elimination), and applies spawn/loadout resets on entering freeze or returning to waiting.

Round input includes a nonnegative phase epoch. The server consumes and acknowledges blocked input without executing it, clears queues at each transition and rejects commands from previous epochs. Active and planted rounds allow movement and weapon actions. Manual respawn is rejected. Each new life increments the existing life ID; the client clears prediction and held controls at phase/life boundaries. Remote interpolation avoids blending positions from different lives.

Snapshots carry round state alongside player state. Babylon derives whole-second timer and alive-count updates for React's round HUD; it does not rerender React every frame. Losing either team aborts into waiting and resets team scores, without awarding a disconnect win. Individual statistics remain session-scoped. Reconnection remains a later slice.

## Objective simulation

packages/game-config/objective.ts contains serializable carrier, planted position, site and action state plus pure eligibility/progress rules. Freeze assigns the carrier on the server. The input protocol adds only an optional boolean interact intent; clients cannot submit planted positions, progress, timers or results. Only a consumed command with current round epoch/life can update held interaction. Held intent expires after the existing 30-tick input timeout.

The room resolves movement and combat before advancing objective actions, so death cancels a same-tick plant/defuse. Active/planted phases permit play. Successful planting transitions the pure round state to planted and replaces its deadline with the configured fuse. Planted rounds ignore elimination, and expiration is checked before actions, making exact-deadline ties deterministic. Round transitions clear queued/held interaction and new freezes recreate objective state.

Babylon draws shared site markings, procedural labels and the replicated device. React receives context prompts and quantized action progress from snapshots. Objective audio uses disposable Web Audio nodes and an AudioContext closed on navigation; no external media assets are used.

## Match identity and completion

RoundState stores scores by stable squad ID (Alpha/Bravo), separate from the current attacker/defender role in CombatState. Shared sideForSquad/squadForSide functions map roles using the swapped flag. Both elimination/timeout and objective awards credit the same squad after halftime. Each member retains its squad across resets, and snapshots expose that identity.

The pure round transition enters halftime after the first half, then freeze for the next numbered round. The room applies role changes and respawns once per epoch transition. A fresh freeze assigns the objective after roles have changed. Reaching the win threshold or regulation limit enters a terminal finished state after the last result display; a tied limit is a draw. The finished state is checked before missing-team handling, preserving completed results through disconnects. Colyseus locks finished rooms against new joins.

The client receives the match format and final winner in snapshots, stops prediction/input under the existing phase gates and exits pointer lock. React renders final score and personal statistics. Production starts only the normal rooms. Playwright uses tests/server.ts to add a shortened match room with server-owned rules; it is never imported by the production entry point.

## Spectator cameras

The pure spectatorPose helper selects a camera position, target and label only for dead players during active, planted or ending phases. Babylon applies the pose after its normal player-camera update. React owns the camera selection through a ref read by the existing scene; changing views does not recreate the engine or network connection. Labels update from snapshots, while the scene continues rendering remote interpolation.

No spectator messages or authoritative state changes are introduced. Existing dead-player server gates reject gameplay; the client sends idle controls. New-life handling resets prediction, eye height and camera rotation before restoring normal play. Navigation uses the same scene/engine, listener, network and audio disposal path. Finished-match UI takes priority over spectator controls.

## Economy and ownership

The shared economy module defines currency, reward progression, buy eligibility and atomic rifle purchase/refund transitions. Loadout.owned is the authority for weapon switching; the fixed ammunition records do not imply ownership. Local/free-respawn training defaults to both weapons, while round players start with pistol ownership.

Round members hold optional serializable economy state in server memory. Kill credit occurs only on the health-to-zero transition; objective credit occurs only on the unplanted-to-planted or not-defused-to-defused edge. Round credits occur only on entering ending. New freezes preserve surviving ownership while resetting health and ammunition; halftime/waiting reset economy and ownership. No currency is persisted or written to Firestore.

Buy requests include action, item, phase epoch and life generation. The server validates the schema, current phase/deadline, health, spawn distance, funds and ownership before replacing economy/loadout together. Snapshot HUD state drives a React native modal with keyboard/focus containment. B releases pointer lock; closing the menu offers the existing Resume flow. The menu closes when buying becomes unavailable. No new per-frame React updates or simulation scheduling are introduced.

## Armor state and damage

CombatState carries an integer armor amount initialized to zero. Shared applyArmorDamage computes health and armor together using trusted weapon damage/penetration; only the server applies it after an authoritative hit. The existing death transition awards kills once. Round resets retain armor only for surviving members outside halftime/waiting resets.

The economy module records an armor purchase receipt with phase epoch and previous armor. Purchase/refund replaces money, receipt and armor together after the existing buy gates. Full armor rejects duplicate purchases, and a refund requires unchanged full armor and a receipt for the current freeze. Round rewards expire the receipt. Rifle transactions preserve armor receipts. React receives armor through the snapshot-driven HUD and shows armor alongside the existing rifle card in the native buy dialog.
