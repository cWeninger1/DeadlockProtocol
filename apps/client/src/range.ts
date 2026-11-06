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
  equipWeapon,
  updateWeapon,
  rangePistol,
  type WeaponState,
  range,
  barriers,
  movement,
  advancePlayer,
  spawnPlayer,
} from "@dp/game-config";

export type RangeHud = {
  magazine: number;
  reserve: number;
  reloading: boolean;
  hits: number;
};
export function startRange(
  canvas: HTMLCanvasElement,
  onReady: () => void,
  onHud: (hud: RangeHud) => void,
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

  let weapon: WeaponState = equipWeapon(rangePistol);
  let tick = 0,
    hits = 0,
    lastHit = -100,
    lastShot = -100;
  let firePressed = false,
    reloadPressed = false;
  const reportHud = () =>
    onHud({
      magazine: weapon.magazine,
      reserve: weapon.reserve,
      reloading: weapon.reloadEnds !== null,
      hits,
    });
  reportHud();
  const movementKeys = new Set([
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
    firePressed = reloadPressed = false;
    jumpPressed = false;
    elapsed = 0;
  }
  const events = new AbortController();
  const options = { signal: events.signal };
  const active = () => document.pointerLockElement === canvas;
  document.addEventListener(
    "mousedown",
    (e) => {
      if (active() && e.button === 0) firePressed = true;
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
        player = advancePlayer(player, {
          forward: Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
          right: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
          yaw: camera.rotation.y,
          walk: keys.has("ShiftLeft") || keys.has("ShiftRight"),
          crouch: keys.has("ControlLeft") || keys.has("ControlRight"),
          jump: jumpPressed,
        });
        camera.position.set(
          player.x,
          player.y +
            (player.crouched ? movement.crouchEyeHeight : range.eyeHeight),
          player.z,
        );
        tick++;
        const previous = weapon;
        weapon = updateWeapon(
          rangePistol,
          weapon,
          tick,
          firePressed,
          reloadPressed,
        );
        if (weapon.nextShot !== previous.nextShot) {
          lastShot = tick;
          camera.getViewMatrix(true);
          const hit = scene.pickWithRay(
            camera.getForwardRay(rangePistol.range),
          );
          if (hit?.pickedMesh === plate || hit?.pickedMesh === center) {
            hits++;
            lastHit = tick;
          }
        }
        if (weapon !== previous) reportHud();
        firePressed = reloadPressed = false;
        jumpPressed = false;
        elapsed -= movement.tick;
      }
    }
    flash.setEnabled(tick - lastShot < 3);
    slide.position.z = 0.51 - Math.max(0, 1 - (tick - lastShot) / 7) * 0.05;
    slide.rotation.x = weapon.reloadEnds === null ? 0 : 0.55;
    center.material = tick - lastHit < 10 ? ochre : steel;
    scene.render();
    if (!rendered) {
      rendered = true;
      onReady();
    }
  });
  return () => {
    events.abort();
    if (active()) document.exitPointerLock();
    scene.dispose();
    engine.dispose();
  };
}
