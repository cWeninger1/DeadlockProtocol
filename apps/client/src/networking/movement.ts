import { Client, type Room } from "@colyseus/sdk";
import type { Intent } from "@dp/game-config";
import { MOVEMENT_ROOM, type Snapshot } from "@dp/protocol";

export async function joinMovement() {
  const url = import.meta.env.VITE_GAME_SERVER_URL || "http://127.0.0.1:2567";
  return new Client(url).joinOrCreate(MOVEMENT_ROOM);
}
export type MovementRoom = Room;
export type NetworkStatus = {
  text: string;
  connected: boolean;
  players: number;
};

export function connectMovement(
  room: Room,
  onSnapshot: (s: Snapshot) => void,
  onStatus: (s: NetworkStatus) => void,
) {
  let sequence = 0,
    disposed = false;
  let received = Date.now();
  let count = -1;
  let connected = true;
  const disconnect = () => {
    if (!disposed && connected) {
      connected = false;
      onStatus({
        text: "Connection lost. Return to the menu to reconnect.",
        connected: false,
        players: 0,
      });
    }
  };
  room.onMessage<Snapshot>("snapshot", (snapshot) => {
    if (!connected || disposed) return;
    received = Date.now();
    onSnapshot(snapshot);
    if (count !== snapshot.players.length) {
      count = snapshot.players.length;
      onStatus({
        text: "Players " + count + "/2",
        connected: true,
        players: count,
      });
    }
  });
  room.onLeave(disconnect);
  room.onError(disconnect);
  const heartbeat = window.setInterval(() => {
    if (Date.now() - received > 5000) disconnect();
  }, 1000);
  return {
    send(input: Intent) {
      if (connected && !disposed)
        room.send("input", {
          ...input,
          yaw: Math.atan2(Math.sin(input.yaw), Math.cos(input.yaw)),
          sequence: ++sequence,
        });
    },
    dispose() {
      disposed = true;
      window.clearInterval(heartbeat);
      room.removeAllListeners();
      void room.leave().catch(() => {});
    },
  };
}
