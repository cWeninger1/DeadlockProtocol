# Networking

The local Colyseus server listens on loopback port 2567 (override with PORT). GET /health reports readiness. The foundation room supports transport verification.

The foundry-movement room accepts two players. The server runs the shared movement and collision simulation at 60 Hz and broadcasts snapshots every third tick. Each client sends sequenced input with bounded axes and normalized yaw. Position, health and other extra fields are rejected. Old sequences and excess messages in a tick are ignored. A 180 messages-per-second connection limit also applies. Input expires after half a second and the player brakes to a stop.

The browser renders its own position from server snapshots and smooths the remote body toward received positions. Prediction, reconciliation, buffered interpolation, player collisions and combat are outstanding Phase 3 work. The movement room exposes a connection status and a return-to-menu reconnect path. Automatic reconnection is outstanding. The local range retains the Phase 2 combat sandbox.

Run npm run dev, then open two browser tabs and select Join movement room in both. Two players share a room. Additional players create another room. VITE_GAME_SERVER_URL selects the server endpoint, defaulting to http://127.0.0.1:2567. Local tests use ports 5174 and 2568. Cross-machine deployment, Firebase authentication and secure WebSocket hosting require later setup.
