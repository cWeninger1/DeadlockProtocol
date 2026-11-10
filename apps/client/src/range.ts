import { buyRestriction, type EconomyState } from "@dp/game-config";
import { spectatorPose, type SpectatorView } from "./spectator";
import { createObjectiveAudio } from "./objectiveAudio";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { MovementPrediction } from "./networking/prediction";
import {
  connectMovement,
  type MovementRoom,
  type NetworkStatus,
} from "./networking/movement";
import { ROUND_ROOM, idleInput, type Snapshot } from "@dp/protocol";
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
  objectiveSites,
  objectiveRules,
  siteAt,
  sideForSquad,
  roundLabels,
  type RoundState,
  combatRules,
  type CombatState,
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
  economy?: EconomyState & {
    armor: number;
    ownsRifle: boolean;
    restriction: string | null;
    epoch: number;
    life: number;
  };

  spectator: string | null;
  objective: string;
  objectiveProgress: number;
  round?: {
    label: string;
    number: number;
    seconds: number | null;
    result: string;
    alpha: number;
    bravo: number;
    alphaSide: string;
    bravoSide: string;
    format: string;
    finished: boolean;
    matchResult: string;
    aliveAttackers: number;
    aliveDefenders: number;
  };
  health: number;
  team?: string;
  squad?: string;
  kills: number;
  deaths: number;
  respawnReady: boolean;
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
  getSpectatorView: () => SpectatorView = () => "auto",
) {
  const audio = createObjectiveAudio();
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
  const spectatorTarget = new Vector3();
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
  if (room?.name.startsWith(ROUND_ROOM)) {
    for (const site of objectiveSites) {
      const paint = material(
        "site " + site.id,
        site.id === "A" ? "#e79a37" : "#45c9b6",
      );
      for (const side of [-1, 1]) {
        box(
          "site boundary",
          site.x + side * site.radius,
          0.02,
          site.z,
          0.08,
          0.04,
          site.radius * 2,
          paint,
        ).isPickable = false;
        box(
          "site boundary",
          site.x,
          0.02,
          site.z + side * site.radius,
          site.radius * 2,
          0.04,
          0.08,
          paint,
        ).isPickable = false;
      }
      const label = new DynamicTexture(
        "site label",
        { width: 512, height: 128 },
        scene,
        false,
      );
      label.drawText(
        "SITE " + site.id,
        null,
        90,
        "bold 80px Arial",
        "white",
        "#17221e",
        true,
      );
      const sign = material("site sign", "#ffffff");
      sign.diffuseTexture = label;
      const mesh = box(
        "Site " + site.id,
        site.x,
        2.6,
        site.z + site.radius,
        2,
        0.5,
        0.02,
        sign,
      );
      mesh.billboardMode = 7;
      mesh.isPickable = false;
    }
  }
  const device = box("objective device", 0, 0, 0, 0.35, 0.2, 0.5, ochre);
  device.isPickable = false;
  device.setEnabled(false);
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
  let economy: RangeHud["economy"];
  let combat: CombatState | undefined;
  let round: RoundState | undefined;
  let aliveAttackers = 0,
    aliveDefenders = 0;
  let squad: string | undefined;
  let serverTick = 0;
  let lastHud = "";
  let objectiveHint = "";
  let objectiveProgress = 0;
  const reportHud = () => {
    const hud: RangeHud = {
      economy,
      spectator:
        spectatorPose(round, vitals.health, getSpectatorView())?.label ?? null,
      objective: objectiveHint,
      objectiveProgress,
      round: round
        ? {
            label: roundLabels[round.phase],
            number: round.number,
            seconds:
              round.endsAt === null
                ? null
                : Math.max(
                    0,
                    Math.ceil((round.endsAt - serverTick) * movement.tick),
                  ),
            result: round.winner
              ? round.winner +
                " win - " +
                (round.reason === "timeout" ? "time expired" : round.reason)
              : "",
            alpha: round.score.Alpha,
            bravo: round.score.Bravo,
            alphaSide: sideForSquad("Alpha", round.swapped),
            bravoSide: sideForSquad("Bravo", round.swapped),
            format:
              "First to " +
              round.format.roundsToWin +
              " / " +
              round.format.roundsPerHalf +
              " rounds per half",
            finished: round.phase === "finished",
            matchResult:
              round.matchWinner === "draw"
                ? "Match drawn"
                : round.matchWinner
                  ? round.matchWinner + " wins the match"
                  : "",
            aliveAttackers,
            aliveDefenders,
          }
        : undefined,
      health: vitals.health,
      team: combat?.team,
      squad,
      kills: combat?.kills ?? 0,
      deaths: combat?.deaths ?? 0,
      respawnReady:
        !combat || serverTick - combat.diedAt >= combatRules.respawnTicks,
      targetHealth,
      inHazard,
      weaponName: weapons[loadout.active].name,
      equipping: (room ? serverTick : tick) < loadout.readyAt,
      magazine: loadout.inventory[loadout.active].magazine,
      reserve: loadout.inventory[loadout.active].reserve,
      reloading: loadout.inventory[loadout.active].reloadEnds !== null,
      hits,
    };
    const serialized = JSON.stringify(hud);
    if (serialized !== lastHud) {
      lastHud = serialized;
      onHud(hud);
    }
  };
  reportHud();
  let authoritative: Snapshot | undefined;
  let prediction = new MovementPrediction();
  const snapshotBuffer: { snapshot: Snapshot; time: number }[] = [];
  let previousPlayer = spawnPlayer();
  let eyeHeight: number = range.eyeHeight;
  let connected = true;
  const remoteMeshes = new Map<string, Mesh>();
  const remoteMaterial = material("defender", "#45c9b6");
  const attackerMaterial = material("attacker", "#dc8249");
  const remoteGuns = new Map<string, { gun: Mesh; flash: Mesh }>();
  const connection = room
    ? connectMovement(
        room,
        (snapshot) => {
          const phaseChanged = round?.epoch !== snapshot.round?.epoch;
          const oldPhase = round?.phase;
          round = snapshot.round;
          if (round?.phase === "planted" && oldPhase !== "planted")
            audio.cue("planted");
          if (
            round?.phase === "ending" &&
            oldPhase !== "ending" &&
            (round.reason === "defused" || round.reason === "detonated")
          )
            audio.cue(round.reason);
          if (
            round?.phase === "finished" &&
            document.pointerLockElement === canvas
          )
            document.exitPointerLock();
          const objective = round?.objective;
          device.setEnabled(!!objective?.position);
          if (objective?.position)
            device.position.set(
              objective.position.x,
              objective.position.y + 0.12,
              objective.position.z,
            );
          aliveAttackers = snapshot.players.filter(
            (p) => p.combat?.team === "Attackers" && p.combat.health > 0,
          ).length;
          aliveDefenders = snapshot.players.filter(
            (p) => p.combat?.team === "Defenders" && p.combat.health > 0,
          ).length;
          authoritative = snapshot;
          snapshotBuffer.push({ snapshot, time: performance.now() });
          if (snapshotBuffer.length > 20) snapshotBuffer.shift();
          const local = snapshot.players.find((p) => p.id === room?.sessionId);
          if (local) {
            squad = local.squad;
            economy =
              local.economy && local.combat && round
                ? {
                    ...local.economy,
                    armor: local.combat.armor,
                    ownsRifle: local.combat.loadout.owned.includes("rifle"),
                    restriction: buyRestriction(
                      round,
                      snapshot.tick,
                      local.combat.health,
                      local.combat.team,
                      local.player,
                    ),
                    epoch: round.epoch,
                    life: local.combat.life,
                  }
                : undefined;
            objectiveProgress = 0;
            objectiveHint = "";
            if (round && objective) {
              if (objective.action) {
                const action = objective.action;
                const duration =
                  action.kind === "plant"
                    ? objectiveRules.plantTicks
                    : objectiveRules.defuseTicks;
                objectiveProgress = Math.min(
                  100,
                  Math.floor(
                    (100 * (snapshot.tick - action.startedAt)) / duration,
                  ),
                );
                objectiveHint =
                  (action.kind === "plant"
                    ? "Planting Site "
                    : "Defusing Site ") + action.site;
              } else if (round.phase === "planted") {
                const near =
                  objective.position &&
                  Math.hypot(
                    local.player.x - objective.position.x,
                    local.player.y - objective.position.y,
                    local.player.z - objective.position.z,
                  ) <= objectiveRules.defuseRadius;
                objectiveHint =
                  local.combat?.team === "Defenders" && near
                    ? "Hold E to defuse (10 seconds)"
                    : "Objective planted at Site " + objective.site;
              } else if (round.phase === "active") {
                objectiveHint =
                  objective.carrier === local.id
                    ? siteAt(local.player)
                      ? "Hold E to plant (5 seconds)"
                      : "Carrying objective - reach Site A or B"
                    : "Defend Site A and Site B";
              }
            }
            if (local.combat) {
              const next = local.combat;
              const newLife = !combat || combat.life !== next.life;
              const died = vitals.health > 0 && next.health === 0;
              if (newLife || died || phaseChanged) {
                prediction = new MovementPrediction();
                clearInput();
              }
              if (newLife) {
                camera.rotation.set(0, local.yaw, 0);
                recoil = 0;
                eyeHeight = range.eyeHeight;
                lastShot = -100;
              }
              camera.rotation.x = Math.max(
                -1.48,
                Math.min(1.48, camera.rotation.x + recoil - next.recoil),
              );
              recoil = next.recoil;
              if (combat && next.shots > combat.shots) lastShot = tick;
              combat = next;
              serverTick = snapshot.tick;
              loadout = next.loadout;
              vitals = { ...vitals, health: next.health };
              hits = next.hits;
              slide.setEnabled(next.health > 0);
              if (died && document.pointerLockElement === canvas)
                document.exitPointerLock();
              reportHud();
            }
            prediction.reconcile(local, snapshot.tick);
          }
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
    plate.setEnabled(false);
    center.setEnabled(false);
  }
  const movementKeys = new Set([
    "KeyE",
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
      if (active()) audio.unlock();
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
      audio.unlock();
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
    if (
      (active() && document.hasFocus()) ||
      (connection && connected && prediction.initialized)
    ) {
      elapsed += Math.min(engine.getDeltaTime() / 1000, 0.1);
      while (elapsed >= movement.tick) {
        const canPlay =
          !round || round.phase === "active" || round.phase === "planted";
        const controlling = active() && document.hasFocus() && canPlay;
        const intent = controlling
          ? {
              forward: Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
              right: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
              yaw: camera.rotation.y,
              walk: keys.has("ShiftLeft") || keys.has("ShiftRight"),
              crouch: keys.has("ControlLeft") || keys.has("ControlRight"),
              jump: jumpPressed,
            }
          : { ...idleInput, yaw: camera.rotation.y };
        if (connection) {
          tick++;
          const command = connection.send(
            intent,
            {
              pitch: Math.max(
                -1.48,
                Math.min(1.48, camera.rotation.x + recoil),
              ),
              pressed: controlling && firePressed,
              held: controlling && fireHeld,
              reload: controlling && reloadPressed,
              weapon: controlling ? selected : null,
              life: combat?.life ?? 0,
            },
            round?.epoch,
            controlling && keys.has("KeyE"),
          );
          if (command && vitals.health > 0 && canPlay) prediction.step(command);
          firePressed = reloadPressed = false;
          selected = null;
          jumpPressed = false;
          elapsed -= movement.tick;
          continue;
        }
        previousPlayer = player;
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
      const renderTime = performance.now() - 100;
      while (snapshotBuffer.length > 2 && snapshotBuffer[1].time <= renderTime)
        snapshotBuffer.shift();
      const older = snapshotBuffer[0],
        newer = snapshotBuffer[1] || older;
      const fraction = Math.max(
        0,
        Math.min(1, (renderTime - older.time) / (newer.time - older.time || 1)),
      );
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
          const gun = box(
            "remote weapon",
            0.25,
            0.48,
            0.38,
            0.09,
            0.1,
            0.35,
            steel,
          );
          gun.parent = mesh;
          const muzzle = box(
            "remote muzzle",
            0,
            0,
            0.23,
            0.1,
            0.1,
            0.12,
            ochre,
          );
          muzzle.parent = gun;
          remoteGuns.set(entry.id, { gun, flash: muzzle });
          remoteMeshes.set(entry.id, mesh);
        }
        mesh.setEnabled(!entry.combat || entry.combat.health > 0);
        mesh.material =
          entry.combat?.team === "Attackers"
            ? attackerMaterial
            : remoteMaterial;
        const remoteGun = remoteGuns.get(entry.id)!;
        remoteGun.gun.scaling.z =
          entry.combat?.loadout.active === "rifle" ? 1.8 : 1;
        remoteGun.gun.rotation.x =
          entry.combat?.loadout.inventory[entry.combat.loadout.active]
            .reloadEnds != null
            ? 0.6
            : 0;
        remoteGun.flash.setEnabled(
          !!entry.combat && authoritative.tick - entry.combat.shotTick < 4,
        );
        const a =
          older.snapshot.players.find(
            (p) => p.id === entry.id && p.combat?.life === entry.combat?.life,
          ) || entry;
        const b =
          newer.snapshot.players.find(
            (p) => p.id === entry.id && p.combat?.life === entry.combat?.life,
          ) || entry;
        const height =
          (a.player.crouched ? 1.1 : 1.8) * (1 - fraction) +
          (b.player.crouched ? 1.1 : 1.8) * fraction;
        mesh.scaling.y = height / 1.8;
        mesh.position.set(
          a.player.x + (b.player.x - a.player.x) * fraction,
          a.player.y + (b.player.y - a.player.y) * fraction + height / 2,
          a.player.z + (b.player.z - a.player.z) * fraction,
        );
        const turn = Math.atan2(
          Math.sin(b.yaw - a.yaw),
          Math.cos(b.yaw - a.yaw),
        );
        mesh.rotation.y = a.yaw + turn * fraction;
      }
      for (const [id, mesh] of remoteMeshes) {
        if (!authoritative.players.some((p) => p.id === id)) {
          mesh.dispose();
          remoteMeshes.delete(id);
          remoteGuns.delete(id);
        }
      }
    }
    const alpha = Math.min(1, elapsed / movement.tick);
    const cameraPlayer = connection ? prediction.current : player;
    eyeHeight +=
      ((cameraPlayer.crouched ? movement.crouchEyeHeight : range.eyeHeight) -
        eyeHeight) *
      (1 - Math.exp((-25 * engine.getDeltaTime()) / 1000));
    if (connection && prediction.initialized) {
      const position = prediction.render(alpha, engine.getDeltaTime() / 1000);
      camera.position.set(position.x, position.y + eyeHeight, position.z);
    } else if (!connection) {
      camera.position.set(
        previousPlayer.x + (player.x - previousPlayer.x) * alpha,
        previousPlayer.y + (player.y - previousPlayer.y) * alpha + eyeHeight,
        previousPlayer.z + (player.z - previousPlayer.z) * alpha,
      );
    }
    const observer = spectatorPose(round, vitals.health, getSpectatorView());
    if (observer) {
      camera.position.set(
        observer.position.x,
        observer.position.y,
        observer.position.z,
      );
      spectatorTarget.set(
        observer.target.x,
        observer.target.y,
        observer.target.z,
      );
      camera.setTarget(spectatorTarget);
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
      (room ? serverTick : tick) < loadout.readyAt
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
    audio.dispose();
    connection?.dispose();
    events.abort();
    if (active()) document.exitPointerLock();
    scene.dispose();
    engine.dispose();
  };
}
