import type {
  EconomyState,
  Squad,
  RoundState,
  Intent,
  Player,
  CombatState,
  WeaponId,
} from "@dp/game-config";
export const FOUNDATION_ROOM = "foundation";
export const ROUND_ROOM = "foundry-rounds";
export const MOVEMENT_ROOM = "foundry-movement";
export const network = {
  tickMs: 1000 / 60,
  snapshotEvery: 3,
  inputTimeoutTicks: 30,
  maxQueuedInputs: 30,
} as const;
export const idleInput: Intent = {
  forward: 0,
  right: 0,
  yaw: 0,
  walk: false,
  crouch: false,
  jump: false,
};
export type CombatInput = {
  pitch: number;
  pressed: boolean;
  held: boolean;
  reload: boolean;
  weapon: WeaponId | null;
  life: number;
};
export type InputMessage = Intent & {
  interact?: boolean;
  epoch?: number;
  sequence: number;
  combat?: CombatInput;
};
export type PlayerSnapshot = {
  economy?: EconomyState;
  squad?: Squad;
  id: string;
  player: Player;
  yaw: number;
  sequence: number;
  combat?: CombatState;
};
export type Snapshot = {
  tick: number;
  players: PlayerSnapshot[];
  round?: RoundState;
};

export function isInput(value: unknown): value is InputMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).every((key) =>
      [
        "forward",
        "right",
        "yaw",
        "walk",
        "crouch",
        "jump",
        "sequence",
        "combat",
        "epoch",
        "interact",
      ].includes(key),
    ) &&
    (v.interact === undefined || typeof v.interact === "boolean") &&
    (v.epoch === undefined ||
      (Number.isSafeInteger(v.epoch) && Number(v.epoch) >= 0)) &&
    (v.combat === undefined || isCombatInput(v.combat)) &&
    Number.isSafeInteger(v.sequence) &&
    Number(v.sequence) > 0 &&
    typeof v.forward === "number" &&
    [-1, 0, 1].includes(v.forward) &&
    typeof v.right === "number" &&
    [-1, 0, 1].includes(v.right) &&
    typeof v.yaw === "number" &&
    Number.isFinite(v.yaw) &&
    Math.abs(v.yaw) <= Math.PI &&
    typeof v.walk === "boolean" &&
    typeof v.crouch === "boolean" &&
    typeof v.jump === "boolean"
  );
}

function isCombatInput(value: unknown): value is CombatInput {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    Object.keys(c).length === 6 &&
    typeof c.pitch === "number" &&
    Number.isFinite(c.pitch) &&
    Math.abs(c.pitch) <= 1.48 &&
    typeof c.pressed === "boolean" &&
    typeof c.held === "boolean" &&
    typeof c.reload === "boolean" &&
    (c.weapon === null || c.weapon === "pistol" || c.weapon === "rifle") &&
    Number.isSafeInteger(c.life) &&
    Number(c.life) >= 0
  );
}

export type BuyRequest = {
  action: "buy" | "refund";
  item: "rifle";
  epoch: number;
  life: number;
};
export function isBuyRequest(value: unknown): value is BuyRequest {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).length === 4 &&
    (v.action === "buy" || v.action === "refund") &&
    v.item === "rifle" &&
    Number.isSafeInteger(v.epoch) &&
    Number(v.epoch) >= 0 &&
    Number.isSafeInteger(v.life) &&
    Number(v.life) >= 0
  );
}
