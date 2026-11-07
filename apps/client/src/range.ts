import {
  connectMovement,
  type MovementRoom,
  type NetworkStatus,
} from "./networking/movement";
import { idleInput, type Snapshot } from "@dp/protocol";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import "@babylonjs/core/Culling/ray";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import {
  createVitals,
  applyHazard,
  healthRules,
  hazard,
  damageHealth,
  createLoadout,
  advanceLoadout,
  switchWeapon,
  weapons,
  rangeRifle,
  type WeaponId,
  range,
  barriers,
  movement,
  advancePlayer,
  spawnPlayer,
} from "@dp/game-config";

export type RangeHud = {
  health: number;
  targetHealth: number;
  inHazard: boolean;
  weaponName: string;
  equipping: boolean;
  magazine: number;
  reserve: number;
  reloading: boolean;
  hits: number;
};
export function startRange(
  canvas: HTMLCanvasElement,
  onReady: () => void,
  onHud: (hud: RangeHud) => void,
  room?: MovementRoom,
  onNetworkStatus: (status: NetworkStatus) => void = () => {},
) {
  const engine = new Engine(canvas, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.45, 0.55, 0.57, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.45, 0.55, 0.57);
  scene.fogDensity = 0.018;
  const camera = new FreeCamera(
    "eyes",
    new Vector3(0, range.eyeHeight, range.spawnZ),
    scene,
  );
  camera.minZ = 0.05;
  const light = new HemisphericLight(
    "daylight",
    new Vector3(-0.6, 1, -0.3),
    scene,
  );
  light.intensity = 1.3;
  const material = (name: string, hex: string) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(hex);
    m.specularColor = Color3.Black();
    return m;
  };
  const concrete = material("concrete", "#758384"),
    steel = material("steel", "#354849");
  const ochre = material("safety paint", "#e79a37"),
    brick = material("oxide", "#a36242");
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    m: StandardMaterial,
  ) {
    const mesh = CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(x, y, z);
    mesh.material = m;
    return mesh;
  }
  box("slab", 0, -0.2, 0, 32, 0.4, 44, concrete);
  for (const side of [-1, 1]) {
    box("side wall", side * 16.25, 2, 0, 0.5, 4, 45, steel);
    box("end wall", 0, 2, side * 22.25, 33, 4, 0.5, concrete);
    box("lane marking", side * 2, 0.008, 0, 0.09, 0.016, 40, ochre);
    for (let z = -20; z <= 20; z += 8) {
      box("column", side * 16.4, 4, z, 0.8, 8, 0.8, brick);
      box("gantry", 0, 7.9, z, 33, 0.35, 0.45, steel);
    }
  }
  for (const b of barriers) {
    box("freight", b.x, b.height / 2, b.z, b.width, b.height, b.depth, brick);
    for (const offset of [-0.35, 0.35])
      box(
        "freight band",
        b.x + b.width * offset,
        b.height / 2,
        b.z,
        0.14,
        b.height + 0.02,
        b.depth + 0.02,
        ochre,
      );
  }
  const danger = material("hazard red", "#c64128");
  box(
    "hazard floor",
    hazard.x,
    0.018,
    hazard.z,
    hazard.width,
    0.03,
    hazard.depth,
    danger,
  );
  for (
    let z = hazard.z - hazard.depth / 2;
    z <= hazard.z + hazard.depth / 2;
    z += 0.5
  )
    box("hazard stripe", hazard.x, 0.038, z, hazard.width, 0.01, 0.09, ochre);
  // Bolt the plate onto the front face of the far freight barrier.
  const plate = box("target plate", 0, 1.45, 10.91, 1.12, 1.05, 0.12, ochre);
  const center = box("aiming square", 0, 1.65, 10.84, 0.46, 0.46, 0.04, steel);
  const slide = box(
    "pistol slide",
    0.15,
    -0.115,
    0.51,
    0.075,
    0.075,
    0.28,
    steel,
  );
  slide.parent = camera;
  const grip = box("pistol grip", 0, -0.075, -0.07, 0.063, 0.14, 0.083, brick);
  grip.parent = slide;
  grip.rotation.x = -0.15;
  const sight = box("front sight", 0, 0.043, 0.11, 0.012, 0.016, 0.015, ochre);
  sight.parent = slide;
  const flash = box("muzzle flash", 0, 0, 0.175, 0.055, 0.055, 0.085, ochre);
  flash.parent = slide;
  flash.setEnabled(false);
  for (const part of [slide, grip, sight, flash]) part.isPickable = false;

  const barrel = box("rifle barrel", 0, 0, 0.27, 0.036, 0.036, 0.32, steel);
  barrel.parent = slide;
  const magazine = box(
    "rifle magazine",
    0,
    -0.12,
    0.045,
    0.06,
    0.2,
    0.08,
    brick,
  );
  magazine.parent = slide;
  barrel.isPickable = magazine.isPickable = false;
  barrel.setEnabled(false);
  magazine.setEnabled(false);
  let vitals = createVitals();
  let targetHealth: number = healthRules.max;
  let targetReturnsAt = 0;
  let inHazard = false;
  let loadout = createLoadout();
  let selected: WeaponId | null = null;
  let fireHeld = false;
  let recoil = 0,
    burst = 0;
  let wasEquipping = false;
  let tick = 0,
    hits = 0,
    lastHit = -100,
    lastShot = -100;
  let firePressed = false,
    reloadPressed = false;
  const reportHud = () =>
    onHud({
      health: vitals.health,
      targetHealth,
      inHazard,
      weaponName: weapons[loadout.active].name,
      equipping: tick < loadout.readyAt,
      magazine: loadout.inventory[loadout.active].magazine,
      reserve: loadout.inventory[loadout.active].reserve,
      reloading: loadout.inventory[loadout.active].reloadEnds !== null,
      hits,
    });
  reportHud();
  let authoritative: Snapshot | undefined;
  let connected = true;
  const remoteMeshes = new Map<string, Mesh>();
  const remoteMaterial = material("remote player", "#45c9b6");
  const connection = room
    ? connectMovement(
        room,
        (snapshot) => {
          authoritative = snapshot;
        },
        (status) => {
          connected = status.connected;
          onNetworkStatus(status);
          if (!connected && document.pointerLockElement === canvas)
            document.exitPointerLock();
        },
      )
    : undefined;
  if (room) {
    slide.setEnabled(false);
    plate.setEnabled(false);
    center.setEnabled(false);
  }
  const movementKeys = new Set([
    "Digit1",
    "Digit2",
    "KeyR",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "Space",
    "ControlLeft",
    "ControlRight",
    "ShiftLeft",
    "ShiftRight",
  ]);
  const keys = new Set<string>();
  let player = spawnPlayer();
  let elapsed = 0;
  let jumpPressed = false;
  function clearInput() {
    keys.clear();
    connection?.send(idleInput);
    fireHeld = false;
    selected = null;
    firePressed = reloadPressed = false;
    jumpPressed = false;
    elapsed = 0;
  }
  const events = new AbortController();
  const options = { signal: events.signal };
  const active = () =>
    document.pointerLockElement === canvas && vitals.health > 0 && connected;
  document.addEventListener(
    "mousedown",
    (e) => {
      if (active() && e.button === 0) firePressed = fireHeld = true;
    },
    options,
  );
  document.addEventListener(
    "mouseup",
    (e) => {
      if (e.button === 0) fireHeld = false;
    },
    options,
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (!active() || !movementKeys.has(e.code)) return;
      e.preventDefault();
      if (e.code === "Space" && !e.repeat) jumpPressed = true;
      if (e.code === "KeyR" && !e.repeat) reloadPressed = true;
      if (e.code === "Digit1") selected = "rifle";
      if (e.code === "Digit2") selected = "pistol";
      keys.add(e.code);
    },
    options,
  );
  window.addEventListener("keyup", (e) => keys.delete(e.code), options);
  window.addEventListener("blur", clearInput, options);
  document.addEventListener("pointerlockchange", clearInput, options);
  document.addEventListener(
    "mousemove",
    (e) => {
      if (!active()) return;
      camera.rotation.y += e.movementX * 0.002;
      camera.rotation.x = Math.max(
        -1.48,
        Math.min(1.48, camera.rotation.x + e.movementY * 0.002),
      );
    },
    options,
  );
  window.addEventListener("resize", () => engine.resize(), options);
  let rendered = false;
  engine.runRenderLoop(() => {
    if (active() && document.hasFocus()) {
      elapsed += Math.min(engine.getDeltaTime() / 1000, 0.1);
      while (elapsed >= movement.tick) {
        const intent = {
          forward: Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
          right: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
          yaw: camera.rotation.y,
          walk: keys.has("ShiftLeft") || keys.has("ShiftRight"),
          crouch: keys.has("ControlLeft") || keys.has("ControlRight"),
          jump: jumpPressed,
        };
        if (connection) {
          connection.send(intent);
          jumpPressed = false;
          elapsed -= movement.tick;
          continue;
        }
        player = advancePlayer(player, intent);
        camera.position.set(
          player.x,
          player.y +
            (player.crouched ? movement.crouchEyeHeight : range.eyeHeight),
          player.z,
        );
        tick++;
        const oldVitals = vitals;
        const oldHazard = inHazard;
        inHazard =
          Math.abs(player.x - hazard.x) <= hazard.width / 2 &&
          Math.abs(player.z - hazard.z) <= hazard.depth / 2 &&
          player.y <= 0.1;
        vitals = applyHazard(vitals, player, tick);
        if (vitals !== oldVitals || inHazard !== oldHazard) reportHud();
        if (vitals.health === 0) {
          clearInput();
          slide.setEnabled(false);
          document.exitPointerLock();
          break;
        }
        if (targetHealth === 0 && tick >= targetReturnsAt) {
          targetHealth = healthRules.max;
          plate.setEnabled(true);
          center.setEnabled(true);
          reportHud();
        }
        if (selected) {
          const next = switchWeapon(loadout, selected, tick);
          if (next !== loadout) {
            camera.rotation.x = Math.min(1.48, camera.rotation.x + recoil);
            recoil = burst = 0;
            lastShot = -100;
            loadout = next;
            reportHud();
          }
          selected = null;
        }
        const previous = loadout.inventory[loadout.active];
        loadout = advanceLoadout(
          loadout,
          tick,
          firePressed,
          fireHeld,
          reloadPressed,
        );
        const weapon = loadout.inventory[loadout.active];
        if (tick - lastShot > 12) {
          const recovery = Math.min(recoil, rangeRifle.recoilRecovery);
          recoil -= recovery;
          camera.rotation.x = Math.min(1.48, camera.rotation.x + recovery);
          if (recoil === 0) burst = 0;
        }
        if (weapon.nextShot !== previous.nextShot) {
          lastShot = tick;
          camera.getViewMatrix(true);
          const hit = scene.pickWithRay(
            camera.getForwardRay(weapons[loadout.active].range),
          );
          if (hit?.pickedMesh === plate || hit?.pickedMesh === center) {
            targetHealth = damageHealth(
              targetHealth,
              weapons[loadout.active].damage,
            );
            if (targetHealth === 0) {
              targetReturnsAt = tick + healthRules.targetRespawnTicks;
              plate.setEnabled(false);
              center.setEnabled(false);
            }
            hits++;
            lastHit = tick;
          }
          if (loadout.active === "rifle") {
            const kick = Math.min(
              rangeRifle.recoil[
                Math.min(burst++, rangeRifle.recoil.length - 1)
              ],
              camera.rotation.x + 1.48,
            );
            recoil += kick;
            camera.rotation.x -= kick;
          }
        }
        const equipping = tick < loadout.readyAt;
        if (weapon !== previous || equipping !== wasEquipping) reportHud();
        wasEquipping = equipping;
        firePressed = reloadPressed = false;
        jumpPressed = false;
        elapsed -= movement.tick;
      }
    }
    if (room && authoritative) {
      const local = authoritative.players.find((p) => p.id === room.sessionId);
      if (local) {
        const p = local.player;
        camera.position.set(
          p.x,
          p.y + (p.crouched ? movement.crouchEyeHeight : range.eyeHeight),
          p.z,
        );
      }
      for (const entry of authoritative.players) {
        if (entry.id === room.sessionId) continue;
        let mesh = remoteMeshes.get(entry.id);
        if (!mesh) {
          mesh = box(
            "remote player",
            entry.player.x,
            entry.player.y + 0.9,
            entry.player.z,
            0.6,
            1.8,
            0.6,
            remoteMaterial,
          );
          remoteMeshes.set(entry.id, mesh);
        }
        const height = entry.player.crouched ? 1.1 : 1.8;
        mesh.scaling.y = height / 1.8;
        mesh.position.copyFrom(
          Vector3.Lerp(
            mesh.position,
            new Vector3(
              entry.player.x,
              entry.player.y + height / 2,
              entry.player.z,
            ),
            Math.min(1, engine.getDeltaTime() / 50),
          ),
        );
        mesh.rotation.y = entry.yaw;
      }
      for (const [id, mesh] of remoteMeshes) {
        if (!authoritative.players.some((p) => p.id === id)) {
          mesh.dispose();
          remoteMeshes.delete(id);
        }
      }
    }
    flash.setEnabled(tick - lastShot < 3);
    slide.position.z = 0.51 - Math.max(0, 1 - (tick - lastShot) / 7) * 0.05;
    const rifle = loadout.active === "rifle";
    barrel.setEnabled(rifle);
    magazine.setEnabled(rifle);
    slide.scaling.z = rifle ? 1.3 : 1;
    flash.position.z = rifle ? 0.45 : 0.175;
    slide.rotation.x =
      loadout.inventory[loadout.active].reloadEnds !== null ||
      tick < loadout.readyAt
        ? 0.55
        : 0;
    center.material = tick - lastHit < 10 ? ochre : steel;
    scene.render();
    if (!rendered) {
      rendered = true;
      onReady();
    }
  });
  return () => {
    connection?.dispose();
    events.abort();
    if (active()) document.exitPointerLock();
    scene.dispose();
    engine.dispose();
  };
}
