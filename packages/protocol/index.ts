import type { Intent, Player } from "@dp/game-config";
export const FOUNDATION_ROOM = "foundation";
export const MOVEMENT_ROOM = "foundry-movement";
export const network = {
  tickMs: 1000 / 60,
  snapshotEvery: 3,
  inputTimeoutTicks: 30,
  maxMessagesPerTick: 4,
} as const;
export const idleInput: Intent = {
  forward: 0,
  right: 0,
  yaw: 0,
  walk: false,
  crouch: false,
  jump: false,
};
export type InputMessage = Intent & { sequence: number };
export type PlayerSnapshot = {
  id: string;
  player: Player;
  yaw: number;
  sequence: number;
};
export type Snapshot = { tick: number; players: PlayerSnapshot[] };

export function isInput(value: unknown): value is InputMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).length === 7 &&
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
