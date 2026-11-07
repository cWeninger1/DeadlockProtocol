# Deadlock Protocol

An original tactical FPS for desktop browsers. Phase 1 opens Foundry, a local 3D movement range.

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

To try multiplayer movement, start both services with npm run dev, open two browser tabs, and choose **Join movement room** in each. Teal bodies show the other player. This initial room supports movement. Local prediction and snapshot interpolation smooth movement. Networked combat is the next development slice. See docs/NETWORKING.md for endpoint configuration.
