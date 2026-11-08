import {
  joinMovement,
  type MovementRoom,
  type NetworkStatus,
} from "./networking/movement";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { barriers } from "@dp/game-config";
import { configureFirebase } from "./firebase";
import type { RangeHud } from "./range";
import "./style.css";

configureFirebase();

function Range({
  leave,
  multiplayer,
}: {
  leave: () => void;
  multiplayer: boolean;
}) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    text: "Connecting",
    connected: false,
    players: 0,
  });
  const [life, setLife] = useState(0);
  const roomRef = useRef<MovementRoom | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<RangeHud>();
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const dead = hud?.health === 0;
  useEffect(() => {
    setReady(false);
    let cancelled = false;
    let dispose: (() => void) | undefined;
    let joined: MovementRoom | undefined;
    import("./range")
      .then(async ({ startRange }) => {
        if (cancelled) return;
        if (multiplayer) {
          joined = await joinMovement();
          roomRef.current = joined;
          if (cancelled) {
            await joined.leave();
            return;
          }
        }
        if (!cancelled && canvas.current)
          dispose = startRange(
            canvas.current,
            () => setReady(true),
            setHud,
            joined,
            setNetworkStatus,
          );
      })
      .catch(() => {
        if (joined && !dispose) void joined.leave().catch(() => {});
        if (!cancelled && multiplayer)
          setNetworkStatus({
            text: "Connection failed",
            connected: false,
            players: 0,
          });
        if (!cancelled)
          setError(
            multiplayer
              ? "Could not join Foundry. Check that the game server is running and return to the menu to retry."
              : "Could not open the range. Enable WebGL or try a desktop browser.",
          );
      });
    const changed = () =>
      setLocked(document.pointerLockElement === canvas.current);
    document.addEventListener("pointerlockchange", changed);
    return () => {
      cancelled = true;
      document.removeEventListener("pointerlockchange", changed);
      dispose?.();
      roomRef.current = undefined;
    };
  }, [life, multiplayer]);
  async function takeControl() {
    try {
      await canvas.current?.requestPointerLock();
    } catch {
      setError("Mouse capture failed. Click Resume to try again.");
    }
  }
  return (
    <main>
      {multiplayer && (
        <aside className="network-status" role="status">
          {networkStatus.text}
          <br />
          Multiplayer range
        </aside>
      )}
      <canvas ref={canvas} aria-label="Foundry 3D range" />
      {locked && !dead ? (
        <>
          <span className="reticle" aria-hidden="true">
            +
          </span>
          {hud && (
            <aside className="weapon-hud" aria-label="Range results">
              <strong
                className={hud.health < 100 ? "damaged" : ""}
                aria-label="Health"
              >
                HP {hud.health}
              </strong>
              <span>
                {multiplayer
                  ? hud.team
                  : hud.inHazard
                    ? "HAZARD - leave the striped area"
                    : "Damage test area: left of spawn"}
              </span>
              <small>{hud.weaponName}</small>
              <strong aria-label="Ammunition">
                {hud.magazine} / {hud.reserve}
              </strong>
              <span>
                {hud.equipping
                  ? "Equipping"
                  : hud.reloading
                    ? "Reloading"
                    : hud.magazine === 0
                      ? hud.reserve
                        ? "R to reload"
                        : "Out of ammunition"
                      : "Ready"}
              </span>
              <span>
                {multiplayer ? "Hits: " : "Target hits: "}
                {hud.hits}
              </span>
              <span aria-label="Target health">
                {multiplayer
                  ? "Kills " + hud.kills + " / Deaths " + hud.deaths
                  : hud.targetHealth === 0
                    ? "Target down - resetting"
                    : "Target HP " + hud.targetHealth}
              </span>
            </aside>
          )}
        </>
      ) : (
        <section className="pause">
          <small>
            {multiplayer
              ? "FOUNDRY / MULTIPLAYER RANGE"
              : "FOUNDRY / LOCAL RANGE"}
          </small>
          <h2>{dead ? "You died" : ready ? "Range ready" : "Opening range"}</h2>
          {multiplayer && (
            <p>
              Two-player combat range. Join from a second browser to fight.
              Orange: Attackers. Teal: Defenders.
            </p>
          )}
          <p>
            {error ||
              "WASD to move · Shift to walk / Ctrl to crouch / Space to jump / Mouse to aim / 1 rifle / 2 pistol / Left click to fire / R to reload · Esc to release"}
          </p>
          {dead && (
            <>
              <p>
                {multiplayer
                  ? "You were eliminated. Respawn to rejoin the fight."
                  : "The marked hazard area depleted your health."}
              </p>
              <button
                disabled={
                  multiplayer &&
                  (!hud?.respawnReady || !networkStatus.connected)
                }
                onClick={() => {
                  if (multiplayer) {
                    roomRef.current?.send("respawn");
                    return;
                  }
                  setHud(undefined);
                  setLife(life + 1);
                }}
              >
                Respawn
              </button>
            </>
          )}
          {ready && !dead && (!multiplayer || networkStatus.connected) && (
            <button onClick={takeControl}>Resume</button>
          )}{" "}
          <button className="secondary" onClick={leave}>
            Main menu
          </button>
        </section>
      )}
    </main>
  );
}

function App() {
  const [playing, setPlaying] = useState(false);
  const [multiplayer, setMultiplayer] = useState(false);
  if (playing)
    return <Range multiplayer={multiplayer} leave={() => setPlaying(false)} />;
  return (
    <main className="menu">
      <header>
        <b>◩ &nbsp; DEADLOCK PROTOCOL</b>
        <small>LOCAL TRAINING</small>
      </header>
      <section className="brief">
        <div>
          <small>TRAINING GROUND</small>
          <h1>
            Foundry<span>.</span>
          </h1>
          <p>Explore the industrial test range in first person.</p>
          <button
            onClick={() => {
              setMultiplayer(false);
              setPlaying(true);
            }}
          >
            Enter range &nbsp; →
          </button>
          <button
            className="secondary"
            onClick={() => {
              setMultiplayer(true);
              setPlaying(true);
            }}
          >
            Join multiplayer range
          </button>
        </div>
        <figure>
          <svg
            viewBox="-21 -26 42 52"
            role="img"
            aria-label="Foundry floor plan showing cover and training obstacles and the entry point"
          >
            <defs>
              <pattern
                id="grid"
                width="2"
                height="2"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M2 0H0V2"
                  fill="none"
                  stroke="#45534d"
                  strokeWidth=".1"
                />
              </pattern>
            </defs>
            <rect
              x="-16"
              y="-22"
              width="32"
              height="44"
              fill="url(#grid)"
              stroke="#839487"
              strokeWidth=".3"
            />
            {barriers.map((b) => (
              <rect
                key={b.z}
                x={b.x - b.width / 2}
                y={-b.z - b.depth / 2}
                width={b.width}
                height={b.depth}
                fill="#70857c"
              />
            ))}
            <path d="M0 15l-1 2.5 1-.5 1 .5Z" fill="#ffac57" />
          </svg>
          <figcaption>
            FOUNDRY <span>FLOOR PLAN</span>
          </figcaption>
        </figure>
      </section>
      <footer>WASD · MOVE &emsp; MOUSE · AIM &emsp; ESC · RELEASE</footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
