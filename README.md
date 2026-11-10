# Deadlock Protocol

An original tactical FPS for desktop browsers. Foundry includes a local training range and a two-player combat room.

## Run locally

Use Node 22.13.1 or a compatible newer LTS and npm. From the repository root run:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173, select **Enter range**, then **Resume** to capture the mouse. Move with WASD, hold Shift to walk or Ctrl to crouch, press Space to jump, look with the mouse, and press Escape to release the pointer and return to the menu. Left click fires the pistol at the orange plate ahead of spawn. Press **1** for the automatic AR30 rifle, **2** for the pistol and **R** to reload. The server health endpoint is http://127.0.0.1:2567/health. Ctrl+C stops both services.

For separate terminals use `npm run dev -w @dp/client` and `npm run dev -w @dp/server`. The local range works without Firebase credentials. To initialize your Firebase web app, copy `apps/client/.env.example` to `apps/client/.env.local`, fill in its four web configuration values and restart Vite.

See [testing](docs/TESTING.md), [roadmap](docs/ROADMAP.md) and [architecture](docs/ARCHITECTURE.md).

For the damage test, hold A from spawn until you reach the red striped floor on your left. The HUD shows falling health. The death screen provides Respawn, followed by Resume to capture the mouse again.

To try multiplayer combat, start both services with npm run dev, open two browser windows, and choose **Join multiplayer range** in each. Orange bodies are Attackers; teal bodies are Defenders. Use **Resume**, aim and fire. Both weapons, ammunition, damage, kills and deaths are synchronized by the server. After elimination, **Respawn** unlocks after one second, then **Resume** captures the mouse again. Local prediction and snapshot interpolation smooth movement. The striped hazard is only active in local training. See docs/NETWORKING.md for endpoint configuration.

For the Phase 4 round slice, choose **Join round test** in two browser windows. Both teams must be present. After a five-second warmup and 20-second freeze, eliminate the opponent; defenders also win if the 115-second timer expires. A five-second result screen leads into the next freeze with full health and ammunition. The HUD shows phase, timer, team score and alive counts. Dead players return automatically next round. Alpha and Bravo retain their scores across the halftime side switch after 12 rounds. First to 13 wins; 12-12 is a draw. A ten-second halftime resets players before the second half. The finished-match screen shows the result and personal stats; return to the menu to join another match.

In **Join round test**, attackers carry the objective. Site A is east of attacker spawn (orange markings); Site B is farther northwest (teal markings). Stand still in a site and hold **E** for five seconds to plant. Defenders stand within two metres of the device and hold **E** for ten seconds to defuse. Releasing E, moving or dying cancels the action. The planted countdown lasts 40 seconds and continues after elimination. Progress, site and result appear on both HUDs.

After elimination in **Join round test**, use **Auto**, **Foundry**, **Site A** or **Site B** in the spectator panel. Auto centers on the planted device when present. Watch the live round with the mouse released, then click **Resume** after the next round restores your player. The free-respawn multiplayer range keeps its existing death/respawn flow.
