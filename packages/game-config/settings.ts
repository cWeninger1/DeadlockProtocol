export const range = {
  width: 32,
  length: 44,
  eyeHeight: 1.7,
  radius: 0.35,
  speed: 5,
  spawnZ: -16,
} as const;

export const barriers = [
  { x: 0, z: -9, width: 3, depth: 1, height: 0.24 },
  { x: 0, z: -7.5, width: 3, depth: 2, height: 0.85 },
  { x: -5, z: -4, width: 6, depth: 3, height: 3 },
  { x: 5, z: 3, width: 4, depth: 5, height: 4 },
  { x: -3, z: 12, width: 9, depth: 2, height: 2 },
] as const;

export const movement = {
  tick: 1 / 60,
  acceleration: 32,
  braking: 40,
  airAcceleration: 6,
  walkSpeed: 2.6,
  crouchSpeed: 1.6,
  crouchEyeHeight: 1.05,
  gravity: 19,
  jumpSpeed: 5.8,
  stepHeight: 0.3,
} as const;
