export const armorRules = { capacity: 100 } as const;

// Penetration is the fraction of damage that bypasses armor. Each absorbed
// damage point consumes one armor point; a depleted vest cannot absorb more.
export function applyArmorDamage(
  health: number,
  armor: number,
  damage: number,
  penetration: number,
) {
  const healthDamage = Math.ceil(damage * penetration);
  const absorbed = Math.min(armor, damage - healthDamage);
  return {
    health: Math.max(0, health - (damage - absorbed)),
    armor: armor - absorbed,
  };
}
