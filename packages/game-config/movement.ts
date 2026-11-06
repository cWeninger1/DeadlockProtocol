import { range, movement, barriers } from "./settings";

export function spawnPlayer() {
  return {
    x: 0,
    y: 0,
    z: range.spawnZ as number,
    vx: 0,
    vy: 0,
    vz: 0,
    grounded: true,
    crouched: false,
  };
}
type Player = ReturnType<typeof spawnPlayer>;
type Intent = {
  forward: number;
  right: number;
  yaw: number;
  walk: boolean;
  crouch: boolean;
  jump: boolean;
};

function floorAt(x: number, z: number) {
  let height = 0;
  for (const b of barriers) {
    if (
      Math.abs(x - b.x) < b.width / 2 + range.radius - 1e-9 &&
      Math.abs(z - b.z) < b.depth / 2 + range.radius - 1e-9
    )
      height = Math.max(height, b.height);
  }
  return height;
}

export function advancePlayer(p: Player, input: Intent): Player {
  const dt = movement.tick;
  const speed = input.crouch
    ? movement.crouchSpeed
    : input.walk
      ? movement.walkSpeed
      : range.speed;
  const magnitude = Math.hypot(input.forward, input.right);
  const scale = speed / Math.max(1, magnitude);
  const sin = Math.sin(input.yaw),
    cos = Math.cos(input.yaw);
  const dx = (sin * input.forward + cos * input.right) * scale - p.vx;
  const dz = (cos * input.forward - sin * input.right) * scale - p.vz;
  const jumping = p.grounded && input.jump;
  const acceleration =
    p.grounded && !jumping
      ? magnitude
        ? movement.acceleration
        : movement.braking
      : magnitude
        ? movement.airAcceleration
        : 0;
  const factor = Math.min(1, (acceleration * dt) / (Math.hypot(dx, dz) || 1));
  let vx = p.vx + dx * factor,
    vz = p.vz + dz * factor;
  const maxFloor = p.y + (p.grounded && !jumping ? movement.stepHeight : 0);
  let x = p.x + vx * dt,
    z = p.z + vz * dt;
  if (
    Math.abs(x) > range.width / 2 - range.radius ||
    floorAt(x, p.z) > maxFloor
  ) {
    x = p.x;
    vx = 0;
  }
  if (
    Math.abs(z) > range.length / 2 - range.radius ||
    floorAt(x, z) > maxFloor
  ) {
    z = p.z;
    vz = 0;
  }
  const floor = floorAt(x, z);
  const vy = (jumping ? movement.jumpSpeed : p.vy) - movement.gravity * dt;
  const y = Math.max(floor, p.y + vy * dt);
  const grounded = y === floor;
  return {
    x,
    y,
    z,
    vx,
    vz,
    vy: grounded ? 0 : vy,
    grounded,
    crouched: input.crouch,
  };
}
