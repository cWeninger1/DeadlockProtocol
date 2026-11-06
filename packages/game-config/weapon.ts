export const rangePistol = {
  name: "F12 Pistol",
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
