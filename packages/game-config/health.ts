export const healthRules = { max: 100, targetRespawnTicks: 180 } as const;
export const hazard = {
  x: -6,
  z: -16,
  width: 4,
  depth: 4,
  damage: 25,
  intervalTicks: 30,
} as const;
export function damageHealth(health: number, damage: number): number {
  if (!Number.isFinite(damage) || damage < 0) return health;
  return Math.max(0, health - damage);
}
export type VitalState = { health: number; nextDamage: number };
export function createVitals(): VitalState {
  return { health: healthRules.max, nextDamage: 0 };
}
export function applyHazard(
  state: VitalState,
  position: { x: number; y: number; z: number },
  tick: number,
): VitalState {
  if (
    state.health === 0 ||
    tick < state.nextDamage ||
    position.y > 0.1 ||
    Math.abs(position.x - hazard.x) > hazard.width / 2 ||
    Math.abs(position.z - hazard.z) > hazard.depth / 2
  )
    return state;
  return {
    health: damageHealth(state.health, hazard.damage),
    nextDamage: tick + hazard.intervalTicks,
  };
}
