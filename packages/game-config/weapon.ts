export const rangePistol = {
  name: "F12 Pistol",
  damage: 25,
  penetration: 0.5,
  killReward: 300,
  automatic: false,
  equipTicks: 18,
  capacity: 12,
  reserve: 48,
  intervalTicks: 12,
  reloadTicks: 84,
  range: 55,
} as const;

type WeaponDefinition = {
  capacity: number;
  reserve: number;
  intervalTicks: number;
  reloadTicks: number;
};

export type WeaponState = {
  magazine: number;
  reserve: number;
  nextShot: number;
  reloadEnds: number | null;
};

export function equipWeapon(def: WeaponDefinition): WeaponState {
  return {
    magazine: def.capacity,
    reserve: def.reserve,
    nextShot: 0,
    reloadEnds: null,
  };
}

export function updateWeapon(
  def: WeaponDefinition,
  state: WeaponState,
  tick: number,
  fire: boolean,
  reload: boolean,
) {
  if (state.reloadEnds !== null && tick >= state.reloadEnds) {
    const rounds = Math.min(def.capacity - state.magazine, state.reserve);
    state = {
      ...state,
      magazine: state.magazine + rounds,
      reserve: state.reserve - rounds,
      reloadEnds: null,
    };
  }
  if (state.reloadEnds !== null) return state;
  if (reload && state.magazine < def.capacity && state.reserve > 0)
    return { ...state, reloadEnds: tick + def.reloadTicks };
  if (fire && state.magazine > 0 && tick >= state.nextShot)
    return {
      ...state,
      magazine: state.magazine - 1,
      nextShot: tick + def.intervalTicks,
    };
  return state;
}

export const rangeRifle = {
  name: "AR30 Rifle",
  damage: 34,
  penetration: 0.7,
  killReward: 300,
  automatic: true,
  capacity: 30,
  reserve: 90,
  intervalTicks: 6,
  reloadTicks: 132,
  equipTicks: 24,
  range: 70,
  recoil: [0.006, 0.008, 0.01, 0.012, 0.014],
  recoilRecovery: 0.002,
} as const;
export const weapons = { pistol: rangePistol, rifle: rangeRifle };
export type WeaponId = keyof typeof weapons;
export type Loadout = {
  owned: WeaponId[];
  active: WeaponId;
  readyAt: number;
  inventory: Record<WeaponId, WeaponState>;
};
export function createLoadout(
  owned: WeaponId[] = ["pistol", "rifle"],
): Loadout {
  return {
    owned: [...owned],
    active: "pistol",
    readyAt: 0,
    inventory: {
      pistol: equipWeapon(rangePistol),
      rifle: equipWeapon(rangeRifle),
    },
  };
}
export function switchWeapon(
  loadout: Loadout,
  id: WeaponId,
  tick: number,
): Loadout {
  if (!loadout.owned.includes(id) || id === loadout.active) return loadout;
  const current = loadout.inventory[loadout.active];
  return {
    ...loadout,
    active: id,
    readyAt: tick + weapons[id].equipTicks,
    inventory: {
      ...loadout.inventory,
      [loadout.active]: { ...current, reloadEnds: null },
    },
  };
}
export function advanceLoadout(
  loadout: Loadout,
  tick: number,
  pressed: boolean,
  held: boolean,
  reload: boolean,
): Loadout {
  if (tick < loadout.readyAt) return loadout;
  const def = weapons[loadout.active];
  const previous = loadout.inventory[loadout.active];
  const updated = updateWeapon(
    def,
    previous,
    tick,
    pressed || (def.automatic && held),
    reload,
  );
  if (updated === previous) return loadout;
  return {
    ...loadout,
    inventory: { ...loadout.inventory, [loadout.active]: updated },
  };
}
