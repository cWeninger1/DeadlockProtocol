# Architecture

Use npm workspaces. The React client owns menus and session lifecycle. Babylon owns the scene, input and frame loop. Dispose the scene and input handlers when returning to the menu. Keep gameplay configuration in packages/game-config and room identifiers in packages/protocol.
The Node Colyseus server owns network room membership. The initial range is local. Future multiplayer clients will send sequenced input to an authoritative fixed-step simulation. Keep transient gameplay off Firestore. Firebase Authentication and Firestore will support identity and durable player data in Phase 6.

The controller advances serializable player state at 60 Hz. Babylon samples input, queues jump presses until the next tick and renders the camera at the simulated foot position plus stance height. Both collision and scene geometry use the shared range obstacle definitions. Pointer release pauses simulation and clears pending input.

Shared weapon rules use simulation tick deadlines for firing and reloading. The local range casts a ray from the camera and scores the nearest pickable surface only when it belongs to the target. React receives ammunition and hit updates on weapon transitions. Phase 3 will resolve multiplayer shots on the server.

The serializable loadout stores ammunition and deadlines per weapon plus the active weapon ID and equip deadline. Shared loadout transitions enforce equip timing, firing mode and reload cancellation. The client clears held fire on blur and pointer release. Rifle recoil currently lives in the local camera controller and must move into shared aim simulation before authoritative multiplayer combat.

Health and hazard timing are pure shared rules. Hazard and target reset deadlines advance on the simulation clock, so pausing freezes them. Death blocks input and simulation before any further weapon actions. Respawn disposes the current Babylon session and creates a fresh session through the React lifecycle.

The initial network slice adds a separate movement room entry point. Shared protocol types and input validation live in packages/protocol. Colyseus owns player positions, simulation timing and room membership. The same Babylon range geometry renders both modes. React owns joining and leaving, reports errors and disposes the connection when navigating away.

Movement prediction uses the shared pure controller and a bounded list of unacknowledged commands. Server acknowledgements refer to consumed commands. Reconciliation replays pending commands, with visual correction kept separate from physics. A render-time interpolation step smooths the local camera in both modes, and remote rendering uses a 100 ms snapshot buffer.
